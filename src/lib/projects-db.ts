import { supabase, DbProject } from './supabase'
import { Project, ProjectStatus } from '@/types/project'
import { parsePlan } from './plan-parser'

const DEFAULT_PLAN_TEMPLATE = `# Project: {PROJECT_NAME}

## Vision
Describe your project vision here.

## Success Criteria
- [ ] First success criterion
- [ ] Second success criterion

## Tasks

### Task 1: Setup
- **ID:** T1
- **Agent:** sonnet
- **Dependencies:** none
- **Estimated complexity:** low
- **Description:** Initial project setup
- **Files to create/modify:**
  - \`src/index.ts\` - Main entry point
- **Completion Criteria:**
  - [ ] Files created
  - [ ] No TypeScript errors
`

/**
 * List all projects from Supabase
 */
export async function listProjectsDb(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error listing projects:', error)
    throw new Error('Failed to list projects')
  }

  return (data || []).map(dbProjectToProject)
}

/**
 * Get a single project by name
 */
export async function getProjectDb(name: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('name', name)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('Error getting project:', error)
    throw new Error('Failed to get project')
  }

  return dbProjectToProject(data)
}

/**
 * Check if a project exists
 */
export async function projectExistsDb(name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('name', name)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking project:', error)
    throw new Error('Failed to check project')
  }

  return !!data
}

/**
 * Create a new project
 */
export async function createProjectDb(name: string): Promise<Project> {
  const planContent = DEFAULT_PLAN_TEMPLATE.replace('{PROJECT_NAME}', name)

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      status: 'DRAFT',
      plan_content: planContent,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    throw new Error('Failed to create project')
  }

  return dbProjectToProject(data)
}

/**
 * Delete a project
 */
export async function deleteProjectDb(name: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('name', name)

  if (error) {
    console.error('Error deleting project:', error)
    throw new Error('Failed to delete project')
  }
}

/**
 * Get raw plan content
 */
export async function getRawPlanDb(name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('plan_content')
    .eq('name', name)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error('Failed to get plan')
  }

  return data?.plan_content || null
}

/**
 * Save plan content
 */
export async function savePlanDb(name: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ plan_content: content })
    .eq('name', name)

  if (error) {
    console.error('Error saving plan:', error)
    throw new Error('Failed to save plan')
  }
}

/**
 * Finalize a plan (lock for editing)
 */
export async function finalizePlanDb(name: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status: 'FINALIZED' })
    .eq('name', name)

  if (error) {
    console.error('Error finalizing plan:', error)
    throw new Error('Failed to finalize plan')
  }
}

/**
 * Revert to draft
 */
export async function revertToDraftDb(name: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status: 'DRAFT' })
    .eq('name', name)

  if (error) {
    console.error('Error reverting to draft:', error)
    throw new Error('Failed to revert to draft')
  }
}

/**
 * Start execution
 */
export async function startExecutionDb(name: string): Promise<void> {
  // First get the current plan
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('plan_content')
    .eq('name', name)
    .single()

  if (fetchError) {
    throw new Error('Failed to get project')
  }

  // Parse the plan to get tasks
  const parseResult = parsePlan(project.plan_content || '')
  const tasks: Record<string, any> = {}
  
  if (parseResult.plan?.tasks) {
    parseResult.plan.tasks.forEach(task => {
      tasks[task.id] = {
        status: task.dependencies.length === 0 ? 'QUEUED' : 'PENDING',
        model: task.model,
        attempts: 0,
        dependencies: task.dependencies,
      }
    })
  }

  const orchestrationState = {
    project: name,
    status: 'EXECUTING',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    tasks,
    queue: Object.keys(tasks).filter(id => tasks[id].status === 'QUEUED'),
    locks: {},
  }

  // Update project with original plan backup and orchestration state
  const { error } = await supabase
    .from('projects')
    .update({
      status: 'EXECUTING',
      original_plan_content: project.plan_content,
      orchestration_state: orchestrationState,
    })
    .eq('name', name)

  if (error) {
    console.error('Error starting execution:', error)
    throw new Error('Failed to start execution')
  }
}

/**
 * Get project status
 */
export async function getProjectStatusDb(name: string): Promise<ProjectStatus | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('status')
    .eq('name', name)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error('Failed to get status')
  }

  return data?.status as ProjectStatus
}

/**
 * Get orchestration state
 */
export async function getOrchestrationStateDb(name: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('orchestration_state')
    .eq('name', name)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error('Failed to get orchestration state')
  }

  return data?.orchestration_state
}

/**
 * Convert DB row to Project type
 */
function dbProjectToProject(row: DbProject): Project {
  const parseResult = row.plan_content ? parsePlan(row.plan_content) : null

  return {
    name: row.name,
    status: row.status as ProjectStatus,
    plan: parseResult?.plan || null,
    created: row.created_at,
    updated: row.updated_at,
  }
}
