import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parsePlan } from '@/lib/plan-parser'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * Parse dependencies section from plan markdown
 */
function parseDependenciesFromPlan(content: string): Map<string, string[]> {
  const depsMap = new Map<string, string[]>()
  const sectionMatch = content.match(/## Dependencies\s*\n([\s\S]*?)(?=\n## |$)/m)
  if (!sectionMatch) return depsMap
  
  const lines = sectionMatch[1].split('\n')
  for (const line of lines) {
    // Match patterns like "T2 depends on T1" or "T3 depends on T1, T2"
    const depMatch = line.match(/[-*]?\s*(T\d+)\s+depends on\s+(.+)/i)
    if (depMatch) {
      const taskId = depMatch[1].toUpperCase()
      const depsText = depMatch[2]
      
      // Handle "all previous tasks" case
      if (depsText.toLowerCase().includes('all previous')) {
        // Get all task IDs with lower numbers
        const taskNum = parseInt(taskId.replace('T', ''))
        const deps = []
        for (let i = 1; i < taskNum; i++) {
          deps.push(`T${i}`)
        }
        depsMap.set(taskId, deps)
      } else {
        // Parse individual task references
        const deps = depsText
          .split(/[,&]|\band\b/i)
          .map(d => d.trim())
          .filter(d => /^T\d+$/i.test(d))
          .map(d => d.toUpperCase())
        if (deps.length > 0) {
          depsMap.set(taskId, deps)
        }
      }
    }
  }
  
  return depsMap
}

/**
 * POST /api/projects/[name]/reinitialize
 * Re-parses the plan and reinitializes execution state (for fixing stuck projects)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    
    // Get current project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', name)
      .single()

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Parse the plan
    const planContent = project.plan_content || ''
    const parseResult = parsePlan(planContent)
    
    if (!parseResult.plan?.tasks?.length) {
      return NextResponse.json(
        { error: 'No tasks found in plan', parseErrors: parseResult.errors },
        { status: 400 }
      )
    }
    
    // Parse dependencies from the Dependencies section
    const depsFromSection = parseDependenciesFromPlan(planContent)
    
    // Build new orchestration state
    const tasks: Record<string, any> = {}
    parseResult.plan.tasks.forEach(task => {
      // Use dependencies from section if available, otherwise from task
      const deps = depsFromSection.get(task.id) || task.dependencies || []
      tasks[task.id] = {
        status: deps.length === 0 ? 'QUEUED' : 'PENDING',
        model: task.model,
        attempts: 0,
        dependencies: deps,
      }
    })

    const orchestrationState = {
      project: name,
      status: 'EXECUTING',
      created: project.orchestration_state?.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      tasks,
      queue: Object.keys(tasks).filter(id => tasks[id].status === 'QUEUED'),
      locks: {},
    }

    // Update project
    const { error } = await supabase
      .from('projects')
      .update({
        status: 'EXECUTING',
        orchestration_state: orchestrationState,
      })
      .eq('name', name)

    if (error) {
      console.error('Error reinitializing:', error)
      return NextResponse.json(
        { error: 'Failed to reinitialize' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Project reinitialized',
      taskCount: parseResult.plan.tasks.length,
      queue: orchestrationState.queue,
    })
  } catch (error) {
    console.error('Error reinitializing execution:', error)
    return NextResponse.json(
      { error: 'Failed to reinitialize execution' },
      { status: 500 }
    )
  }
}
