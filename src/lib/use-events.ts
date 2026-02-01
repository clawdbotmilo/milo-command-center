'use client'

import { useEffect, useState, useCallback } from 'react'

export type EventType = 
  | 'connected'
  | 'plan_updated' 
  | 'orchestration_updated'
  | 'task_status_changed' 
  | 'agent_started' 
  | 'agent_completed'
  | 'project_created'

export interface SSEEvent {
  type: EventType
  project?: string
  data?: Record<string, unknown>
  timestamp: string
}

interface UseEventsOptions {
  onEvent?: (event: SSEEvent) => void
  enabled?: boolean
}

interface UseEventsReturn {
  isConnected: boolean
  lastEvent: SSEEvent | null
  error: Error | null
}

/**
 * React hook for consuming SSE events from /api/events
 * 
 * Usage:
 * ```tsx
 * const { isConnected, lastEvent, error } = useEvents({
 *   onEvent: (event) => {
 *     if (event.type === 'plan_updated') {
 *       // Refetch project data
 *     }
 *   }
 * })
 * ```
 */
export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const { onEvent, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const handleEvent = useCallback((event: SSEEvent) => {
    setLastEvent(event)
    
    if (event.type === 'connected') {
      setIsConnected(true)
      setError(null)
    }
    
    onEvent?.(event)
  }, [onEvent])

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false)
      return
    }

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let reconnectAttempts = 0
    const maxReconnectDelay = 30000 // 30 seconds max

    const connect = () => {
      try {
        eventSource = new EventSource('/api/events')

        eventSource.onopen = () => {
          reconnectAttempts = 0
          setError(null)
        }

        eventSource.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data) as SSEEvent
            handleEvent(event)
          } catch (err) {
            console.error('Failed to parse SSE event:', err)
          }
        }

        eventSource.onerror = () => {
          setIsConnected(false)
          eventSource?.close()
          
          // Exponential backoff for reconnection
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay)
          reconnectAttempts++
          
          setError(new Error(`Connection lost. Reconnecting in ${delay / 1000}s...`))
          
          reconnectTimeout = setTimeout(connect, delay)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect'))
      }
    }

    connect()

    return () => {
      eventSource?.close()
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [enabled, handleEvent])

  return { isConnected, lastEvent, error }
}

/**
 * Hook for watching a specific project's updates
 */
export function useProjectEvents(
  projectName: string,
  onUpdate?: () => void
): { isConnected: boolean } {
  const { isConnected } = useEvents({
    onEvent: (event) => {
      if (event.project === projectName) {
        onUpdate?.()
      }
    }
  })

  return { isConnected }
}
