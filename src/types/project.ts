export type ProjectStatus = 'DRAFT' | 'FINALIZED' | 'EXECUTING' | 'COMPLETED'
export type TaskStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'BLOCKED'

export interface Task {
  id: string
  name: string
  description: string
  model: 'sonnet' | 'opus'
  dependencies: string[]
  complexity: 'low' | 'medium' | 'high'
  status: TaskStatus
  completionCriteria: string[]
  files: string[]
}

export interface Plan {
  vision: string
  successCriteria: string[]
  tasks: Task[]
}

export interface Project {
  name: string
  status: ProjectStatus
  plan: Plan | null
  created: string
  updated: string
}
