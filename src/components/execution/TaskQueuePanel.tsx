'use client'

import { useState } from 'react'
import { useTasks, type TaskWithMeta } from '@/hooks/useTasks'
import { TaskCard } from './TaskCard'
import type { TaskStatus } from '@/types/project'

interface TaskQueuePanelProps {
  projectName: string
  refreshInterval?: number
}

interface TaskGroupProps {
  status: TaskStatus
  tasks: TaskWithMeta[]
  label: string
  emptyMessage?: string
}

const statusOrder: TaskStatus[] = ['RUNNING', 'QUEUED', 'PENDING', 'BLOCKED', 'FAILED', 'DONE']

const statusLabels: Record<TaskStatus, string> = {
  RUNNING: '🔄 Running',
  QUEUED: '📋 Queued',
  PENDING: '⏳ Pending',
  BLOCKED: '🚫 Blocked',
  FAILED: '❌ Failed',
  DONE: '✅ Completed',
}

const statusColors: Record<TaskStatus, string> = {
  RUNNING: 'text-blue-400',
  QUEUED: 'text-yellow-400',
  PENDING: 'text-gray-400',
  BLOCKED: 'text-orange-400',
  FAILED: 'text-red-400',
  DONE: 'text-green-400',
}

function TaskGroup({ status, tasks, label }: TaskGroupProps) {
  if (tasks.length === 0) return null

  const isRunning = status === 'RUNNING'
  const isDone = status === 'DONE'

  return (
    <div className={`space-y-2 ${isDone ? 'opacity-80' : ''}`}>
      {/* Group Header */}
      <div className="flex items-center gap-2">
        <h3 className={`text-sm font-semibold ${statusColors[status]}`}>
          {label}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
        {isRunning && (
          <span className="flex items-center gap-1 text-xs text-blue-400 animate-pulse">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            Active
          </span>
        )}
      </div>

      {/* Tasks */}
      <div className={`space-y-2 ${isDone ? 'pl-2 border-l-2 border-green-500/20' : ''}`}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} compact={isDone} />
        ))}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 w-24 bg-gray-700 rounded mb-2" />
          <div className="h-16 bg-gray-800 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-500">
      <div className="text-4xl mb-3">📋</div>
      <p className="font-medium">No tasks yet</p>
      <p className="text-sm mt-1">Tasks will appear here once the project has a plan</p>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="text-red-400 font-medium">Failed to load tasks</p>
      <p className="text-sm text-gray-500 mt-1">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}

function ProgressBar({ tasksByStatus }: { tasksByStatus: Record<TaskStatus, TaskWithMeta[]> }) {
  const total = Object.values(tasksByStatus).flat().length
  if (total === 0) return null

  const done = tasksByStatus.DONE.length
  const running = tasksByStatus.RUNNING.length
  const failed = tasksByStatus.FAILED.length
  const percentage = Math.round((done / total) * 100)

  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">
          Progress: <span className="text-gray-200 font-medium">{done}/{total} tasks</span>
        </span>
        <span className="text-gray-400">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
        {/* Done portion */}
        {done > 0 && (
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${(done / total) * 100}%` }}
          />
        )}
        {/* Running portion */}
        {running > 0 && (
          <div
            className="h-full bg-blue-500 animate-pulse transition-all duration-500"
            style={{ width: `${(running / total) * 100}%` }}
          />
        )}
        {/* Failed portion */}
        {failed > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${(failed / total) * 100}%` }}
          />
        )}
      </div>
      {running > 0 && (
        <p className="text-xs text-blue-400 mt-1 animate-pulse">
          {running} task{running > 1 ? 's' : ''} running...
        </p>
      )}
    </div>
  )
}

export function TaskQueuePanel({ projectName, refreshInterval = 5000 }: TaskQueuePanelProps) {
  const { tasks, tasksByStatus, isLoading, error, refetch } = useTasks(projectName)
  const [isDispatching, setIsDispatching] = useState(false)
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null)

  const handleTick = async () => {
    setIsDispatching(true)
    setDispatchMessage(null)
    try {
      const res = await fetch('/api/orchestration/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectName }),
      })
      const data = await res.json()
      if (!data.success) {
        setDispatchMessage(`❌ ${data.message || data.error}`)
      } else {
        const parts = []
        if (data.tasksStarted?.length) parts.push(`Started: ${data.tasksStarted.join(', ')}`)
        if (data.tasksCompleted?.length) parts.push(`Completed: ${data.tasksCompleted.join(', ')}`)
        if (data.tasksFailed?.length) parts.push(`Failed: ${data.tasksFailed.join(', ')}`)
        if (data.projectCompleted) parts.push('🎉 Project Complete!')
        setDispatchMessage(parts.length ? `✅ ${parts.join(' | ')}` : `✅ ${data.message}`)
        refetch()
      }
    } catch (err) {
      setDispatchMessage('❌ Failed to run tick')
    } finally {
      setIsDispatching(false)
      setTimeout(() => setDispatchMessage(null), 8000)
    }
  }

  // Auto-refresh when there are running tasks
  const hasRunningTasks = tasksByStatus.RUNNING.length > 0

  // Set up polling when tasks are running
  if (typeof window !== 'undefined' && hasRunningTasks) {
    setTimeout(() => {
      refetch()
    }, refreshInterval)
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Task Queue</h2>
        <LoadingState />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Task Queue</h2>
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Task Queue</h2>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">Task Queue</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTick}
            disabled={isDispatching}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isDispatching ? 'Running...' : '⚡ Execute'}
          </button>
          <button
            onClick={() => refetch()}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            title="Refresh"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
      {dispatchMessage && (
        <div className={`mb-4 p-2 rounded-lg text-sm ${dispatchMessage.startsWith('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {dispatchMessage}
        </div>
      )}

      <ProgressBar tasksByStatus={tasksByStatus} />

      <div className="space-y-6">
        {statusOrder.map((status) => (
          <TaskGroup
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            label={statusLabels[status]}
          />
        ))}
      </div>
    </div>
  )
}

export default TaskQueuePanel
