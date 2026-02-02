/**
 * Village Event Broadcasting System
 * 
 * Handles real-time state changes for the village simulation.
 * Events are broadcast to connected clients via SSE or polled via REST.
 * 
 * Designed to work with Vercel's serverless limitations:
 * - SSE works on local dev and non-serverless deployments
 * - Polling fallback for Vercel Edge/Serverless
 */

import { EventEmitter } from 'events'

// ============================================
// Event Types
// ============================================

export type VillageEventType =
  | 'connected'
  | 'villager_moved'
  | 'villager_status_changed'
  | 'interaction_started'
  | 'interaction_completed'
  | 'transaction_completed'
  | 'thought_added'
  | 'relationship_changed'
  | 'world_state_changed'
  | 'time_tick'
  | 'full_state_update'

export interface VillagerPosition {
  id: string
  x: number
  y: number
}

export interface VillageEvent {
  type: VillageEventType
  timestamp: string
  data?: {
    villagerId?: string
    villagerName?: string
    position?: VillagerPosition
    status?: string
    interactionId?: string
    participants?: string[]
    interactionType?: string
    transactionId?: string
    amount?: number
    thoughtId?: string
    thoughtContent?: string
    relationshipId?: string
    affinity?: number
    worldKey?: string
    worldValue?: unknown
    tick?: number
    fullState?: VillageState
    [key: string]: unknown
  }
}

export interface VillagerState {
  id: string
  name: string
  role: string
  personality: string
  position_x: number
  position_y: number
  money: number
  home_x: number | null
  home_y: number | null
  status: string
  sprite_key?: string
}

export interface VillageState {
  villagers: VillagerState[]
  worldState: Record<string, unknown>
  tick: number
  lastUpdate: string
}

// ============================================
// Event History Buffer
// ============================================

const EVENT_BUFFER_SIZE = 100
let eventHistory: VillageEvent[] = []
let eventSequence = 0

function addToHistory(event: VillageEvent): number {
  eventSequence++
  eventHistory.push({ ...event, data: { ...event.data, sequence: eventSequence } })
  
  // Keep buffer from growing too large
  if (eventHistory.length > EVENT_BUFFER_SIZE) {
    eventHistory = eventHistory.slice(-EVENT_BUFFER_SIZE)
  }
  
  return eventSequence
}

// ============================================
// Event Emitter (Singleton)
// ============================================

class VillageEventEmitter extends EventEmitter {
  private static instance: VillageEventEmitter | null = null
  private currentState: VillageState | null = null
  private tick: number = 0

  private constructor() {
    super()
    this.setMaxListeners(100) // Allow many SSE connections
  }

  static getInstance(): VillageEventEmitter {
    if (!VillageEventEmitter.instance) {
      VillageEventEmitter.instance = new VillageEventEmitter()
    }
    return VillageEventEmitter.instance
  }

  /**
   * Broadcast an event to all listeners
   */
  broadcast(event: Omit<VillageEvent, 'timestamp'>): void {
    const fullEvent: VillageEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }
    
    addToHistory(fullEvent)
    this.emit('village_event', fullEvent)
  }

  /**
   * Update and broadcast villager position
   */
  villagerMoved(villagerId: string, villagerName: string, x: number, y: number): void {
    this.broadcast({
      type: 'villager_moved',
      data: {
        villagerId,
        villagerName,
        position: { id: villagerId, x, y }
      }
    })
  }

  /**
   * Update and broadcast villager status
   */
  villagerStatusChanged(villagerId: string, villagerName: string, status: string): void {
    this.broadcast({
      type: 'villager_status_changed',
      data: { villagerId, villagerName, status }
    })
  }

  /**
   * Broadcast interaction start
   */
  interactionStarted(
    interactionId: string, 
    participants: string[], 
    interactionType: string
  ): void {
    this.broadcast({
      type: 'interaction_started',
      data: { interactionId, participants, interactionType }
    })
  }

  /**
   * Broadcast interaction completion
   */
  interactionCompleted(
    interactionId: string,
    participants: string[],
    interactionType: string,
    sentiment?: number
  ): void {
    this.broadcast({
      type: 'interaction_completed',
      data: { interactionId, participants, interactionType, sentiment }
    })
  }

  /**
   * Broadcast transaction
   */
  transactionCompleted(
    transactionId: string,
    fromId: string | null,
    toId: string | null,
    amount: number,
    item?: string
  ): void {
    this.broadcast({
      type: 'transaction_completed',
      data: { transactionId, fromId, toId, amount, item }
    })
  }

  /**
   * Broadcast new thought
   */
  thoughtAdded(
    villagerId: string,
    villagerName: string,
    thoughtId: string,
    thoughtContent: string,
    thoughtType: string
  ): void {
    this.broadcast({
      type: 'thought_added',
      data: { villagerId, villagerName, thoughtId, thoughtContent, thoughtType }
    })
  }

  /**
   * Broadcast relationship change
   */
  relationshipChanged(
    villagerAId: string,
    villagerBId: string,
    affinity: number,
    trust: number
  ): void {
    this.broadcast({
      type: 'relationship_changed',
      data: { villagerAId, villagerBId, affinity, trust }
    })
  }

  /**
   * Broadcast world state change
   */
  worldStateChanged(key: string, value: unknown): void {
    this.broadcast({
      type: 'world_state_changed',
      data: { worldKey: key, worldValue: value }
    })
  }

  /**
   * Broadcast simulation tick
   */
  timeTick(tick: number): void {
    this.tick = tick
    this.broadcast({
      type: 'time_tick',
      data: { tick }
    })
  }

  /**
   * Set and broadcast full state (useful for initial sync)
   */
  setFullState(state: VillageState): void {
    this.currentState = state
    this.tick = state.tick
    this.broadcast({
      type: 'full_state_update',
      data: { fullState: state }
    })
  }

  /**
   * Get current cached state
   */
  getCurrentState(): VillageState | null {
    return this.currentState
  }

  /**
   * Get current tick
   */
  getCurrentTick(): number {
    return this.tick
  }
}

// Export singleton getter
export function getVillageEmitter(): VillageEventEmitter {
  return VillageEventEmitter.getInstance()
}

// ============================================
// Event History Access (for polling)
// ============================================

/**
 * Get events since a specific sequence number
 * Used by polling clients to catch up
 */
export function getEventsSince(sinceSequence: number): {
  events: VillageEvent[]
  currentSequence: number
} {
  const events = eventHistory.filter(
    e => (e.data?.sequence as number) > sinceSequence
  )
  
  return {
    events,
    currentSequence: eventSequence
  }
}

/**
 * Get current sequence number
 */
export function getCurrentSequence(): number {
  return eventSequence
}

// ============================================
// Connection Tracking
// ============================================

let connectionCount = 0

export function incrementConnections(): number {
  return ++connectionCount
}

export function decrementConnections(): number {
  return --connectionCount
}

export function getConnectionCount(): number {
  return connectionCount
}
