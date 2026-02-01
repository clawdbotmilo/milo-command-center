import { NextRequest, NextResponse } from 'next/server'
import { finalizePlan, getProjectStatus, projectExists, getRawPlan } from '@/lib/projects'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * POST /api/projects/[name]/finalize
 * Changes project status to FINALIZED (locks editing)
 */
export async function POST(
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
    
    // Check current status
    const status = await getProjectStatus(name)
    if (status === 'FINALIZED') {
      return NextResponse.json(
        { error: 'Project is already finalized' },
        { status: 400 }
      )
    }
    
    if (status === 'EXECUTING' || status === 'COMPLETED') {
      return NextResponse.json(
        { error: `Cannot finalize: project is already ${status}` },
        { status: 400 }
      )
    }
    
    // Verify project has a plan
    const plan = await getRawPlan(name)
    if (!plan) {
      return NextResponse.json(
        { error: 'Cannot finalize: project has no plan' },
        { status: 400 }
      )
    }
    
    // Finalize the plan
    await finalizePlan(name)
    
    return NextResponse.json({ 
      message: 'Project finalized successfully',
      status: 'FINALIZED'
    })
  } catch (error) {
    console.error('Error finalizing project:', error)
    return NextResponse.json(
      { error: 'Failed to finalize project' },
      { status: 500 }
    )
  }
}
