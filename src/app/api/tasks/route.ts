import { NextRequest, NextResponse } from 'next/server'
import { getOrchestrationStateDb, getRawPlanDb } from '@/lib/projects-db'
import { parsePlan } from '@/lib/plan-parser'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface TaskResponse {
  id: string
  name: string
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
  model: string
  dependencies: string[]
  description?: string
  attempts: number
  startedAt?: string
  completedAt?: string
}

export async function GET(request: NextRequest) {
  const projectName = request.nextUrl.searchParams.get('project')
  
  if (!projectName) {
    return NextResponse.json({ tasks: [], error: 'Missing project parameter' })
  }
  
  try {
    // Get orchestration state
    const orchState = await getOrchestrationStateDb(projectName)
    
    if (!orchState) {
      // Project might be in DRAFT/FINALIZED - try to parse plan for preview
      const planContent = await getRawPlanDb(projectName)
      if (planContent) {
        const { plan } = parsePlan(planContent)
        if (plan?.tasks) {
          const tasks: TaskResponse[] = plan.tasks.map(t => ({
            id: t.id,
            name: t.name,
            status: 'PENDING',
            model: t.model,
            dependencies: t.dependencies,
            description: t.description,
            attempts: 0,
          }))
          return NextResponse.json({ tasks, preview: true })
        }
      }
      return NextResponse.json({ tasks: [] })
    }
    
    // Get plan content for task details
    const planContent = await getRawPlanDb(projectName)
    const { plan } = planContent ? parsePlan(planContent) : { plan: null }
    const taskDetails = new Map(plan?.tasks?.map(t => [t.id, t]) || [])
    
    // Build task list from orchestration state
    const tasks: TaskResponse[] = Object.entries(orchState.tasks || {}).map(([id, state]: [string, any]) => {
      const details = taskDetails.get(id)
      return {
        id,
        name: details?.name || id,
        status: state.status,
        model: state.model || details?.model || 'sonnet',
        dependencies: state.dependencies || details?.dependencies || [],
        description: details?.description,
        attempts: state.attempts || 0,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
      }
    })
    
    // Sort: RUNNING first, then QUEUED, then PENDING, then DONE/FAILED
    const statusOrder = { RUNNING: 0, QUEUED: 1, PENDING: 2, FAILED: 3, DONE: 4 }
    tasks.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5))
    
    return NextResponse.json({ 
      tasks,
      queue: orchState.queue || [],
      running: Object.entries(orchState.tasks || {}).filter(([_, s]: [string, any]) => s.status === 'RUNNING').map(([id]) => id),
    })
  } catch (e) {
    console.error('Failed to fetch tasks:', e)
    return NextResponse.json({ tasks: [], error: 'Failed to fetch tasks' })
  }
}
