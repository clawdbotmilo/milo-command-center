import { NextResponse } from 'next/server'
import { getProject, getOrchestrationState } from '@/lib/projects'

interface RouteParams {
  params: Promise<{ project: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { project: projectName } = await params
    
    // Check if project exists
    const project = await getProject(projectName)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Get orchestration state
    const orchestrationState = await getOrchestrationState(projectName)
    
    if (!orchestrationState) {
      // Return a minimal state if no orchestration file exists
      return NextResponse.json({
        project: projectName,
        status: project.status,
        created: project.created,
        updated: project.updated,
        tasks: {},
        queue: [],
        locks: {},
      })
    }
    
    return NextResponse.json(orchestrationState)
  } catch (error) {
    console.error('Error fetching project orchestration state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orchestration state' },
      { status: 500 }
    )
  }
}
