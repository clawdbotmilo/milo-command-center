import type { Plan, Task } from '@/types/project'

export interface ParseResult {
  plan: Plan | null
  errors: string[]
}

/**
 * Parse a PROJECT-PLAN.md markdown file to extract tasks, dependencies, and metadata.
 * Supports both formats:
 * - ### [T1] Task Name (model)
 * - ### Task 1: Task Name with **ID:** T1
 */
export function parsePlan(markdown: string): ParseResult {
  const errors: string[] = []
  
  // Extract vision/overview
  const vision = extractVision(markdown) || extractOverview(markdown)
  
  // Extract success criteria / completion criteria
  const successCriteria = extractSuccessCriteria(markdown) || extractCompletionCriteriaSection(markdown)
  
  // Extract tasks (try both formats)
  const { tasks, taskErrors } = extractTasks(markdown)
  errors.push(...taskErrors)
  
  if (tasks.length === 0) {
    errors.push('No tasks found in plan')
  }
  
  // Return null plan only if no tasks at all
  if (tasks.length === 0) {
    return { plan: null, errors }
  }
  
  return {
    plan: {
      vision: vision || 'No vision specified',
      successCriteria,
      tasks,
    },
    errors,
  }
}

/**
 * Extract the vision statement.
 */
function extractVision(markdown: string): string | null {
  const visionMatch = markdown.match(/^## Vision\s*\n([\s\S]*?)(?=^## |$)/m)
  if (!visionMatch) return null
  return visionMatch[1].trim() || null
}

/**
 * Extract overview section (alternative to vision).
 */
function extractOverview(markdown: string): string | null {
  const match = markdown.match(/^## Overview\s*\n([\s\S]*?)(?=^## |$)/m)
  if (!match) return null
  return match[1].trim() || null
}

/**
 * Extract success criteria checkboxes.
 */
function extractSuccessCriteria(markdown: string): string[] {
  const sectionMatch = markdown.match(/^## Success Criteria\s*\n([\s\S]*?)(?=\n## |$)/m)
  if (!sectionMatch) return []
  return parseCheckboxes(sectionMatch[1])
}

/**
 * Extract completion criteria section.
 */
function extractCompletionCriteriaSection(markdown: string): string[] {
  const sectionMatch = markdown.match(/^## Completion Criteria\s*\n([\s\S]*?)(?=\n## |$)/m)
  if (!sectionMatch) return []
  
  // Parse bullet points
  const bullets: string[] = []
  const bulletRegex = /^[-*]\s+(.+)$/gm
  let match
  while ((match = bulletRegex.exec(sectionMatch[1])) !== null) {
    bullets.push(match[1].trim())
  }
  return bullets
}

/**
 * Parse checkbox items from a section.
 */
function parseCheckboxes(section: string): string[] {
  const criteria: string[] = []
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
  
  // Try new format first: ### [T1] Task Name (model)
  const newFormatRegex = /^### \[([^\]]+)\]\s+(.+?)\s*\((\w+)\)\s*$/gm
  let match
  const taskSections: { id: string; name: string; model: string; startIndex: number }[] = []
  
  while ((match = newFormatRegex.exec(markdown)) !== null) {
    taskSections.push({
      id: match[1].trim(),
      name: match[2].trim(),
      model: match[3].trim().toLowerCase(),
      startIndex: match.index + match[0].length,
    })
  }
  
  // If no new format tasks found, try old format: ### Task 1: Name
  if (taskSections.length === 0) {
    const oldFormatRegex = /^### Task \d+:\s*(.+)$/gm
    while ((match = oldFormatRegex.exec(markdown)) !== null) {
      taskSections.push({
        id: '',  // Will be extracted from body
        name: match[1].trim(),
        model: '',  // Will be extracted from body
        startIndex: match.index + match[0].length,
      })
    }
  }
  
  // Parse dependencies section for dependency mapping
  const depsMap = parseDependenciesSection(markdown)
  
  // Extract each task's body
  for (let i = 0; i < taskSections.length; i++) {
    const startIndex = taskSections[i].startIndex
    const endIndex = i + 1 < taskSections.length 
      ? markdown.lastIndexOf('\n###', taskSections[i + 1].startIndex)
      : markdown.indexOf('\n## Dependencies') !== -1 
        ? markdown.indexOf('\n## Dependencies')
        : markdown.indexOf('\n## Completion') !== -1
          ? markdown.indexOf('\n## Completion')
          : markdown.length
    
    const taskBody = markdown.slice(startIndex, endIndex)
    const section = taskSections[i]
    
    const { task, errors } = parseTaskSection(section, taskBody, depsMap)
    if (task) {
      tasks.push(task)
    }
    taskErrors.push(...errors)
  }
  
  return { tasks, taskErrors }
}

/**
 * Parse dependencies section into a map.
 */
function parseDependenciesSection(markdown: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const sectionMatch = markdown.match(/^## Dependencies\s*\n([\s\S]*?)(?=\n## |$)/m)
  if (!sectionMatch) return map
  
  // Parse lines like "- T2 depends on T1" or "T2 depends on T1, T3"
  const lines = sectionMatch[1].split('\n')
  for (const line of lines) {
    const depMatch = line.match(/[-*]?\s*(T\d+)\s+depends on\s+(.+)/i)
    if (depMatch) {
      const taskId = depMatch[1].toUpperCase()
      const deps = depMatch[2]
        .split(/[,&]|\band\b/i)
        .map(d => d.trim())
        .filter(d => /^T\d+$/i.test(d))
        .map(d => d.toUpperCase())
      map.set(taskId, deps)
    }
  }
  
  return map
}

/**
 * Parse a single task section.
 */
function parseTaskSection(
  header: { id: string; name: string; model: string },
  body: string,
  depsMap: Map<string, string[]>
): { task: Task | null; errors: string[] } {
  const errors: string[] = []
  
  // Get ID (from header or body)
  let id: string = header.id
  if (!id) {
    const idMatch = body.match(/^\s*[-*]\s*\*\*ID:\*\*\s*(\S+)/m)
    id = idMatch ? idMatch[1].trim() : ''
  }
  if (!id) {
    errors.push(`Task "${header.name}": Missing ID`)
    return { task: null, errors }
  }
  
  // Get model (from header or body)
  let model: 'sonnet' | 'opus' = header.model === 'opus' ? 'opus' : 'sonnet'
  if (!header.model) {
    const agentMatch = body.match(/^\s*[-*]\s*\*\*Agent:\*\*\s*(\S+)/m)
    if (agentMatch) {
      model = agentMatch[1].trim().toLowerCase() === 'opus' ? 'opus' : 'sonnet'
    }
  }
  
  // Get dependencies (from section map or body)
  let dependencies = depsMap.get(id.toUpperCase()) || []
  if (dependencies.length === 0) {
    const depsMatch = body.match(/^\s*[-*]\s*\*\*Dependencies:\*\*\s*(.+)/m)
    if (depsMatch) {
      const depsRaw = depsMatch[1].trim()
      if (depsRaw.toLowerCase() !== 'none') {
        dependencies = depsRaw
          .split(/[,&+]|\band\b/i)
          .map(d => d.trim())
          .filter(d => /^T\d+$/i.test(d))
          .map(d => d.toUpperCase())
      }
    }
  }
  
  // Get description
  const descMatch = body.match(/^\s*[-*]\s*\*\*Description:\*\*\s*(.+)/m)
  const description = descMatch ? descMatch[1].trim() : ''
  
  // Get files
  const files = extractFiles(body)
  
  // Get criteria
  const criteriaMatch = body.match(/^\s*[-*]\s*\*\*Criteria:\*\*\s*(.+)/m)
  const completionCriteria = criteriaMatch 
    ? [criteriaMatch[1].trim()]
    : extractCompletionCriteria(body)
  
  // Get complexity
  const complexityMatch = body.match(/^\s*[-*]\s*\*\*(?:Estimated )?complexity:\*\*\s*(\S+)/mi)
  const complexity = complexityMatch 
    ? parseComplexity(complexityMatch[1]) 
    : 'medium'
  
  return {
    task: {
      id: id.toUpperCase(),
      name: header.name,
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
  const files: string[] = []
  
  // Check for Files section
  const filesMatch = body.match(/^\s*[-*]\s*\*\*Files:\*\*\s*(.+)/m)
  if (filesMatch) {
    // Extract file paths in backticks on same line
    const fileRegex = /`([^`]+)`/g
    let match
    while ((match = fileRegex.exec(filesMatch[1])) !== null) {
      if (match[1].includes('/') || match[1].includes('.')) {
        files.push(match[1])
      }
    }
  }
  
  // Also check for "Files to create/modify" section
  const startIdx = body.search(/[-*]\s*\*\*Files to create\/modify:\*\*/i)
  if (startIdx !== -1) {
    const afterStart = body.slice(startIdx)
    const endMatch = afterStart.match(/\n[-*]\s*\*\*(?!Files)/)
    const filesSection = endMatch ? afterStart.slice(0, endMatch.index) : afterStart
    
    const fileLineRegex = /`([^`]+)`/g
    let match
    while ((match = fileLineRegex.exec(filesSection)) !== null) {
      const file = match[1]
      if (file && (file.includes('/') || file.includes('.')) && !files.includes(file)) {
        files.push(file)
      }
    }
  }
  
  return files
}

/**
 * Extract completion criteria checkboxes.
 */
function extractCompletionCriteria(body: string): string[] {
  const startIdx = body.search(/[-*]\s*\*\*Completion Criteria:\*\*/i)
  if (startIdx === -1) return []
  
  const section = body.slice(startIdx)
  const criteria: string[] = []
  
  const checkboxRegex = /[-*]\s*\[[ x]\]\s*(.+)/g
  let match
  while ((match = checkboxRegex.exec(section)) !== null) {
    criteria.push(match[1].trim())
  }
  
  return criteria
}
