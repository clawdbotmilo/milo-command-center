import { NextResponse } from 'next/server'
import { listProjectsDb } from '@/lib/projects-db'

/**
 * GET /api/orchestration
 * Returns all projects with their orchestration state summary
 */
export async function GET() {
  try {
    const projects = await listProjectsDb()
    
    const projectSummaries = projects.map(p => {
      const tasks = p.plan?.tasks || []
      const completedCount = 0 // Would need orchestration state to calculate
      
      return {
        name: p.name,
        status: p.status,
        taskCount: tasks.length,
        completedCount,
        runningAgents: 0, // Would need orchestration state
      }
    })
    
    return NextResponse.json({ projects: projectSummaries })
  } catch (error) {
    console.error('Error getting orchestration:', error)
    return NextResponse.json(
      { error: 'Failed to get orchestration data' },
      { status: 500 }
    )
  }
}
