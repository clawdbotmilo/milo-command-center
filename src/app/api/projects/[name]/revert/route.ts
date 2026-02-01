import { NextRequest, NextResponse } from 'next/server'
import { revertToDraftDb, getProjectStatusDb, projectExistsDb } from '@/lib/projects-db'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * POST /api/projects/[name]/revert
 * Changes project status back to DRAFT
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
        { error: `Cannot revert from ${status} status` },
        { status: 400 }
      )
    }
    
    await revertToDraftDb(name)
    
    return NextResponse.json({ 
      message: 'Reverted to draft successfully',
      status: 'DRAFT'
    })
  } catch (error) {
    console.error('Error reverting to draft:', error)
    return NextResponse.json(
      { error: 'Failed to revert to draft' },
      { status: 500 }
    )
  }
}
