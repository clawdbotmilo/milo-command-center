import { getFileWatcher, type FileEvent } from '@/lib/file-watcher'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-Sent Events endpoint for real-time project updates
 * 
 * Clients connect to this endpoint to receive live updates when:
 * - PROJECT-PLAN.md files are modified
 * - ORCHESTRATION-STATE.json files are modified
 * - Tasks change status
 * - Agents start or complete
 * 
 * Event format:
 * data: {"type": "plan_updated", "project": "my-project", "timestamp": "2024-01-01T00:00:00.000Z"}
 */
export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder()

  // Use ReadableStream with a controller for better streaming control
  const stream = new ReadableStream({
    start(controller) {
      let isConnected = true

      /**
       * Send an SSE event to the client
       */
      const sendEvent = (event: FileEvent | { type: string; timestamp: string }) => {
        if (!isConnected) return
        
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch {
          // Client likely disconnected
          isConnected = false
        }
      }

      /**
       * Send a keepalive comment (prevents connection timeout)
       */
      const sendKeepalive = () => {
        if (!isConnected) return
        
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          isConnected = false
        }
      }

      // Send initial connection event immediately
      sendEvent({
        type: 'connected',
        timestamp: new Date().toISOString(),
      })

      // Get the file watcher and subscribe to events
      const watcher = getFileWatcher()
      
      // Start watching if not already started
      watcher.start().catch(console.error)

      // Event handler for file changes
      const handleEvent = (event: FileEvent) => {
        sendEvent(event)
      }

      // Subscribe to file events
      watcher.on('event', handleEvent)

      // Set up keepalive interval (every 30 seconds)
      const keepaliveInterval = setInterval(() => {
        sendKeepalive()
      }, 30000)

      // Handle client disconnect via AbortSignal
      request.signal.addEventListener('abort', () => {
        isConnected = false
        clearInterval(keepaliveInterval)
        watcher.off('event', handleEvent)
        controller.close()
      })
    },
  })

  // Return the SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
