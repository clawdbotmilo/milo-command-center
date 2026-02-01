import { NextRequest, NextResponse } from 'next/server'
import { finalizePlanDb, getProjectStatusDb, projectExistsDb } from '@/lib/projects-db'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * POST /api/projects/[name]/finalize
 * Changes project status to FINALIZED
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
    if (status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot finalize from ${status} status` },
        { status: 400 }
      )
    }
    
    await finalizePlanDb(name)
    
    return NextResponse.json({ 
      message: 'Plan finalized successfully',
      status: 'FINALIZED'
    })
  } catch (error) {
    console.error('Error finalizing plan:', error)
    return NextResponse.json(
      { error: 'Failed to finalize plan' },
      { status: 500 }
    )
  }
}
