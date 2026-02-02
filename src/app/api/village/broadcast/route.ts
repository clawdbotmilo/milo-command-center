/**
 * Village Event Broadcast Endpoint
 * 
 * POST /api/village/broadcast
 * 
 * Used by the simulation engine to push events to all connected clients.
 * Supports both individual events and batch broadcasts.
 * 
 * Single event:
 * {
 *   "type": "villager_moved",
 *   "data": { "villagerId": "...", "x": 100, "y": 150 }
 * }
 * 
 * Batch events:
 * {
 *   "events": [
 *     { "type": "villager_moved", "data": {...} },
 *     { "type": "interaction_started", "data": {...} }
 *   ]
 * }
 * 
 * Full state update:
 * {
 *   "type": "full_state",
 *   "state": { villagers: [...], worldState: {...}, tick: 0 }
 * }
 */

import { NextResponse } from 'next/server'
import { 
  getVillageEmitter,
  getConnectionCount,
  getCurrentSequence,
  type VillageEventType,
  type VillageState
} from '@/lib/village-events'

export const runtime = 'nodejs' // Need Node.js for EventEmitter

interface BroadcastEvent {
  type: VillageEventType
  data?: Record<string, unknown>
}

interface BroadcastRequest {
  // Single event
  type?: string
  data?: Record<string, unknown>
  state?: VillageState
  
  // Batch events
  events?: BroadcastEvent[]
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: BroadcastRequest = await request.json()
    const emitter = getVillageEmitter()
    let eventCount = 0

    // Handle full state update
    if (body.type === 'full_state' && body.state) {
      emitter.setFullState(body.state)
      eventCount = 1
    }
    // Handle batch events
    else if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        if (event.type) {
          emitter.broadcast({
            type: event.type,
            data: event.data
          })
          eventCount++
        }
      }
    }
    // Handle single event
    else if (body.type) {
      emitter.broadcast({
        type: body.type as VillageEventType,
        data: body.data
      })
      eventCount = 1
    }
    else {
      return NextResponse.json(
        { error: 'Invalid request: must provide type, events array, or full_state' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      eventCount,
      sequence: getCurrentSequence(),
      connectionCount: getConnectionCount(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[village-broadcast] Error:', error)
    return NextResponse.json(
      { error: 'Failed to broadcast event' },
      { status: 500 }
    )
  }
}

/**
 * GET: Status check for the broadcast system
 */
export async function GET(): Promise<Response> {
  const emitter = getVillageEmitter()
  
  return NextResponse.json({
    status: 'ok',
    sequence: getCurrentSequence(),
    connectionCount: getConnectionCount(),
    currentTick: emitter.getCurrentTick(),
    hasState: emitter.getCurrentState() !== null,
    timestamp: new Date().toISOString()
  })
}
