'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import type { TaskStatus } from '@/types/project'
import type { OrchestrationState, TaskState } from '@/types/orchestration'

export interface TaskWithMeta {
  id: string
  name: string
  description?: string
  model: 'sonnet' | 'opus'
  status: TaskStatus
  dependencies: string[]
  attempts: number
  started?: string
  completed?: string
  sessionKey?: string
  outputs?: string[]
}

interface UseTasksResult {
  tasks: TaskWithMeta[]
  tasksByStatus: Record<TaskStatus, TaskWithMeta[]>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<unknown>
  mutate: () => Promise<unknown>
}

interface TasksData {
  tasks: TaskWithMeta[]
}

/**
 * Fetcher that combines orchestration and project data
 */
const fetchTasks = async (projectName: string): Promise<TasksData> => {
  // Fetch orchestration state and project in parallel
  const [orchestrationRes, projectRes] = await Promise.all([
    fetch(`/api/orchestration/${encodeURIComponent(projectName)}`),
    fetch(`/api/projects/${encodeURIComponent(projectName)}`),
  ])

  if (!orchestrationRes.ok) {
    throw new Error('Failed to fetch orchestration state')
  }
  if (!projectRes.ok) {
    throw new Error('Failed to fetch project')
  }

  const orchestrationState: OrchestrationState = await orchestrationRes.json()
  const projectData = await projectRes.json()
  const project = projectData.project // API returns { project: {...} }

  // Build task name map from project plan
  const taskMap = new Map<string, { name: string; dependencies: string[]; description?: string }>()
  if (project?.plan?.tasks) {
    for (const task of project.plan.tasks) {
      taskMap.set(task.id, { name: task.name, dependencies: task.dependencies, description: task.description })
    }
  }

  // Merge task info from both sources
  const tasksArray: TaskWithMeta[] = Object.entries(orchestrationState.tasks || {}).map(
    ([id, state]: [string, TaskState]) => {
      const taskInfo = taskMap.get(id)
      return {
        id,
        name: taskInfo?.name || `Task ${id}`,
        description: taskInfo?.description,
        model: state.model,
        status: state.status,
        dependencies: state.dependencies || taskInfo?.dependencies || [],
        attempts: state.attempts,
        started: state.started,
        completed: state.completed,
        sessionKey: state.sessionKey,
        outputs: state.outputs,
      }
    }
  )

  // Sort by task ID (T1, T2, etc.)
  tasksArray.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0
    return numA - numB
  })

  return { tasks: tasksArray }
}

export function useTasks(projectName: string | null): UseTasksResult {
  const { data, error, isLoading, mutate } = useSWR<TasksData>(
    projectName ? ['tasks', projectName] : null,
    () => fetchTasks(projectName!),
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      refreshInterval: 0, // Rely on SSE for updates
    }
  )

  const tasks = data?.tasks ?? []

  // Group tasks by status (memoized)
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithMeta[]> = {
      RUNNING: [],
      QUEUED: [],
      PENDING: [],
      BLOCKED: [],
      DONE: [],
      FAILED: [],
    }

    for (const task of tasks) {
      grouped[task.status].push(task)
    }

    return grouped
  }, [tasks])

  return {
    tasks,
    tasksByStatus,
    isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    mutate,
  }
}
