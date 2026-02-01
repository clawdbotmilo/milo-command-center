import { NextRequest, NextResponse } from 'next/server'
import { 
  getProjectStatus, 
  projectExists, 
  backupPlan, 
  saveOrchestrationState,
  getProject 
} from '@/lib/projects'
import type { OrchestrationState, TaskState } from '@/types/orchestration'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * POST /api/projects/[name]/start
 * - Copies PROJECT-PLAN.md to PROJECT-PLAN.original.md
 * - Creates initial ORCHESTRATION-STATE.json
 * - Changes status to EXECUTING
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { name } = await params
    
    // Check if project exists
    if (!(await projectExists(name))) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Check current status - must be FINALIZED to start
    const status = await getProjectStatus(name)
    
    if (status === 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot start: project must be finalized first' },
        { status: 400 }
      )
    }
    
    if (status === 'EXECUTING') {
      return NextResponse.json(
        { error: 'Project is already executing' },
        { status: 400 }
      )
    }
    
    if (status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Project is already completed' },
        { status: 400 }
      )
    }
    
    // Get the project to extract plan data
    const project = await getProject(name)
    if (!project || !project.plan) {
      return NextResponse.json(
        { error: 'Cannot start: project has no valid plan' },
        { status: 400 }
      )
    }
    
    // Step 1: Backup the plan
    await backupPlan(name)
    
    // Step 2: Create initial orchestration state
    const now = new Date().toISOString()
    
    // Build task states from plan tasks
    const tasks: Record<string, TaskState> = {}
    const queue: string[] = []
    
    for (const task of project.plan.tasks) {
      tasks[task.id] = {
        status: 'PENDING',
        model: task.model,
        attempts: 0,
        dependencies: task.dependencies,
      }
      
      // Add tasks with no dependencies to the initial queue
      if (task.dependencies.length === 0) {
        queue.push(task.id)
      }
    }
    
    const orchestrationState: OrchestrationState = {
      project: name,
      status: 'EXECUTING',
      created: now,
      updated: now,
      tasks,
      queue,
      locks: {},
    }
    
    // Step 3: Save orchestration state (this changes status to EXECUTING)
    await saveOrchestrationState(name, orchestrationState)
    
    return NextResponse.json({ 
      message: 'Project execution started',
      status: 'EXECUTING',
      queue,
      taskCount: Object.keys(tasks).length
    })
  } catch (error) {
    console.error('Error starting project:', error)
    return NextResponse.json(
      { error: 'Failed to start project' },
      { status: 500 }
    )
  }
}
