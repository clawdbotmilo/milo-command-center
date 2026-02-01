'use client'

import { useMemo } from 'react'
import { parsePlan } from '@/lib/plan-parser'
import type { Task } from '@/types/project'

interface TaskListProps {
  content: string
  className?: string
}

interface TaskChipProps {
  task: Task
  allTasks: Task[]
}

function TaskChip({ task, allTasks }: TaskChipProps) {
  // Find dependency names
  const depNames = task.dependencies.map(depId => {
    const depTask = allTasks.find(t => t.id === depId)
    return depTask ? depTask.id : depId
  })

  const modelColor = task.model === 'opus' 
    ? 'bg-purple-100 text-purple-700 border-purple-300' 
    : 'bg-blue-100 text-blue-700 border-blue-300'

  return (
    <div className="inline-flex items-center gap-1 text-sm">
      <span className="font-mono font-medium text-gray-900">[{task.id}]</span>
      <span className="text-gray-700 truncate max-w-[150px]" title={task.name}>
        {task.name}
      </span>
      <span className={`text-xs px-1.5 py-0.5 rounded border ${modelColor}`}>
        {task.model}
      </span>
      {depNames.length > 0 && (
        <span className="text-gray-400 text-xs">
          ← {depNames.join(', ')}
        </span>
      )}
    </div>
  )
}

function TaskFlow({ tasks }: { tasks: Task[] }) {
  // Group tasks by their dependency depth
  const tasksByLevel = useMemo(() => {
    const levels: Task[][] = []
    const assigned = new Set<string>()

    // First, find all tasks with no dependencies (level 0)
    const level0 = tasks.filter(t => t.dependencies.length === 0)
    if (level0.length > 0) {
      levels.push(level0)
      level0.forEach(t => assigned.add(t.id))
    }

    // Then iteratively find tasks whose dependencies are all assigned
    let maxIterations = tasks.length
    while (assigned.size < tasks.length && maxIterations-- > 0) {
      const nextLevel = tasks.filter(
        t => !assigned.has(t.id) && t.dependencies.every(d => assigned.has(d))
      )
      if (nextLevel.length === 0) break
      levels.push(nextLevel)
      nextLevel.forEach(t => assigned.add(t.id))
    }

    // Add any remaining tasks (circular deps or missing deps)
    const remaining = tasks.filter(t => !assigned.has(t.id))
    if (remaining.length > 0) {
      levels.push(remaining)
    }

    return levels
  }, [tasks])

  if (tasksByLevel.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tasksByLevel.map((levelTasks, levelIndex) => (
        <div key={levelIndex} className="flex items-center gap-2">
          {levelIndex > 0 && (
            <span className="text-gray-400 mx-1">→</span>
          )}
          <div className="flex flex-wrap gap-2">
            {levelTasks.map(task => (
              <TaskChip key={task.id} task={task} allTasks={tasks} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TaskList({ content, className = '' }: TaskListProps) {
  const { plan, errors } = useMemo(() => parsePlan(content), [content])

  const tasks = plan?.tasks ?? []

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Extracted Tasks</h3>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-500">
            ({tasks.length} task{tasks.length !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-sm text-gray-500 italic">
          No tasks found. Add tasks using the format:
          <code className="block mt-2 bg-gray-100 p-2 rounded text-xs font-mono not-italic">
            {`### Task 1: Task Name\n- **ID:** T1\n- **Agent:** sonnet\n- **Dependencies:** none\n- **Description:** What this task does...`}
          </code>
        </div>
      ) : (
        <TaskFlow tasks={tasks} />
      )}

      {errors.length > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-xs font-medium text-yellow-800 mb-1">Parse Warnings:</div>
          <ul className="text-xs text-yellow-700 space-y-1">
            {errors.slice(0, 5).map((error, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-yellow-500">⚠</span>
                {error}
              </li>
            ))}
            {errors.length > 5 && (
              <li className="text-yellow-600">...and {errors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
