import { NextRequest, NextResponse } from 'next/server'
import { getProjectDb, deleteProjectDb, projectExistsDb } from '@/lib/projects-db'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * GET /api/projects/[name]
 * Returns project details including plan content
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    
    const project = await getProjectDb(name)
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error getting project:', error)
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[name]
 * Deletes a project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    
    if (!await projectExistsDb(name)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    await deleteProjectDb(name)
    
    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
