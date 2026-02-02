'use client'

/**
 * Village Events Hook
 * 
 * Smart real-time updates for village state with automatic transport selection.
 * 
 * Features:
 * - Auto-detects best transport (SSE vs polling)
 * - Graceful fallback when SSE fails
 * - Exponential backoff on errors
 * - Event buffering and deduplication
 * - State synchronization
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import type { VillageEvent, VillageState } from './village-events'

// Re-export types for convenience
export type { VillageEvent, VillageState, VillagerState } from './village-events'

export type TransportType = 'sse' | 'polling' | 'disconnected'

export interface UseVillageEventsOptions {
  /** Callback for each event received */
  onEvent?: (event: VillageEvent) => void
  /** Callback when full state is received */
  onStateUpdate?: (state: VillageState) => void
  /** Enable/disable the connection */
  enabled?: boolean
  /** Force polling even if SSE is available */
  forcePolling?: boolean
  /** Polling interval in ms (default: 2000) */
  pollInterval?: number
  /** Auto-reconnect on errors (default: true) */
  autoReconnect?: boolean
}

export interface UseVillageEventsReturn {
  /** Current connection status */
  isConnected: boolean
  /** Current transport method */
  transport: TransportType
  /** Last received event */
  lastEvent: VillageEvent | null
  /** Current village state */
  state: VillageState | null
  /** Current event sequence number */
  sequence: number
  /** Connection error, if any */
  error: Error | null
  /** Number of connected clients (from server) */
  connectionCount: number
  /** Manually refresh state */
  refresh: () => Promise<void>
  /** Force reconnect */
  reconnect: () => void
}

/**
 * Hook for consuming real-time village updates
 */
export function useVillageEvents(
  options: UseVillageEventsOptions = {}
): UseVillageEventsReturn {
  const {
    onEvent,
    onStateUpdate,
    enabled = true,
    forcePolling = false,
    pollInterval = 2000,
    autoReconnect = true,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState<TransportType>('disconnected')
  const [lastEvent, setLastEvent] = useState<VillageEvent | null>(null)
  const [state, setState] = useState<VillageState | null>(null)
  const [sequence, setSequence] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const [connectionCount, setConnectionCount] = useState(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const sequenceRef = useRef(0)
  const mountedRef = useRef(true)

  // Update sequence ref when state changes
  useEffect(() => {
    sequenceRef.current = sequence
  }, [sequence])

  /**
   * Handle incoming event
   */
  const handleEvent = useCallback((event: VillageEvent) => {
    if (!mountedRef.current) return

    setLastEvent(event)
    
    // Update sequence from event data
    if (event.data?.sequence) {
      const seq = event.data.sequence as number
      setSequence(seq)
      sequenceRef.current = seq
    }

    // Handle full state updates
    if (event.type === 'full_state_update' && event.data?.fullState) {
      const fullState = event.data.fullState as VillageState
      setState(fullState)
      onStateUpdate?.(fullState)
    }

    // Handle connection event
    if (event.type === 'connected') {
      setIsConnected(true)
      setError(null)
      reconnectAttempts.current = 0
    }

    onEvent?.(event)
  }, [onEvent, onStateUpdate])

  /**
   * Fetch state via polling
   */
  const fetchState = useCallback(async (delta: boolean = false) => {
    try {
      const url = delta 
        ? `/api/village/state?since=${sequenceRef.current}`
        : '/api/village/state'
      
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const data = await res.json()
      
      if (!mountedRef.current) return

      setSequence(data.sequence)
      sequenceRef.current = data.sequence
      setConnectionCount(data.connectionCount || 0)
      setIsConnected(true)
      setError(null)
      reconnectAttempts.current = 0

      if (data.mode === 'full' && data.state) {
        setState(data.state)
        onStateUpdate?.(data.state)
      } else if (data.mode === 'delta' && data.events) {
        // Process delta events
        for (const event of data.events) {
          handleEvent(event)
        }
      }
    } catch (err) {
      if (!mountedRef.current) return
      
      setIsConnected(false)
      setError(err instanceof Error ? err : new Error('Failed to fetch state'))
    }
  }, [handleEvent, onStateUpdate])

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    
    setTransport('polling')
    
    // Initial fetch (full state)
    fetchState(false)
    
    // Set up polling interval (delta updates)
    pollingRef.current = setInterval(() => {
      fetchState(true)
    }, pollInterval)
  }, [fetchState, pollInterval])

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  /**
   * Start SSE connection
   */
  const startSSE = useCallback(() => {
    if (eventSourceRef.current) return

    setTransport('sse')

    try {
      const eventSource = new EventSource('/api/village/events')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        if (!mountedRef.current) return
        reconnectAttempts.current = 0
        setError(null)
      }

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as VillageEvent
          handleEvent(event)
        } catch (err) {
          console.error('[village-events] Parse error:', err)
        }
      }

      eventSource.onerror = () => {
        if (!mountedRef.current) return
        
        setIsConnected(false)
        eventSource.close()
        eventSourceRef.current = null

        // Fall back to polling or reconnect
        if (autoReconnect) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++
          
          setError(new Error(`SSE disconnected. Retrying in ${delay / 1000}s...`))
          
          // After 3 SSE failures, fall back to polling
          if (reconnectAttempts.current >= 3) {
            console.log('[village-events] Falling back to polling')
            startPolling()
          } else {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) startSSE()
            }, delay)
          }
        }
      }

      // Fetch initial state via REST (SSE doesn't include full state)
      fetchState(false)
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('SSE not supported'))
      // Fall back to polling
      startPolling()
    }
  }, [autoReconnect, fetchState, handleEvent, startPolling])

  /**
   * Stop SSE connection
   */
  const stopSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchState(false)
  }, [fetchState])

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    stopSSE()
    stopPolling()
    reconnectAttempts.current = 0
    setError(null)
    
    if (forcePolling) {
      startPolling()
    } else {
      startSSE()
    }
  }, [forcePolling, startPolling, startSSE, stopPolling, stopSSE])

  /**
   * Main effect: manage connection lifecycle
   */
  useEffect(() => {
    mountedRef.current = true

    if (!enabled) {
      setIsConnected(false)
      setTransport('disconnected')
      return
    }

    if (forcePolling) {
      startPolling()
    } else {
      startSSE()
    }

    return () => {
      mountedRef.current = false
      stopSSE()
      stopPolling()
    }
  }, [enabled, forcePolling, startPolling, startSSE, stopPolling, stopSSE])

  return {
    isConnected,
    transport,
    lastEvent,
    state,
    sequence,
    error,
    connectionCount,
    refresh,
    reconnect,
  }
}

/**
 * Simple hook for just getting village state with auto-refresh
 */
export function useVillageState(refreshInterval: number = 5000): {
  state: VillageState | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<VillageState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/village/state')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState(data.state)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    
    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refresh, refreshInterval])

  return { state, isLoading, error, refresh }
}
