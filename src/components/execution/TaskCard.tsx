'use client'

import type { TaskStatus } from '@/types/project'
import type { TaskWithMeta } from '@/hooks/useTasks'

interface TaskCardProps {
  task: TaskWithMeta
  compact?: boolean
}

const statusConfig: Record<
  TaskStatus,
  { bg: string; text: string; border: string; icon: string; label: string }
> = {
  DONE: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
    icon: '✓',
    label: 'Done',
  },
  RUNNING: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
    icon: '●',
    label: 'Running',
  },
  QUEUED: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    icon: '○',
    label: 'Queued',
  },
  PENDING: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    icon: '○',
    label: 'Pending',
  },
  FAILED: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: '✗',
    label: 'Failed',
  },
  BLOCKED: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: '⊘',
    label: 'Blocked',
  },
}

const modelConfig = {
  sonnet: { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Sonnet' },
  opus: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Opus' },
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function Checkmark() {
  return (
    <svg
      className="h-4 w-4 animate-[scale-bounce_0.3s_ease-out]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'RUNNING') {
    return <Spinner />
  }
  if (status === 'DONE') {
    return <Checkmark />
  }
  return <span className="text-sm">{statusConfig[status].icon}</span>
}

export function TaskCard({ task, compact = false }: TaskCardProps) {
  const status = statusConfig[task.status]
  const model = modelConfig[task.model]
  const isDone = task.status === 'DONE'
  const isRunning = task.status === 'RUNNING'

  return (
    <div
      className={`
        relative rounded-lg border transition-all duration-200
        ${status.border} ${status.bg}
        ${isDone ? 'opacity-70 hover:opacity-100' : ''}
        ${isRunning ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Task ID and Name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Task ID Badge */}
          <span
            className={`
              shrink-0 font-mono text-xs font-bold px-2 py-1 rounded
              ${status.bg} ${status.text} border ${status.border}
            `}
          >
            {task.id}
          </span>

          {/* Task Name */}
          <span
            className={`
              font-medium truncate
              ${isDone ? 'text-gray-400 line-through decoration-green-500/50' : 'text-gray-100'}
            `}
          >
            {task.name}
          </span>
        </div>

        {/* Right: Model and Status badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Model Badge */}
          <span
            className={`
              text-xs font-medium px-2 py-0.5 rounded
              ${model.bg} ${model.text}
            `}
          >
            {model.label}
          </span>

          {/* Status Badge */}
          <span
            className={`
              flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded
              ${status.bg} ${status.text}
            `}
          >
            <StatusIcon status={task.status} />
            <span>{status.label}</span>
          </span>
        </div>
      </div>

      {/* Dependencies */}
      {task.dependencies.length > 0 && !compact && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <span className="text-xs text-gray-500">
            Needs:{' '}
            <span className="text-gray-400">
              {task.dependencies.join(', ')}
            </span>
          </span>
        </div>
      )}

      {/* Compact dependencies */}
      {task.dependencies.length > 0 && compact && (
        <div className="mt-2 text-xs text-gray-500">
          → {task.dependencies.join(', ')}
        </div>
      )}

      {/* Running indicator pulse */}
      {isRunning && (
        <div className="absolute -top-1 -right-1 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
        </div>
      )}
    </div>
  )
}

export default TaskCard
