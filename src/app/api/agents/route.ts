import { NextResponse } from 'next/server'
import { listProjectsDb, getOrchestrationStateDb } from '@/lib/projects-db'

const MAX_CONCURRENT_AGENTS = 3

interface RunningAgent {
  taskId: string
  project: string
  model: 'sonnet' | 'opus'
  started: string
}

export async function GET() {
  try {
    const projects = await listProjectsDb()
    const agents: RunningAgent[] = []
    
    // Scan all projects for running tasks
    for (const project of projects) {
      const orchestrationState = await getOrchestrationStateDb(project.name)
      
      if (orchestrationState?.tasks) {
        for (const [taskId, taskState] of Object.entries(orchestrationState.tasks) as [string, { status: string; model: 'sonnet' | 'opus'; started?: string }][]) {
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
