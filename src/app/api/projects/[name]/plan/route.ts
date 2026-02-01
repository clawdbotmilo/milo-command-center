import { NextRequest, NextResponse } from 'next/server'
import { getRawPlanDb, savePlanDb, getProjectStatusDb, projectExistsDb } from '@/lib/projects-db'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * GET /api/projects/[name]/plan
 * Returns raw plan markdown
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    
    const content = await getRawPlanDb(name)
    
    if (content === null) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error getting plan:', error)
    return NextResponse.json(
      { error: 'Failed to get plan' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/[name]/plan
 * Saves plan markdown (only if status is DRAFT)
 * Body: { content: string }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const body = await request.json()
    const { content } = body
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }
    
    // Check if project exists
    if (!await projectExistsDb(name)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Check status - only allow editing in DRAFT
    const status = await getProjectStatusDb(name)
    if (status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot edit plan in ${status} status. Revert to draft first.` },
        { status: 403 }
      )
    }
    
    await savePlanDb(name, content)
    
    return NextResponse.json({ message: 'Plan saved successfully' })
  } catch (error) {
    console.error('Error saving plan:', error)
    return NextResponse.json(
      { error: 'Failed to save plan' },
      { status: 500 }
    )
  }
}
