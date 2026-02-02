'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { FileEventType } from '@/lib/file-watcher'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling'

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
  /** Initial delay before attempting reconnect in ms (default: 1000) */
  reconnectDelay?: number
  /** Maximum reconnect attempts before falling back to polling (default: 5) */
  maxReconnectAttempts?: number
  /** Polling interval in ms when SSE fails (default: 10000) */
  pollingInterval?: number
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
 * Falls back to polling when SSE is not available (e.g., on serverless platforms)
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
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    pollingInterval = 10000,
  } = options

  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const usePollingRef = useRef(false)
  const lastPollTimeRef = useRef<string | null>(null)

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((attempt: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped)
    return Math.min(reconnectDelay * Math.pow(2, attempt), 16000)
  }, [reconnectDelay])

  // Poll for updates (fallback when SSE doesn't work)
  const poll = useCallback(async () => {
    if (!mountedRef.current || !usePollingRef.current) return

    try {
      // For polling mode, we just trigger a "poll" event to let consumers know
      // they should refresh their data. The actual data fetching is done by SWR.
      const pollEvent: SSEEvent = {
        type: 'connected',
        timestamp: new Date().toISOString(),
      }
      
      // Only emit if enough time has passed (debounce)
      if (lastPollTimeRef.current !== pollEvent.timestamp) {
        lastPollTimeRef.current = pollEvent.timestamp
        setLastEvent(pollEvent)
        onEvent?.(pollEvent)
      }
    } catch (error) {
      console.error('Polling error:', error)
    }

    // Schedule next poll if still in polling mode
    if (mountedRef.current && usePollingRef.current) {
      pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
    }
  }, [onEvent, pollingInterval])

  // Start polling mode
  const startPolling = useCallback(() => {
    if (usePollingRef.current) return
    
    usePollingRef.current = true
    setStatus('polling')
    console.log('SSE not available, falling back to polling mode')
    
    // Start polling immediately
    poll()
  }, [poll])

  // Stop polling
  const stopPolling = useCallback(() => {
    usePollingRef.current = false
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (!mountedRef.current) return

    // Don't try SSE if we've already determined it doesn't work
    if (usePollingRef.current) {
      return
    }

    setStatus('connecting')

    try {
      // Check if EventSource is available (not available in some environments)
      if (typeof EventSource === 'undefined') {
        console.warn('EventSource not available, using polling fallback')
        startPolling()
        return
      }

      const eventSource = new EventSource('/api/events')
      eventSourceRef.current = eventSource
      
      // Track if we've received the connected event
      let hasConnected = false
      
      // Timeout for initial connection (if we don't connect within 10s, fall back)
      const connectionTimeout = setTimeout(() => {
        if (!hasConnected && mountedRef.current) {
          console.warn('SSE connection timeout, falling back to polling')
          eventSource.close()
          eventSourceRef.current = null
          startPolling()
        }
      }, 10000)

      eventSource.onopen = () => {
        if (!mountedRef.current) return
        // Don't set connected yet - wait for the connected event
        // This helps detect if the server is actually sending SSE events
      }

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return
        
        clearTimeout(connectionTimeout)

        try {
          const parsedEvent: SSEEvent = JSON.parse(event.data)
          setLastEvent(parsedEvent)

          if (parsedEvent.type === 'connected') {
            hasConnected = true
            setStatus('connected')
            reconnectAttemptsRef.current = 0 // Reset on successful connection
          }

          onEvent?.(parsedEvent)
        } catch (error) {
          console.error('Failed to parse SSE event:', error)
        }
      }

      eventSource.onerror = (error) => {
        if (!mountedRef.current) return
        
        clearTimeout(connectionTimeout)
        eventSource.close()
        eventSourceRef.current = null

        // If we never connected successfully, this might be a serverless platform
        // where SSE doesn't work well
        if (!hasConnected) {
          console.warn('SSE connection failed before receiving any events')
        }

        setStatus('disconnected')

        // Attempt reconnect if enabled and under max attempts
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = getBackoffDelay(reconnectAttemptsRef.current)
          reconnectAttemptsRef.current++
          
          console.log(`SSE reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect()
            }
          }, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          // Max attempts reached, fall back to polling
          console.warn(`SSE max reconnect attempts (${maxReconnectAttempts}) reached, falling back to polling`)
          startPolling()
        }
      }
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      startPolling()
    }
  }, [onEvent, autoReconnect, maxReconnectAttempts, getBackoffDelay, startPolling])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    stopPolling()
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    setStatus('disconnected')
    reconnectAttemptsRef.current = maxReconnectAttempts // Prevent auto-reconnect
  }, [maxReconnectAttempts, stopPolling])

  const reconnect = useCallback(() => {
    // Reset state for fresh reconnection attempt
    reconnectAttemptsRef.current = 0
    usePollingRef.current = false
    stopPolling()
    connect()
  }, [connect, stopPolling])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      stopPolling()
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [connect, stopPolling])

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
