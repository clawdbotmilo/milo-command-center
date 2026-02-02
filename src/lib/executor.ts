/**
 * Task Execution Engine
 * Manages the lifecycle of tasks: dispatch, monitor, complete
 */

import { supabase } from './supabase'
import { parsePlan } from './plan-parser'

const GATEWAY_URL = process.env.CLAWDBOT_GATEWAY_URL || 'http://localhost:3033'
const GATEWAY_TOKEN = process.env.CLAWDBOT_GATEWAY_TOKEN

interface TaskState {
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
  model: string
  attempts: number
  dependencies: string[]
  startedAt?: string
  completedAt?: string
  sessionKey?: string
  error?: string
}

interface OrchestrationState {
  project: string
  status: string
  tasks: Record<string, TaskState>
  queue: string[]
  locks: Record<string, string>
  created: string
  updated: string
}

export interface ExecutionResult {
  success: boolean
  message: string
  tasksStarted: string[]
  tasksCompleted: string[]
  tasksFailed: string[]
  projectCompleted: boolean
}

/**
 * Main execution tick - call this periodically to progress the project
 */
export async function executeProjectTick(projectName: string): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    success: true,
    message: '',
    tasksStarted: [],
    tasksCompleted: [],
    tasksFailed: [],
    projectCompleted: false,
  }

  try {
    // Get project
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('name', projectName)
      .single()

    if (error || !project) {
      result.success = false
      result.message = 'Project not found'
      return result
    }

    if (project.status !== 'EXECUTING') {
      result.message = `Project status is ${project.status}, not EXECUTING`
      return result
    }

    const orchState: OrchestrationState = project.orchestration_state
    if (!orchState?.tasks) {
      result.success = false
      result.message = 'No orchestration state'
      return result
    }

    // Step 1: Check running tasks for completion
    await checkRunningTasks(project, orchState, result)

    // Step 2: Update task statuses based on dependencies
    updateTaskStatuses(orchState)

    // Step 3: Dispatch new tasks (up to max concurrent)
    const MAX_CONCURRENT = 3
    const runningCount = Object.values(orchState.tasks).filter(t => t.status === 'RUNNING').length
    const slotsAvailable = MAX_CONCURRENT - runningCount

    if (slotsAvailable > 0) {
      await dispatchTasks(project, orchState, slotsAvailable, result)
    }

    // Step 4: Check if project is complete
    const allDone = Object.values(orchState.tasks).every(t => t.status === 'DONE')
    const anyFailed = Object.values(orchState.tasks).some(t => t.status === 'FAILED')

    if (allDone) {
      project.status = 'COMPLETED'
      orchState.status = 'COMPLETED'
      result.projectCompleted = true
      result.message = 'All tasks completed!'
    } else if (anyFailed && !Object.values(orchState.tasks).some(t => t.status === 'RUNNING' || t.status === 'QUEUED')) {
      result.message = 'Some tasks failed, no more tasks to run'
    }

    // Save updated state
    orchState.updated = new Date().toISOString()
    await supabase
      .from('projects')
      .update({
        status: project.status,
        orchestration_state: orchState,
      })
      .eq('name', projectName)

    if (!result.message) {
      const running = Object.values(orchState.tasks).filter(t => t.status === 'RUNNING').length
      const queued = Object.values(orchState.tasks).filter(t => t.status === 'QUEUED').length
      const done = Object.values(orchState.tasks).filter(t => t.status === 'DONE').length
      result.message = `Running: ${running}, Queued: ${queued}, Done: ${done}/${Object.keys(orchState.tasks).length}`
    }

  } catch (err) {
    result.success = false
    result.message = err instanceof Error ? err.message : 'Unknown error'
  }

  return result
}

/**
 * Check running tasks for completion by querying session status
 */
async function checkRunningTasks(
  project: any,
  orchState: OrchestrationState,
  result: ExecutionResult
) {
  const runningTasks = Object.entries(orchState.tasks)
    .filter(([_, t]) => t.status === 'RUNNING' && t.sessionKey)

  for (const [taskId, taskState] of runningTasks) {
    try {
      // Query session status from gateway
      if (GATEWAY_TOKEN) {
        const sessionRes = await fetch(`${GATEWAY_URL}/api/sessions/${taskState.sessionKey}`, {
          headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
        })

        if (sessionRes.ok) {
          const session = await sessionRes.json()
          
          if (session.status === 'completed') {
            taskState.status = 'DONE'
            taskState.completedAt = new Date().toISOString()
            result.tasksCompleted.push(taskId)
          } else if (session.status === 'failed' || session.status === 'error') {
            taskState.status = 'FAILED'
            taskState.completedAt = new Date().toISOString()
            taskState.error = session.error || 'Session failed'
            result.tasksFailed.push(taskId)
          }
          // If still running, leave as-is
        }
      } else {
        // No gateway - check if task has been running too long (timeout)
        const startedAt = new Date(taskState.startedAt || Date.now())
        const elapsed = Date.now() - startedAt.getTime()
        const TIMEOUT = 10 * 60 * 1000 // 10 minutes

        if (elapsed > TIMEOUT) {
          taskState.status = 'FAILED'
          taskState.completedAt = new Date().toISOString()
          taskState.error = 'Timeout - no gateway connection'
          result.tasksFailed.push(taskId)
        }
      }
    } catch (err) {
      console.error(`Error checking task ${taskId}:`, err)
    }
  }
}

/**
 * Update task statuses based on dependencies
 */
function updateTaskStatuses(orchState: OrchestrationState) {
  const tasks = orchState.tasks

  for (const [taskId, taskState] of Object.entries(tasks)) {
    if (taskState.status !== 'PENDING') continue

    const deps = taskState.dependencies || []
    const allDepsDone = deps.every(depId => tasks[depId]?.status === 'DONE')
    const anyDepFailed = deps.some(depId => tasks[depId]?.status === 'FAILED')

    if (anyDepFailed) {
      // Can't run if dependency failed
      taskState.status = 'FAILED'
      taskState.error = 'Dependency failed'
    } else if (allDepsDone) {
      // Ready to queue
      taskState.status = 'QUEUED'
    }
  }
}

/**
 * Dispatch tasks to Claude Code sessions
 */
async function dispatchTasks(
  project: any,
  orchState: OrchestrationState,
  maxToDispatch: number,
  result: ExecutionResult
) {
  const { plan } = parsePlan(project.plan_content || '')
  if (!plan?.tasks) return

  const taskDetails = new Map(plan.tasks.map(t => [t.id, t]))
  const queuedTasks = Object.entries(orchState.tasks)
    .filter(([_, t]) => t.status === 'QUEUED')
    .slice(0, maxToDispatch)

  for (const [taskId, taskState] of queuedTasks) {
    const details = taskDetails.get(taskId)
    if (!details) continue

    try {
      // Build task prompt
      const taskPrompt = buildTaskPrompt(project.name, taskId, details)

      // Mark as running
      taskState.status = 'RUNNING'
      taskState.startedAt = new Date().toISOString()
      taskState.attempts = (taskState.attempts || 0) + 1

      if (GATEWAY_TOKEN) {
        // Spawn session via gateway
        const spawnRes = await fetch(`${GATEWAY_URL}/api/sessions/spawn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          },
          body: JSON.stringify({
            task: taskPrompt,
            label: `${project.name}-${taskId}`,
            model: details.model === 'opus' ? 'opus' : 'sonnet',
            runTimeoutSeconds: 600,
          }),
        })

        if (spawnRes.ok) {
          const spawnData = await spawnRes.json()
          taskState.sessionKey = spawnData.sessionKey
          result.tasksStarted.push(taskId)
        } else {
          taskState.status = 'QUEUED' // Revert
          delete taskState.startedAt
        }
      } else {
        // No gateway - mark as started for manual execution
        result.tasksStarted.push(taskId)
      }
    } catch (err) {
      console.error(`Error dispatching task ${taskId}:`, err)
      taskState.status = 'QUEUED' // Revert
      delete taskState.startedAt
    }
  }
}

/**
 * Build the prompt for a task
 */
function buildTaskPrompt(projectName: string, taskId: string, details: any): string {
  return `You are working on project "${projectName}".

## Task: ${details.name} (${taskId})

**Description:** ${details.description || 'Complete this task'}

**Files to create/modify:**
${details.files?.map((f: string) => `- ${f}`).join('\n') || '- (determine based on task)'}

**Completion Criteria:**
${details.completionCriteria?.map((c: string) => `- ${c}`).join('\n') || '- Task is fully implemented and working'}

## Instructions
1. Implement this task completely
2. Create/modify the necessary files
3. Test that everything works
4. Report what you accomplished

Make reasonable decisions and proceed with implementation. Do not ask clarifying questions.`
}

/**
 * Mark a task as complete (called via webhook or manual)
 */
export async function markTaskComplete(
  projectName: string,
  taskId: string,
  success: boolean,
  error?: string
): Promise<boolean> {
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('orchestration_state')
      .eq('name', projectName)
      .single()

    if (!project?.orchestration_state?.tasks?.[taskId]) {
      return false
    }

    const orchState = project.orchestration_state
    orchState.tasks[taskId].status = success ? 'DONE' : 'FAILED'
    orchState.tasks[taskId].completedAt = new Date().toISOString()
    if (error) orchState.tasks[taskId].error = error
    orchState.updated = new Date().toISOString()

    await supabase
      .from('projects')
      .update({ orchestration_state: orchState })
      .eq('name', projectName)

    return true
  } catch (err) {
    console.error('Error marking task complete:', err)
    return false
  }
}
