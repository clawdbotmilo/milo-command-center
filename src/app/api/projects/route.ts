import { NextRequest, NextResponse } from 'next/server'
import { listProjectsDb, createProjectDb, projectExistsDb } from '@/lib/projects-db'

/**
 * GET /api/projects
 * Returns all projects with their status
 */
export async function GET() {
  try {
    const projects = await listProjectsDb()
    
    return NextResponse.json({
      projects: projects.map(p => ({
        name: p.name,
        status: p.status,
        created: p.created,
        updated: p.updated,
        taskCount: p.plan?.tasks.length ?? 0,
      }))
    })
  } catch (error) {
    console.error('Error listing projects:', error)
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Creates a new project
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }
    
    // Validate project name (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { error: 'Project name can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      )
    }
    
    // Check if project already exists
    if (await projectExistsDb(name)) {
      return NextResponse.json(
        { error: 'Project already exists' },
        { status: 409 }
      )
    }
    
    // Create the project
    await createProjectDb(name)
    
    return NextResponse.json(
      { message: 'Project created successfully', name },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
