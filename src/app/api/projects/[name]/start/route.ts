import { NextRequest, NextResponse } from 'next/server'
import { startExecutionDb, getProjectStatusDb, projectExistsDb } from '@/lib/projects-db'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * POST /api/projects/[name]/start
 * Starts execution - copies plan to original, creates orchestration state
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    
    // Check if project exists
    if (!await projectExistsDb(name)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Check current status
    const status = await getProjectStatusDb(name)
    if (status !== 'FINALIZED') {
      return NextResponse.json(
        { error: `Cannot start execution from ${status} status. Finalize first.` },
        { status: 400 }
      )
    }
    
    await startExecutionDb(name)
    
    return NextResponse.json({ 
      message: 'Execution started successfully',
      status: 'EXECUTING'
    })
  } catch (error) {
    console.error('Error starting execution:', error)
    return NextResponse.json(
      { error: 'Failed to start execution' },
      { status: 500 }
    )
  }
}
