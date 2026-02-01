import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getProjectStatus, projectExists, getProjectDir } from '@/lib/projects'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * POST /api/projects/[name]/revert
 * Reverts a FINALIZED project back to DRAFT status
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
    
    // Check current status - must be FINALIZED to revert
    const status = await getProjectStatus(name)
    
    if (status === 'DRAFT') {
      return NextResponse.json(
        { error: 'Project is already in draft status' },
        { status: 400 }
      )
    }
    
    if (status === 'EXECUTING') {
      return NextResponse.json(
        { error: 'Cannot revert: project is currently executing' },
        { status: 400 }
      )
    }
    
    if (status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot revert: project is already completed' },
        { status: 400 }
      )
    }
    
    // Revert the plan status from FINALIZED to DRAFT
    const planPath = path.join(getProjectDir(name), 'PROJECT-PLAN.md')
    let content = await fs.readFile(planPath, 'utf-8')
    
    // Replace FINALIZED status with DRAFT
    content = content.replace(
      /<!-- Status: FINALIZED -->/,
      '<!-- Status: DRAFT -->'
    )
    
    await fs.writeFile(planPath, content, 'utf-8')
    
    return NextResponse.json({ 
      message: 'Project reverted to draft',
      status: 'DRAFT'
    })
  } catch (error) {
    console.error('Error reverting project:', error)
    return NextResponse.json(
      { error: 'Failed to revert project' },
      { status: 500 }
    )
  }
}
