/**
 * Server-Sent Events (SSE) endpoint for real-time village updates
 * 
 * GET /api/village/events
 * 
 * Clients connect to this endpoint to receive live village state updates.
 * For Vercel serverless deployments, use the polling fallback at /api/village/state
 * 
 * Event types:
 * - connected: Initial connection confirmation
 * - villager_moved: Villager position changed
 * - villager_status_changed: Villager status updated
 * - interaction_started: Two villagers started interacting
 * - interaction_completed: Interaction finished
 * - transaction_completed: Economic exchange occurred
 * - thought_added: Villager had a thought
 * - relationship_changed: Relationship affinity/trust changed
 * - world_state_changed: Global simulation state updated
 * - time_tick: Simulation tick advanced
 * - full_state_update: Complete state snapshot
 */

import { 
  getVillageEmitter, 
  type VillageEvent,
  getCurrentSequence,
  incrementConnections,
  decrementConnections 
} from '@/lib/village-events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // SSE requires Node.js runtime, not Edge

export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let isConnected = true
      const connectionId = incrementConnections()

      /**
       * Send an SSE event to the client
       */
      const sendEvent = (event: VillageEvent | { type: string; sequence: number; timestamp: string }) => {
        if (!isConnected) return
        
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (err) {
          // Client likely disconnected
          console.error('[village-events] Send error:', err)
          isConnected = false
        }
      }

      /**
       * Send a keepalive comment
       */
      const sendKeepalive = () => {
        if (!isConnected) return
        
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          isConnected = false
        }
      }

      // Send initial connection event with current sequence
      sendEvent({
        type: 'connected',
        sequence: getCurrentSequence(),
        timestamp: new Date().toISOString(),
      })

      // Get the emitter and subscribe
      const emitter = getVillageEmitter()
      
      const handleEvent = (event: VillageEvent) => {
        sendEvent(event)
      }

      emitter.on('village_event', handleEvent)

      // Keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        sendKeepalive()
      }, 30000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isConnected = false
        decrementConnections()
        clearInterval(keepaliveInterval)
        emitter.off('village_event', handleEvent)
        
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
