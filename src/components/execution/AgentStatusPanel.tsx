'use client'

import { useAgents } from '@/hooks/useAgents'
import { AgentCard } from './AgentCard'

const TOTAL_SLOTS = 3

export function AgentStatusPanel() {
  const { agents, availableSlots, isLoading, isError, refresh } = useAgents()

  // Build slots array: fill with agents first, then null for empty slots
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => agents[i] ?? null)

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-red-800 dark:text-red-400 font-medium">
              Failed to load agent status
            </h3>
            <p className="text-red-600 dark:text-red-500 text-sm mt-1">
              Unable to fetch agent data from the API
            </p>
          </div>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Agent Status
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {agents.length} running · {availableSlots} available
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && agents.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Agent cards grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slots.map((agent, i) => (
            <AgentCard key={i} agent={agent} slotIndex={i} />
          ))}
        </div>
      )}
    </div>
  )
}
