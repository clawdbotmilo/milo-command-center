import { promises as fs } from 'fs'
import path from 'path'
import type { Project, Plan, ProjectStatus } from '../types/project'
import type { OrchestrationState } from '../types/orchestration'

// Projects live in the main clawd workspace, not inside milo-command-center
const PROJECTS_DIR = '/home/ubuntu/clawd/projects'

/**
 * List all projects in the projects/ directory
 */
export async function listProjects(): Promise<Project[]> {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true })
    const projects: Project[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const project = await getProject(entry.name)
        if (project) {
          projects.push(project)
        }
      }
    }

    return projects
  } catch (error) {
    // If projects directory doesn't exist, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

/**
 * Get a single project by name with its plan content
 */
export async function getProject(name: string): Promise<Project | null> {
  const projectDir = path.join(PROJECTS_DIR, name)

  try {
    const stat = await fs.stat(projectDir)
    if (!stat.isDirectory()) {
      return null
    }

    // Read PROJECT-PLAN.md if it exists
    let plan: Plan | null = null

    try {
      const planPath = path.join(projectDir, 'PROJECT-PLAN.md')
      const planContent = await fs.readFile(planPath, 'utf-8')
      plan = parsePlanContent(planContent)
    } catch {
      // No plan file exists yet
    }

    // Get proper status based on files and content
    const status = await getProjectStatus(name)

    return {
      name,
      status,
      plan,
      created: stat.birthtime.toISOString(),
      updated: stat.mtime.toISOString(),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Save or update a project's plan
 */
export async function savePlan(name: string, content: string): Promise<void> {
  const projectDir = path.join(PROJECTS_DIR, name)
  const planPath = path.join(projectDir, 'PROJECT-PLAN.md')

  // Ensure project directory exists
  await fs.mkdir(projectDir, { recursive: true })

  // Write the plan file
  await fs.writeFile(planPath, content, 'utf-8')
}

/**
 * Get the orchestration state for a project
 */
export async function getOrchestrationState(name: string): Promise<OrchestrationState | null> {
  const statePath = path.join(PROJECTS_DIR, name, 'ORCHESTRATION-STATE.json')

  try {
    const content = await fs.readFile(statePath, 'utf-8')
    return JSON.parse(content) as OrchestrationState
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Get the projects directory path
 */
export function getProjectsDir(): string {
  return PROJECTS_DIR
}

/**
 * Get a project's directory path
 */
export function getProjectDir(name: string): string {
  return path.join(PROJECTS_DIR, name)
}

/**
 * Check if a project exists
 */
export async function projectExists(name: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(PROJECTS_DIR, name))
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * Get raw plan markdown content
 */
export async function getRawPlan(name: string): Promise<string | null> {
  try {
    const planPath = path.join(PROJECTS_DIR, name, 'PROJECT-PLAN.md')
    return await fs.readFile(planPath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Determine project status based on files and content
 */
export async function getProjectStatus(name: string): Promise<ProjectStatus> {
  const projectDir = path.join(PROJECTS_DIR, name)
  
  // Check for ORCHESTRATION-STATE.json first
  try {
    const statePath = path.join(projectDir, 'ORCHESTRATION-STATE.json')
    const stateContent = await fs.readFile(statePath, 'utf-8')
    const state = JSON.parse(stateContent) as OrchestrationState
    
    if (state.status === 'EXECUTING') return 'EXECUTING'
    if (state.status === 'COMPLETED') return 'COMPLETED'
  } catch {
    // No orchestration state, continue checking
  }
  
  // Check for PROJECT-PLAN.md with FINALIZED status
  try {
    const planPath = path.join(projectDir, 'PROJECT-PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf-8')
    
    // Check for Status: FINALIZED comment in the plan
    if (planContent.includes('<!-- Status: FINALIZED -->') || 
        planContent.match(/^Status:\s*FINALIZED/mi)) {
      return 'FINALIZED'
    }
  } catch {
    // No plan file
  }
  
  return 'DRAFT'
}

/**
 * Create a new project with an empty plan template
 */
export async function createProject(name: string): Promise<void> {
  const projectDir = path.join(PROJECTS_DIR, name)
  
  // Create project directory
  await fs.mkdir(projectDir, { recursive: true })
  
  // Create empty plan template
  const template = `# ${name}

<!-- Status: DRAFT -->

## Vision

[Describe the project vision here]

## Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Tasks

### Task 1: [Task Name]

- **ID:** T1
- **Agent:** sonnet
- **Dependencies:** none
- **Estimated complexity:** medium
- **Description:** [Describe what this task does]
- **Files to create/modify:**
  - \`path/to/file.ts\`
- **Completion Criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2
`
  
  await fs.writeFile(path.join(projectDir, 'PROJECT-PLAN.md'), template, 'utf-8')
}

/**
 * Delete a project directory
 */
export async function deleteProject(name: string): Promise<void> {
  const projectDir = path.join(PROJECTS_DIR, name)
  await fs.rm(projectDir, { recursive: true, force: true })
}

/**
 * Mark a plan as finalized by adding the FINALIZED status marker
 */
export async function finalizePlan(name: string): Promise<void> {
  const planPath = path.join(PROJECTS_DIR, name, 'PROJECT-PLAN.md')
  let content = await fs.readFile(planPath, 'utf-8')
  
  // Replace DRAFT status with FINALIZED
  content = content.replace(
    /<!-- Status: DRAFT -->/,
    '<!-- Status: FINALIZED -->'
  )
  
  // If no status marker exists, add one after the title
  if (!content.includes('<!-- Status: FINALIZED -->')) {
    content = content.replace(
      /^(# .+\n)/m,
      '$1\n<!-- Status: FINALIZED -->\n'
    )
  }
  
  await fs.writeFile(planPath, content, 'utf-8')
}

/**
 * Save orchestration state
 */
export async function saveOrchestrationState(name: string, state: OrchestrationState): Promise<void> {
  const statePath = path.join(PROJECTS_DIR, name, 'ORCHESTRATION-STATE.json')
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

/**
 * Copy the plan to .original.md backup
 */
export async function backupPlan(name: string): Promise<void> {
  const planPath = path.join(PROJECTS_DIR, name, 'PROJECT-PLAN.md')
  const backupPath = path.join(PROJECTS_DIR, name, 'PROJECT-PLAN.original.md')
  await fs.copyFile(planPath, backupPath)
}

/**
 * Parse PROJECT-PLAN.md content into a Plan object
 * This is a basic parser - can be enhanced for more complex formats
 */
function parsePlanContent(content: string): Plan {
  const lines = content.split('\n')
  let vision = ''
  const successCriteria: string[] = []
  const tasks: Plan['tasks'] = []

  let currentSection = ''
  let currentTask: Plan['tasks'][0] | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect section headers
    if (trimmed.startsWith('## Vision') || trimmed.startsWith('# Vision')) {
      currentSection = 'vision'
      continue
    }
    if (trimmed.startsWith('## Success Criteria') || trimmed.startsWith('# Success Criteria')) {
      currentSection = 'criteria'
      continue
    }
    if (trimmed.startsWith('## Tasks') || trimmed.startsWith('# Tasks')) {
      currentSection = 'tasks'
      continue
    }
    
    // Check for task headers - support multiple formats:
    // 1. "### T1 - Task Name" or "### T1: Task Name"
    // 2. "### Task 1: Task Name" (template format)
    const t1Match = trimmed.match(/^###?\s+(T\d+)\s*[-:]\s*(.*)/)
    const taskNumMatch = trimmed.match(/^###?\s+Task\s+(\d+)\s*[-:]\s*(.*)/)
    
    if (t1Match || taskNumMatch) {
      // New task header
      if (currentTask) {
        tasks.push(currentTask)
      }
      const match = t1Match || taskNumMatch
      if (match) {
        // For "Task N:" format, ID will be extracted from - **ID:** line below
        currentTask = {
          id: t1Match ? match[1] : '', // Empty for now if template format
          name: match[2] || match[1],
          description: '',
          model: 'sonnet',
          dependencies: [],
          complexity: 'medium',
          status: 'PENDING',
          completionCriteria: [],
          files: [],
        }
      }
      continue
    }

    // Parse content based on current section
    if (currentSection === 'vision' && trimmed) {
      vision += (vision ? '\n' : '') + trimmed
    }
    if (currentSection === 'criteria' && trimmed.startsWith('- ')) {
      successCriteria.push(trimmed.slice(2))
    }
    if (currentTask && trimmed) {
      // Look for task metadata - support both plain and bold markdown formats
      // Plain: "Model: sonnet" or Bold: "- **Model:** sonnet" or "**Model:** sonnet"
      const getFieldValue = (line: string, field: string): string | null => {
        // Match "- **Field:** value" or "**Field:** value" or "Field: value"
        const boldPattern = new RegExp(`^-?\\s*\\*\\*${field}:\\*\\*\\s*(.*)`, 'i')
        const plainPattern = new RegExp(`^${field}:\\s*(.*)`, 'i')
        const boldMatch = line.match(boldPattern)
        const plainMatch = line.match(plainPattern)
        return boldMatch?.[1]?.trim() || plainMatch?.[1]?.trim() || null
      }
      
      // ID field (for template format)
      const idValue = getFieldValue(trimmed, 'ID')
      if (idValue && !currentTask.id) {
        currentTask.id = idValue
      }
      
      // Model/Agent field
      const modelValue = getFieldValue(trimmed, 'Model') || getFieldValue(trimmed, 'Agent')
      if (modelValue) {
        const model = modelValue.toLowerCase()
        if (model === 'opus' || model === 'sonnet') {
          currentTask.model = model
        }
      }
      
      // Dependencies field
      const depsValue = getFieldValue(trimmed, 'Dependencies')
      if (depsValue) {
        const deps = depsValue.toLowerCase() === 'none' ? [] : 
          depsValue.split(',').map(d => d.trim()).filter(Boolean)
        currentTask.dependencies = deps
      }
      
      // Complexity field
      const complexityValue = getFieldValue(trimmed, 'Complexity') || getFieldValue(trimmed, 'Estimated complexity')
      if (complexityValue) {
        const complexity = complexityValue.toLowerCase()
        if (complexity === 'low' || complexity === 'medium' || complexity === 'high') {
          currentTask.complexity = complexity
        }
      }
      
      // Files field
      const filesValue = getFieldValue(trimmed, 'Files')
      if (filesValue) {
        currentTask.files = filesValue.split(',').map(f => f.trim()).filter(Boolean)
      }
      
      // Description field
      const descValue = getFieldValue(trimmed, 'Description')
      if (descValue) {
        currentTask.description = descValue
      }
    }
  }

  // Don't forget the last task
  if (currentTask) {
    tasks.push(currentTask)
  }

  return {
    vision,
    successCriteria,
    tasks,
  }
}
