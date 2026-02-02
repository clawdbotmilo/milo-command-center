'use client'

import { useMemo } from 'react'
import { parsePlan } from '@/lib/plan-parser'
import type { Task } from '@/types/project'

interface TaskListProps {
  content: string
  className?: string
}

interface TaskCardProps {
  task: Task
}

function TaskCard({ task }: TaskCardProps) {
  const modelColor = task.model === 'opus' 
    ? 'from-purple-500 to-purple-600' 
    : 'from-blue-500 to-indigo-600'

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${modelColor}`} />
      <span className="font-mono text-xs font-bold text-gray-600">{task.id}</span>
      <span className="text-sm text-gray-800 truncate">{task.name}</span>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r ${modelColor} text-white`}>
        {task.model}
      </span>
    </div>
  )
}

export function TaskList({ content, className = '' }: TaskListProps) {
  const { plan, errors } = useMemo(() => parsePlan(content), [content])
  const tasks = plan?.tasks ?? []

  if (tasks.length === 0 && errors.length === 0) {
    return null // Hide completely when empty
  }

  return (
    <div className={className}>
      {tasks.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</span>
            <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {tasks.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      )}

      {errors.length > 0 && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs text-amber-700 flex items-center gap-1">
            <span>⚠️</span>
            <span>{errors.length} parse warning{errors.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}
