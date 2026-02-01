import { NextRequest, NextResponse } from 'next/server'
import { getOrchestrationStateDb, projectExistsDb } from '@/lib/projects-db'

interface RouteParams {
  params: Promise<{ project: string }>
}

/**
 * GET /api/orchestration/[project]
 * Returns detailed orchestration state for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { project } = await params
    
    if (!await projectExistsDb(project)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    const state = await getOrchestrationStateDb(project)
    
    if (!state) {
      return NextResponse.json({
        project,
        status: 'NOT_STARTED',
        tasks: {},
        queue: [],
        locks: {},
      })
    }
    
    return NextResponse.json(state)
  } catch (error) {
    console.error('Error getting orchestration state:', error)
    return NextResponse.json(
      { error: 'Failed to get orchestration state' },
      { status: 500 }
    )
  }
}
