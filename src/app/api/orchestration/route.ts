import { NextResponse } from 'next/server'
import { listProjects, getOrchestrationState } from '@/lib/projects'

interface ProjectSummary {
  name: string
  status: string
  taskCount: number
  completedCount: number
  runningAgents: number
}

export async function GET() {
  try {
    const projects = await listProjects()
    
    const projectSummaries: ProjectSummary[] = await Promise.all(
      projects.map(async (project) => {
        const orchestrationState = await getOrchestrationState(project.name)
        
        let taskCount = 0
        let completedCount = 0
        let runningAgents = 0
        
        if (orchestrationState) {
          const taskStates = Object.values(orchestrationState.tasks)
          taskCount = taskStates.length
          completedCount = taskStates.filter(t => t.status === 'DONE').length
          runningAgents = taskStates.filter(t => t.status === 'RUNNING').length
        } else if (project.plan) {
          // Fallback to plan data if no orchestration state
          taskCount = project.plan.tasks.length
          completedCount = project.plan.tasks.filter(t => t.status === 'DONE').length
          runningAgents = project.plan.tasks.filter(t => t.status === 'RUNNING').length
        }
        
        return {
          name: project.name,
          status: project.status,
          taskCount,
          completedCount,
          runningAgents,
        }
      })
    )
    
    return NextResponse.json({ projects: projectSummaries })
  } catch (error) {
    console.error('Error fetching orchestration data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orchestration data' },
      { status: 500 }
    )
  }
}
