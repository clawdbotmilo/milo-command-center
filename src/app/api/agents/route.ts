import { NextResponse } from 'next/server'
import { listProjects, getOrchestrationState } from '@/lib/projects'

const MAX_CONCURRENT_AGENTS = 3

interface RunningAgent {
  taskId: string
  project: string
  model: 'sonnet' | 'opus'
  started: string
}

export async function GET() {
  try {
    const projects = await listProjects()
    const agents: RunningAgent[] = []
    
    // Scan all projects for running tasks
    for (const project of projects) {
      const orchestrationState = await getOrchestrationState(project.name)
      
      if (orchestrationState) {
        for (const [taskId, taskState] of Object.entries(orchestrationState.tasks)) {
          if (taskState.status === 'RUNNING') {
            agents.push({
              taskId,
              project: project.name,
              model: taskState.model,
              started: taskState.started || new Date().toISOString(),
            })
          }
        }
      }
    }
    
    const availableSlots = Math.max(0, MAX_CONCURRENT_AGENTS - agents.length)
    
    return NextResponse.json({
      agents,
      availableSlots,
    })
  } catch (error) {
    console.error('Error fetching agent data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent data' },
      { status: 500 }
    )
  }
}
