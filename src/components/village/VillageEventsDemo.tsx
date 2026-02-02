'use client'

/**
 * Village Events Demo Component
 * 
 * Demonstrates real-time village state updates using the WebSocket/SSE/Polling system.
 * Useful for testing and as a reference implementation.
 */

import { useState } from 'react'
import { useVillageEvents, type VillageEvent } from '@/lib/use-village-events'

export function VillageEventsDemo() {
  const [eventLog, setEventLog] = useState<VillageEvent[]>([])
  const maxEvents = 20

  const {
    isConnected,
    transport,
    state,
    sequence,
    error,
    connectionCount,
    refresh,
    reconnect,
  } = useVillageEvents({
    onEvent: (event) => {
      setEventLog(prev => [event, ...prev].slice(0, maxEvents))
    },
    pollInterval: 2000,
  })

  return (
    <div className="bg-slate-900 text-white p-6 rounded-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🏘️ Village Real-Time Events</h2>
      
      {/* Connection Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatusCard
          label="Status"
          value={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'green' : 'red'}
        />
        <StatusCard
          label="Transport"
          value={transport.toUpperCase()}
          color={transport === 'sse' ? 'blue' : transport === 'polling' ? 'yellow' : 'gray'}
        />
        <StatusCard
          label="Sequence"
          value={sequence.toString()}
          color="purple"
        />
        <StatusCard
          label="Clients"
          value={connectionCount.toString()}
          color="cyan"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 mb-4">
          <span className="text-red-300">{error.message}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
        >
          🔄 Refresh State
        </button>
        <button
          onClick={reconnect}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
        >
          🔌 Reconnect
        </button>
        <button
          onClick={() => setEventLog([])}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded transition"
        >
          🗑️ Clear Log
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Village State */}
        <div>
          <h3 className="text-lg font-semibold mb-3">📍 Villagers</h3>
          {state?.villagers ? (
            <div className="space-y-2">
              {state.villagers.map((v) => (
                <div
                  key={v.id}
                  className="bg-slate-800 rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-slate-400">{v.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      📍 ({v.position_x}, {v.position_y})
                    </div>
                    <div className="text-sm text-slate-400">{v.status}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400">Loading villagers...</div>
          )}

          {/* World State */}
          {state?.worldState && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-3">🌍 World State</h3>
              <div className="bg-slate-800 rounded p-3">
                <pre className="text-sm text-slate-300 overflow-auto">
                  {JSON.stringify(state.worldState, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Event Log */}
        <div>
          <h3 className="text-lg font-semibold mb-3">📜 Event Log</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {eventLog.length === 0 ? (
              <div className="text-slate-400">No events yet...</div>
            ) : (
              eventLog.map((event, i) => (
                <EventCard key={`${event.timestamp}-${i}`} event={event} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Test Broadcast Panel */}
      <TestBroadcastPanel />
    </div>
  )
}

function StatusCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-900/50 border-green-500',
    red: 'bg-red-900/50 border-red-500',
    blue: 'bg-blue-900/50 border-blue-500',
    yellow: 'bg-yellow-900/50 border-yellow-500',
    purple: 'bg-purple-900/50 border-purple-500',
    cyan: 'bg-cyan-900/50 border-cyan-500',
    gray: 'bg-slate-800 border-slate-600',
  }

  return (
    <div className={`rounded border p-3 ${colors[color] || colors.gray}`}>
      <div className="text-xs text-slate-400 uppercase">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function EventCard({ event }: { event: VillageEvent }) {
  const typeColors: Record<string, string> = {
    connected: 'bg-green-800',
    villager_moved: 'bg-blue-800',
    villager_status_changed: 'bg-purple-800',
    interaction_started: 'bg-yellow-800',
    interaction_completed: 'bg-orange-800',
    transaction_completed: 'bg-pink-800',
    thought_added: 'bg-indigo-800',
    relationship_changed: 'bg-red-800',
    world_state_changed: 'bg-teal-800',
    time_tick: 'bg-slate-700',
    full_state_update: 'bg-emerald-800',
  }

  const time = new Date(event.timestamp).toLocaleTimeString()

  return (
    <div className="bg-slate-800 rounded p-2 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`px-2 py-0.5 rounded text-xs ${typeColors[event.type] || 'bg-slate-700'}`}
        >
          {event.type}
        </span>
        <span className="text-slate-500">{time}</span>
      </div>
      {event.data && Object.keys(event.data).length > 0 && (
        <pre className="text-xs text-slate-400 overflow-auto">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      )}
    </div>
  )
}

function TestBroadcastPanel() {
  const [isSending, setIsSending] = useState(false)

  const sendTestEvent = async (type: string, data: Record<string, unknown>) => {
    setIsSending(true)
    try {
      await fetch('/api/village/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      })
    } catch (err) {
      console.error('Broadcast error:', err)
    }
    setIsSending(false)
  }

  return (
    <div className="mt-6 border-t border-slate-700 pt-6">
      <h3 className="text-lg font-semibold mb-3">🧪 Test Broadcasts</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            sendTestEvent('villager_moved', {
              villagerId: 'test-1',
              villagerName: 'Test Villager',
              position: { id: 'test-1', x: Math.floor(Math.random() * 255), y: Math.floor(Math.random() * 255) },
            })
          }
          disabled={isSending}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm transition"
        >
          📍 Move Villager
        </button>
        <button
          onClick={() =>
            sendTestEvent('interaction_started', {
              interactionId: `int-${Date.now()}`,
              participants: ['Alice', 'Bob'],
              interactionType: 'greeting',
            })
          }
          disabled={isSending}
          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded text-sm transition"
        >
          🤝 Start Interaction
        </button>
        <button
          onClick={() =>
            sendTestEvent('thought_added', {
              villagerId: 'test-1',
              villagerName: 'Test Villager',
              thoughtId: `thought-${Date.now()}`,
              thoughtContent: 'I wonder what the weather will be like tomorrow...',
              thoughtType: 'reflection',
            })
          }
          disabled={isSending}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded text-sm transition"
        >
          💭 Add Thought
        </button>
        <button
          onClick={() =>
            sendTestEvent('time_tick', {
              tick: Date.now() % 1000,
            })
          }
          disabled={isSending}
          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 rounded text-sm transition"
        >
          ⏱️ Time Tick
        </button>
      </div>
    </div>
  )
}

export default VillageEventsDemo
