import { NextRequest, NextResponse } from 'next/server'
import { getProject, deleteProject, projectExists, getRawPlan } from '@/lib/projects'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * GET /api/projects/[name]
 * Returns project details including plan content
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { name } = await params
    
    const project = await getProject(name)
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Also get raw plan content
    const rawPlan = await getRawPlan(name)
    
    return NextResponse.json({
      ...project,
      rawPlan,
    })
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
 * Removes project folder
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { name } = await params
    
    // Check if project exists
    if (!(await projectExists(name))) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    await deleteProject(name)
    
    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
