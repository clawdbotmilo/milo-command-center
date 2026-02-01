'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { FileEventType } from '@/lib/file-watcher'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SSEEvent {
  type: FileEventType | 'connected'
  project?: string
  data?: Record<string, unknown>
  timestamp: string
}

interface UseEventsOptions {
  /** Callback when an event is received */
  onEvent?: (event: SSEEvent) => void
  /** Enable auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean
  /** Delay before attempting reconnect in ms (default: 3000) */
  reconnectDelay?: number
  /** Maximum reconnect attempts (default: 10) */
  maxReconnectAttempts?: number
}

interface UseEventsResult {
  /** Current connection status */
  status: ConnectionStatus
  /** Most recent event received */
  lastEvent: SSEEvent | null
  /** Manually reconnect */
  reconnect: () => void
  /** Disconnect from the event stream */
  disconnect: () => void
}

/**
 * Hook to connect to the SSE event stream for real-time updates
 * 
 * @example
 * ```tsx
 * const { status, lastEvent } = useEvents({
 *   onEvent: (event) => {
 *     if (event.type === 'plan_updated') {
 *       // Refresh plan data
 *     }
 *   }
 * })
 * ```
 */
export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const {
    onEvent,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options

  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (!mountedRef.current) return

    setStatus('connecting')

    try {
      const eventSource = new EventSource('/api/events')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        if (!mountedRef.current) return
        reconnectAttemptsRef.current = 0
        // Status will be set to 'connected' when we receive the connected event
      }

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return

        try {
          const parsedEvent: SSEEvent = JSON.parse(event.data)
          setLastEvent(parsedEvent)

          if (parsedEvent.type === 'connected') {
            setStatus('connected')
          }

          onEvent?.(parsedEvent)
        } catch (error) {
          console.error('Failed to parse SSE event:', error)
        }
      }

      eventSource.onerror = () => {
        if (!mountedRef.current) return

        eventSource.close()
        eventSourceRef.current = null
        setStatus('disconnected')

        // Attempt reconnect if enabled
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect()
            }
          }, reconnectDelay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setStatus('error')
        }
      }
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      setStatus('error')
    }
  }, [onEvent, autoReconnect, reconnectDelay, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    setStatus('disconnected')
    reconnectAttemptsRef.current = maxReconnectAttempts // Prevent auto-reconnect
  }, [maxReconnectAttempts])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [connect])

  return {
    status,
    lastEvent,
    reconnect,
    disconnect,
  }
}

/**
 * Hook to subscribe to events for a specific project
 */
export function useProjectEvents(
  projectName: string | null,
  onEvent: (event: SSEEvent) => void
): UseEventsResult {
  const handleEvent = useCallback(
    (event: SSEEvent) => {
      // Filter events for this project or global events
      if (!projectName || !event.project || event.project === projectName) {
        onEvent(event)
      }
    },
    [projectName, onEvent]
  )

  return useEvents({ onEvent: handleEvent })
}
