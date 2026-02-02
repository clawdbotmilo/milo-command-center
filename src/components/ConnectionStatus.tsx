'use client'

import { useConnectionStatus } from '@/context/ProjectContext'
import type { ConnectionStatus as ConnectionStatusType } from '@/hooks/useEvents'

interface ConnectionStatusProps {
  className?: string
}

const statusConfig: Record<ConnectionStatusType, { 
  color: string
  label: string 
  animate: boolean
}> = {
  connecting: {
    color: 'bg-yellow-500',
    label: 'Connecting...',
    animate: true,
  },
  connected: {
    color: 'bg-green-500',
    label: 'Live',
    animate: false,
  },
  disconnected: {
    color: 'bg-gray-500',
    label: 'Disconnected',
    animate: false,
  },
  error: {
    color: 'bg-red-500',
    label: 'Error',
    animate: false,
  },
  polling: {
    color: 'bg-blue-500',
    label: 'Polling',
    animate: true,
  },
}

/**
 * Visual indicator showing the real-time connection status
 */
export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const status = useConnectionStatus()
  const config = statusConfig[status]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div
          className={`w-2.5 h-2.5 rounded-full ${config.color}`}
        />
        {config.animate && (
          <div
            className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping opacity-75`}
          />
        )}
      </div>
      <span className="text-xs text-gray-500">{config.label}</span>
    </div>
  )
}

/**
 * Compact dot-only indicator
 */
export function ConnectionDot({ className = '' }: ConnectionStatusProps) {
  const status = useConnectionStatus()
  const config = statusConfig[status]

  return (
    <div className={`relative ${className}`} title={config.label}>
      <div
        className={`w-2 h-2 rounded-full ${config.color}`}
      />
      {config.animate && (
        <div
          className={`absolute inset-0 w-2 h-2 rounded-full ${config.color} animate-ping opacity-75`}
        />
      )}
    </div>
  )
}
