'use client'

import { useMemo } from 'react'

interface RecentTask {
  id: string
  name: string
  completedAt: string
}

interface ProgressPanelProps {
  totalTasks: number
  completedTasks: number
  recentlyCompleted: RecentTask[]
}

/**
 * Format a timestamp as relative time (e.g., "2m ago", "1h ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  
  if (isNaN(then)) return 'just now'
  
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function ProgressPanel({ 
  totalTasks, 
  completedTasks, 
  recentlyCompleted 
}: ProgressPanelProps) {
  const percentage = useMemo(() => {
    if (totalTasks === 0) return 0
    return Math.round((completedTasks / totalTasks) * 100)
  }, [totalTasks, completedTasks])

  // Sort recently completed by timestamp (most recent first)
  const sortedRecent = useMemo(() => {
    return [...recentlyCompleted].sort((a, b) => {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    })
  }, [recentlyCompleted])

  return (
    <div className="bg-milo-card border border-milo-border rounded-xl p-6">
      {/* Header */}
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <span>📊</span> Progress
      </h2>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-6 bg-milo-dark rounded-full overflow-hidden border border-milo-border">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-2xl font-bold text-green-400 min-w-[4rem] text-right">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Task Count */}
      <p className="text-gray-400 text-sm mb-6">
        {completedTasks} of {totalTasks} tasks complete
      </p>

      {/* Recently Completed */}
      {sortedRecent.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Recently Completed:
          </h3>
          <div className="space-y-2">
            {sortedRecent.map((task) => (
              <div 
                key={task.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-green-500">✓</span>
                <span className="text-gray-300 font-medium">
                  {task.id}
                </span>
                <span className="text-gray-500">-</span>
                <span className="text-gray-400 truncate flex-1">
                  {task.name}
                </span>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  ({formatRelativeTime(task.completedAt)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalTasks === 0 && (
        <p className="text-gray-500 text-center py-4">
          No tasks in this project yet
        </p>
      )}
    </div>
  )
}

export default ProgressPanel
