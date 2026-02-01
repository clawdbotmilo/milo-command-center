import type { Plan, Task } from '@/types/project'

export interface ParseResult {
  plan: Plan | null
  errors: string[]
}

/**
 * Parse a PROJECT-PLAN.md markdown file to extract tasks, dependencies, and metadata.
 */
export function parsePlan(markdown: string): ParseResult {
  const errors: string[] = []
  
  // Extract vision
  const vision = extractVision(markdown)
  if (!vision) {
    errors.push('Missing or empty ## Vision section')
  }
  
  // Extract success criteria
  const successCriteria = extractSuccessCriteria(markdown)
  if (successCriteria.length === 0) {
    errors.push('Missing or empty ## Success Criteria section')
  }
  
  // Extract tasks
  const { tasks, taskErrors } = extractTasks(markdown)
  errors.push(...taskErrors)
  
  if (tasks.length === 0) {
    errors.push('No tasks found in plan')
  }
  
  // Return null plan if critical errors
  if (!vision || tasks.length === 0) {
    return { plan: null, errors }
  }
  
  return {
    plan: {
      vision,
      successCriteria,
      tasks,
    },
    errors,
  }
}

/**
 * Extract the vision statement from the markdown.
 */
function extractVision(markdown: string): string | null {
  const visionMatch = markdown.match(/^## Vision\s*\n([\s\S]*?)(?=^## |$)/m)
  if (!visionMatch) return null
  
  const content = visionMatch[1].trim()
  return content || null
}

/**
 * Extract success criteria checkboxes.
 */
function extractSuccessCriteria(markdown: string): string[] {
  const sectionMatch = markdown.match(/^## Success Criteria\s*\n([\s\S]*?)(?=\n## )/m)
  if (!sectionMatch) {
    // Try matching to end of document
    const endMatch = markdown.match(/^## Success Criteria\s*\n([\s\S]*)$/m)
    if (!endMatch) return []
    return parseCheckboxes(endMatch[1])
  }
  
  return parseCheckboxes(sectionMatch[1])
}

/**
 * Parse checkbox items from a section.
 */
function parseCheckboxes(section: string): string[] {
  const criteria: string[] = []
  
  // Match checkbox items: - [ ] or - [x]
  const checkboxRegex = /^[-*]\s*\[[ x]\]\s*(.+)$/gm
  let match
  while ((match = checkboxRegex.exec(section)) !== null) {
    criteria.push(match[1].trim())
  }
  
  return criteria
}

/**
 * Extract all tasks from the markdown.
 */
function extractTasks(markdown: string): { tasks: Task[]; taskErrors: string[] } {
  const tasks: Task[] = []
  const taskErrors: string[] = []
  
  // Split by task headers
  const taskHeaderRegex = /^### Task \d+:\s*(.+)$/gm
  const headers: { name: string; index: number }[] = []
  let match
  
  while ((match = taskHeaderRegex.exec(markdown)) !== null) {
    headers.push({ name: match[1].trim(), index: match.index + match[0].length })
  }
  
  // Extract each task's body
  for (let i = 0; i < headers.length; i++) {
    const startIndex = headers[i].index
    const endIndex = i + 1 < headers.length 
      ? markdown.lastIndexOf('\n### Task', headers[i + 1].index)
      : markdown.length
    
    const taskBody = markdown.slice(startIndex, endIndex)
    const taskName = headers[i].name
    
    const { task, errors } = parseTaskSection(taskName, taskBody)
    if (task) {
      tasks.push(task)
    }
    taskErrors.push(...errors)
  }
  
  return { tasks, taskErrors }
}

/**
 * Parse a single task section.
 */
function parseTaskSection(name: string, body: string): { task: Task | null; errors: string[] } {
  const errors: string[] = []
  
  // Extract ID
  const idMatch = body.match(/^\s*[-*]\s*\*\*ID:\*\*\s*(\S+)/m)
  const id = idMatch ? idMatch[1].trim() : null
  if (!id) {
    errors.push(`Task "${name}": Missing ID field`)
    return { task: null, errors }
  }
  
  // Extract Agent/Model
  const agentMatch = body.match(/^\s*[-*]\s*\*\*Agent:\*\*\s*(\S+)/m)
  const agentRaw = agentMatch ? agentMatch[1].trim().toLowerCase() : 'sonnet'
  const model: 'sonnet' | 'opus' = agentRaw === 'opus' ? 'opus' : 'sonnet'
  
  // Extract Dependencies
  const depsMatch = body.match(/^\s*[-*]\s*\*\*Dependencies:\*\*\s*(.+)/m)
  const depsRaw = depsMatch ? depsMatch[1].trim() : 'none'
  const dependencies = parseDependencies(depsRaw)
  
  // Extract Complexity
  const complexityMatch = body.match(/^\s*[-*]\s*\*\*Estimated complexity:\*\*\s*(\S+)/m)
  const complexityRaw = complexityMatch ? complexityMatch[1].trim().toLowerCase() : 'medium'
  const complexity = parseComplexity(complexityRaw)
  
  // Extract Description
  const descMatch = body.match(/^\s*[-*]\s*\*\*Description:\*\*\s*([\s\S]*?)(?=^\s*[-*]\s*\*\*|\Z)/m)
  const description = descMatch ? descMatch[1].trim() : ''
  if (!description) {
    errors.push(`Task ${id}: Missing description`)
  }
  
  // Extract Files
  const files = extractFiles(body)
  
  // Extract Completion Criteria
  const completionCriteria = extractCompletionCriteria(body)
  if (completionCriteria.length === 0) {
    errors.push(`Task ${id}: Missing completion criteria`)
  }
  
  return {
    task: {
      id,
      name,
      description,
      model,
      dependencies,
      complexity,
      status: 'PENDING',
      completionCriteria,
      files,
    },
    errors,
  }
}

/**
 * Parse dependencies string into array of task IDs.
 */
function parseDependencies(raw: string): string[] {
  if (!raw || raw.toLowerCase() === 'none') {
    return []
  }
  
  // Handle formats like "T1", "T1, T2", "T1 and T2", "T1 + T2"
  const deps = raw
    .split(/[,&+]|\band\b/i)
    .map(d => d.trim())
    .filter(d => /^T\d+$/i.test(d))
    .map(d => d.toUpperCase())
  
  return deps
}

/**
 * Parse complexity string.
 */
function parseComplexity(raw: string): 'low' | 'medium' | 'high' {
  const normalized = raw.toLowerCase()
  if (normalized === 'low') return 'low'
  if (normalized === 'high') return 'high'
  return 'medium'
}

/**
 * Extract files to create/modify.
 */
function extractFiles(body: string): string[] {
  // Find the start of "Files to create/modify" section
  const startIdx = body.search(/[-*]\s*\*\*Files to create\/modify:\*\*/)
  if (startIdx === -1) return []
  
  // Find the end (next top-level bullet with bold or end of body)
  const afterStart = body.slice(startIdx)
  const endMatch = afterStart.match(/\n[-*]\s*\*\*(?!Files)/)
  const filesSection = endMatch 
    ? afterStart.slice(0, endMatch.index) 
    : afterStart
  
  const files: string[] = []
  
  // Match file paths in backticks
  const fileLineRegex = /`([^`]+)`/g
  let match
  while ((match = fileLineRegex.exec(filesSection)) !== null) {
    const file = match[1]
    if (file && (file.includes('/') || file.includes('.'))) {
      files.push(file)
    }
  }
  
  return files
}

/**
 * Extract completion criteria checkboxes.
 */
function extractCompletionCriteria(body: string): string[] {
  // Find the start of "Completion Criteria" section
  const startIdx = body.search(/[-*]\s*\*\*Completion Criteria:\*\*/)
  if (startIdx === -1) return []
  
  // Get everything after that header (completion criteria is typically last in a task)
  const section = body.slice(startIdx)
  
  const criteria: string[] = []
  
  // Match checkbox items with any indentation
  const checkboxRegex = /[-*]\s*\[[ x]\]\s*(.+)/g
  let match
  while ((match = checkboxRegex.exec(section)) !== null) {
    criteria.push(match[1].trim())
  }
  
  return criteria
}
