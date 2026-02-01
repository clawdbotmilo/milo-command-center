import type { TaskStatus } from './project'

export interface AgentStatus {
  sessionKey: string
  taskId: string
  model: 'sonnet' | 'opus'
  started: string
  status: 'running' | 'completed' | 'failed'
}

export interface OrchestrationState {
  project: string
  status: string
  created: string
  updated: string
  tasks: Record<string, TaskState>
  queue: string[]
  locks: Record<string, LockInfo>
}

export interface TaskState {
  status: TaskStatus
  model: 'sonnet' | 'opus'
  attempts: number
  dependencies: string[]
  started?: string
  completed?: string
  sessionKey?: string
  outputs?: string[]
}

export interface LockInfo {
  holder: string
  expires: string
}
