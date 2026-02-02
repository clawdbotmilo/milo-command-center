import { NextRequest, NextResponse } from 'next/server'
import { markTaskComplete, executeProjectTick } from '@/lib/executor'

/**
 * POST /api/orchestration/complete
 * Mark a task as complete (success or failure)
 * Then auto-tick to progress the project
 */
export async function POST(request: NextRequest) {
  try {
    const { project, task, success = true, error } = await request.json()
    
    if (!project || !task) {
      return NextResponse.json(
        { error: 'Missing project or task' },
        { status: 400 }
      )
    }

    const marked = await markTaskComplete(project, task, success, error)
    
    if (!marked) {
      return NextResponse.json(
        { error: 'Failed to mark task complete' },
        { status: 500 }
      )
    }

    // Auto-tick to dispatch next tasks
    const tickResult = await executeProjectTick(project)

    return NextResponse.json({
      taskMessage: `Task ${task} marked as ${success ? 'DONE' : 'FAILED'}`,
      ...tickResult,
    })
  } catch (error) {
    console.error('Complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    )
  }
}
