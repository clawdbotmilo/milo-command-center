import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parsePlan } from '@/lib/plan-parser'

/**
 * POST /api/orchestration/dispatch
 * Dispatches the next available task to a Claude Code session
 */
export async function POST(request: NextRequest) {
  try {
    const { project } = await request.json()
    
    if (!project) {
      return NextResponse.json({ error: 'Missing project name' }, { status: 400 })
    }

    // Get project with orchestration state
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', project)
      .single()

    if (fetchError || !projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (projectData.status !== 'EXECUTING') {
      return NextResponse.json({ error: 'Project not in EXECUTING state' }, { status: 400 })
    }

    const orchState = projectData.orchestration_state
    if (!orchState?.tasks) {
      return NextResponse.json({ error: 'No orchestration state' }, { status: 400 })
    }

    // Find next QUEUED task that has all dependencies satisfied
    const tasks = orchState.tasks
    let nextTask: string | null = null

    for (const [taskId, taskState] of Object.entries(tasks) as [string, any][]) {
      if (taskState.status !== 'QUEUED') continue
      
      // Check if all dependencies are DONE
      const deps = taskState.dependencies || []
      const allDepsDone = deps.every((depId: string) => tasks[depId]?.status === 'DONE')
      
      if (allDepsDone) {
        nextTask = taskId
        break
      }
    }

    if (!nextTask) {
      // Check if we're done or blocked
      const statuses = Object.values(tasks).map((t: any) => t.status)
      const allDone = statuses.every(s => s === 'DONE')
      const hasRunning = statuses.some(s => s === 'RUNNING')
      
      if (allDone) {
        // Mark project as completed
        await supabase
          .from('projects')
          .update({ status: 'COMPLETED' })
          .eq('name', project)
        return NextResponse.json({ message: 'All tasks completed!', status: 'COMPLETED' })
      }
      
      if (hasRunning) {
        return NextResponse.json({ message: 'Tasks are running, waiting...', status: 'RUNNING' })
      }
      
      return NextResponse.json({ message: 'No tasks ready to run (waiting on dependencies)', status: 'BLOCKED' })
    }

    // Get task details from plan
    const { plan } = parsePlan(projectData.plan_content || '')
    const taskDetails = plan?.tasks?.find(t => t.id === nextTask)

    if (!taskDetails) {
      return NextResponse.json({ error: `Task ${nextTask} not found in plan` }, { status: 400 })
    }

    // Mark task as RUNNING
    orchState.tasks[nextTask].status = 'RUNNING'
    orchState.tasks[nextTask].startedAt = new Date().toISOString()
    orchState.updated = new Date().toISOString()

    await supabase
      .from('projects')
      .update({ orchestration_state: orchState })
      .eq('name', project)

    // Build the task prompt for Claude Code
    const taskPrompt = `You are working on project "${project}".

## Current Task: ${taskDetails.name} (${nextTask})

**Description:** ${taskDetails.description}

**Files to create/modify:**
${taskDetails.files?.map(f => `- ${f}`).join('\n') || '- (none specified)'}

**Completion Criteria:**
${taskDetails.completionCriteria?.map(c => `- ${c}`).join('\n') || '- Complete the task as described'}

## Instructions
1. Implement this task completely
2. Create/modify the necessary files
3. Test that everything works
4. When done, report what you accomplished

Do NOT ask clarifying questions - make reasonable decisions and proceed with implementation.`

    // Call Clawdbot to spawn a session
    const gatewayUrl = process.env.CLAWDBOT_GATEWAY_URL || 'http://localhost:3033'
    const gatewayToken = process.env.CLAWDBOT_GATEWAY_TOKEN

    if (!gatewayToken) {
      // No gateway - just mark as running for manual execution
      return NextResponse.json({
        message: `Task ${nextTask} marked as RUNNING`,
        task: nextTask,
        taskName: taskDetails.name,
        prompt: taskPrompt,
        manual: true,
      })
    }

    // Spawn Claude Code session
    const spawnRes = await fetch(`${gatewayUrl}/api/sessions/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        task: taskPrompt,
        label: `${project}-${nextTask}`,
        model: taskDetails.model === 'opus' ? 'opus' : 'sonnet',
        runTimeoutSeconds: 600, // 10 min timeout
      }),
    })

    if (!spawnRes.ok) {
      // Revert task status
      orchState.tasks[nextTask].status = 'QUEUED'
      delete orchState.tasks[nextTask].startedAt
      await supabase
        .from('projects')
        .update({ orchestration_state: orchState })
        .eq('name', project)

      const errorText = await spawnRes.text()
      return NextResponse.json({ error: `Failed to spawn session: ${errorText}` }, { status: 500 })
    }

    const spawnData = await spawnRes.json()

    // Update task with session info
    orchState.tasks[nextTask].sessionKey = spawnData.sessionKey
    await supabase
      .from('projects')
      .update({ orchestration_state: orchState })
      .eq('name', project)

    return NextResponse.json({
      message: `Task ${nextTask} started`,
      task: nextTask,
      taskName: taskDetails.name,
      sessionKey: spawnData.sessionKey,
    })

  } catch (error) {
    console.error('Dispatch error:', error)
    return NextResponse.json({ error: 'Failed to dispatch task' }, { status: 500 })
  }
}
