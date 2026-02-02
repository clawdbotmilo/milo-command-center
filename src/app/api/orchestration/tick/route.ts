import { NextRequest, NextResponse } from 'next/server'
import { executeProjectTick } from '@/lib/executor'

/**
 * POST /api/orchestration/tick
 * Advances project execution - check tasks, dispatch new ones
 * Call this periodically (cron) or on demand
 */
export async function POST(request: NextRequest) {
  try {
    const { project } = await request.json()
    
    if (!project) {
      return NextResponse.json({ error: 'Missing project name' }, { status: 400 })
    }

    const result = await executeProjectTick(project)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Tick error:', error)
    return NextResponse.json(
      { error: 'Failed to execute tick', success: false },
      { status: 500 }
    )
  }
}
