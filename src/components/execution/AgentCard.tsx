'use client'

import { useEffect, useState } from 'react'
import type { RunningAgent } from '@/hooks/useAgents'

interface AgentCardProps {
  agent: RunningAgent | null
  slotIndex: number
}

function formatDuration(startedAt: string): string {
  const started = new Date(startedAt).getTime()
  const now = Date.now()
  const diffMs = now - started
  
  const seconds = Math.floor(diffMs / 1000) % 60
  const minutes = Math.floor(diffMs / 60000) % 60
  const hours = Math.floor(diffMs / 3600000)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

export function AgentCard({ agent, slotIndex }: AgentCardProps) {
  const [duration, setDuration] = useState<string>('')

  // Update duration every second when agent is running
  useEffect(() => {
    if (!agent) {
      setDuration('')
      return
    }

    setDuration(formatDuration(agent.started))
    
    const interval = setInterval(() => {
      setDuration(formatDuration(agent.started))
    }, 1000)

    return () => clearInterval(interval)
  }, [agent?.started])

  if (!agent) {
    // Empty slot
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all duration-300">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
            Slot {slotIndex + 1}
          </span>
        </div>
        <div className="text-center py-6">
          <div className="text-gray-400 dark:text-gray-500 text-sm">Available</div>
        </div>
      </div>
    )
  }

  const isOpus = agent.model === 'opus'
  const modelBadgeClass = isOpus
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Header with status indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Pulsing status indicator */}
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Slot {slotIndex + 1}
          </span>
        </div>
        {/* Model badge */}
        <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${modelBadgeClass}`}>
          {agent.model}
        </span>
      </div>

      {/* Task info */}
      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Task
          </div>
          <div className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate" title={agent.taskId}>
            {agent.taskId}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Project
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 truncate" title={agent.project}>
            {agent.project}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Duration
          </div>
          <div className="text-sm font-mono text-gray-800 dark:text-gray-200">
            {duration}
          </div>
        </div>
      </div>
    </div>
  )
}
