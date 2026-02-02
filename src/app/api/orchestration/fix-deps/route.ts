import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/orchestration/fix-deps
 * Manually fix task dependencies for a project
 */
export async function POST(request: NextRequest) {
  try {
    const { project, dependencies } = await request.json()
    
    if (!project || !dependencies) {
      return NextResponse.json({ error: 'Missing project or dependencies' }, { status: 400 })
    }

    // Get current orchestration state
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('orchestration_state')
      .eq('name', project)
      .single()

    if (fetchError || !projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const orchState = projectData.orchestration_state
    if (!orchState?.tasks) {
      return NextResponse.json({ error: 'No orchestration state' }, { status: 400 })
    }

    // Update dependencies and recalculate statuses
    for (const [taskId, deps] of Object.entries(dependencies)) {
      if (orchState.tasks[taskId]) {
        orchState.tasks[taskId].dependencies = deps as string[]
        
        // Recalculate status based on dependencies
        const depsArray = deps as string[]
        if (depsArray.length === 0) {
          // No dependencies - can be queued
          if (orchState.tasks[taskId].status === 'PENDING') {
            orchState.tasks[taskId].status = 'QUEUED'
          }
        } else {
          // Has dependencies - check if all are done
          const allDepsDone = depsArray.every(depId => orchState.tasks[depId]?.status === 'DONE')
          if (!allDepsDone && orchState.tasks[taskId].status === 'QUEUED') {
            orchState.tasks[taskId].status = 'PENDING'
          }
        }
      }
    }

    // Update queue to only include tasks with no unmet dependencies
    orchState.queue = Object.entries(orchState.tasks)
      .filter(([_, t]: [string, any]) => t.status === 'QUEUED')
      .map(([id]) => id)

    orchState.updated = new Date().toISOString()

    // Save
    const { error: updateError } = await supabase
      .from('projects')
      .update({ orchestration_state: orchState })
      .eq('name', project)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Dependencies fixed',
      queue: orchState.queue,
      taskCount: Object.keys(orchState.tasks).length,
    })

  } catch (error) {
    console.error('Fix deps error:', error)
    return NextResponse.json({ error: 'Failed to fix dependencies' }, { status: 500 })
  }
}
