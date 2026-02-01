import { NextRequest, NextResponse } from 'next/server'
import { getRawPlan, savePlan, getProjectStatus, projectExists } from '@/lib/projects'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * GET /api/projects/[name]/plan
 * Returns raw plan markdown
 */
export async function GET(
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
    
    const plan = await getRawPlan(name)
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ content: plan })
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
export async function PUT(
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
    
    // Check project status - only allow editing if DRAFT
    const status = await getProjectStatus(name)
    if (status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot edit plan: project is ${status}. Only DRAFT projects can be edited.` },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { content } = body
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Plan content is required' },
        { status: 400 }
      )
    }
    
    await savePlan(name, content)
    
    return NextResponse.json({ message: 'Plan saved successfully' })
  } catch (error) {
    console.error('Error saving plan:', error)
    return NextResponse.json(
      { error: 'Failed to save plan' },
      { status: 500 }
    )
  }
}
