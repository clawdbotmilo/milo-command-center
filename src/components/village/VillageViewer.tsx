'use client'

/**
 * VillageViewer - Main village viewing component with enhanced UI
 * 
 * Features:
 * - Real-time canvas renderer with pan/zoom
 * - Clickable villager info panels
 * - Thought bubbles above villagers
 * - Interaction history display
 * - Simulation controls (play/pause, speed)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { VillageCanvas } from './VillageCanvas'
import { VillagerInfoPanel } from './VillagerInfoPanel'
import { InteractionHistory, type VillageInteraction } from './InteractionHistory'
import { SimulationControls } from './SimulationControls'
import { ThoughtBubbles, useThoughtBubbles, type VillagerThought } from './ThoughtBubbles'
import { useVillageEvents, type VillagerState, type VillageEvent } from '@/lib/use-village-events'

// Default buildings from the village layout
const DEFAULT_BUILDINGS = [
  { id: 'tavern', type: 'TAVERN', name: 'The Rusty Anchor', x: 126, y: 118, width: 5, height: 4, entrance: { x: 128, y: 122 } },
  { id: 'church', type: 'CHURCH', name: 'Chapel of Light', x: 138, y: 113, width: 5, height: 6, entrance: { x: 140, y: 119 } },
  { id: 'blacksmith', type: 'BLACKSMITH', name: 'Iron & Fire Forge', x: 113, y: 128, width: 4, height: 3, entrance: { x: 115, y: 131 } },
  { id: 'bakery', type: 'BAKERY', name: 'Golden Crust Bakery', x: 136, y: 130, width: 3, height: 3, entrance: { x: 137, y: 133 } },
  { id: 'market', type: 'MARKET', name: 'Village Market', x: 125, y: 138, width: 6, height: 4, entrance: { x: 128, y: 142 } },
  { id: 'library', type: 'LIBRARY', name: 'Hall of Scrolls', x: 143, y: 123, width: 4, height: 3, entrance: { x: 145, y: 126 } },
  { id: 'farm', type: 'FARM', name: 'Green Meadow Farm', x: 103, y: 143, width: 8, height: 6, entrance: { x: 107, y: 149 } },
  { id: 'well', type: 'WELL', name: 'Town Well', x: 128, y: 128, width: 1, height: 1, entrance: { x: 128, y: 129 } },
  // Cottages
  { id: 'cottage_elara', type: 'COTTAGE', name: "Elara's Cottage", x: 108, y: 120, width: 3, height: 3, entrance: { x: 109, y: 123 } },
  { id: 'cottage_brom', type: 'COTTAGE', name: "Brom's Home", x: 116, y: 133, width: 3, height: 3, entrance: { x: 117, y: 136 } },
  { id: 'cottage_maeve', type: 'COTTAGE', name: "Maeve's Dwelling", x: 133, y: 123, width: 3, height: 3, entrance: { x: 134, y: 126 } },
  { id: 'cottage_finn', type: 'COTTAGE', name: "Finn's Quarters", x: 140, y: 136, width: 3, height: 3, entrance: { x: 141, y: 139 } },
  { id: 'cottage_ivy', type: 'COTTAGE', name: "Ivy's Nook", x: 120, y: 113, width: 3, height: 3, entrance: { x: 121, y: 116 } },
  { id: 'cottage_gideon', type: 'COTTAGE', name: "Gideon's Study", x: 146, y: 131, width: 3, height: 3, entrance: { x: 147, y: 134 } },
  { id: 'cottage_rose', type: 'COTTAGE', name: "Rose's Place", x: 123, y: 146, width: 3, height: 3, entrance: { x: 124, y: 149 } },
]

// Villager role icons
const ROLE_ICONS: Record<string, string> = {
  blacksmith: '⚒️',
  baker: '🍞',
  farmer: '🌾',
  merchant: '💰',
  priest: '⛪',
  scholar: '📚',
  tavern_keeper: '🍺',
  'tavern keeper': '🍺',
  herbalist: '🌿',
  messenger: '📜',
  florist: '🌸',
  fisher: '🎣',
  banker: '🏦',
  apprentice: '📖',
  default: '👤',
}

// Status icons
const STATUS_ICONS: Record<string, string> = {
  idle: '😐',
  walking: '🚶',
  working: '💪',
  socializing: '💬',
  sleeping: '😴',
  eating: '🍽️',
  thinking: '🤔',
  resting: '🛋️',
  praying: '🙏',
  shopping: '🛒',
  default: '❓',
}

// Panel types for layout
type RightPanelMode = 'info' | 'interactions' | 'events'

export function VillageViewer() {
  // Event history state
  const [eventLog, setEventLog] = useState<VillageEvent[]>([])
  const [interactionHistory, setInteractionHistory] = useState<VillageInteraction[]>([])
  const maxEvents = 100

  // Selected villager state
  const [selectedVillager, setSelectedVillager] = useState<VillagerState | null>(null)
  
  // Panel visibility
  const [showVillagerList, setShowVillagerList] = useState(true)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('info')
  const [showThoughtBubbles, setShowThoughtBubbles] = useState(true)
  
  // Simulation controls state
  const [isSimRunning, setIsSimRunning] = useState(true)
  const [simSpeed, setSimSpeed] = useState(1)

  // Thought bubbles hook
  const { thoughts, addThought, handleThoughtEvent } = useThoughtBubbles()

  // Canvas reference for coordinate conversion
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [cameraState, setCameraState] = useState({ x: 128, y: 128, zoom: 1 })

  // Village events hook
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
      
      // Process interaction events
      if (event.type === 'interaction_completed' && event.data) {
        const interaction: VillageInteraction = {
          id: event.data.interactionId as string,
          type: event.data.interactionType as string || 'conversation',
          villager1_id: event.data.participants?.[0] || '',
          villager1_name: event.data.participants?.[0] || 'Unknown',
          villager2_id: event.data.participants?.[1] || '',
          villager2_name: event.data.participants?.[1] || 'Unknown',
          sentiment: event.data.sentiment as number,
          timestamp: event.timestamp,
        }
        setInteractionHistory(prev => [interaction, ...prev].slice(0, maxEvents))
      }
      
      // Process thought events
      if (event.type === 'thought_added' && event.data) {
        handleThoughtEvent({
          villagerId: event.data.villagerId as string,
          villagerName: event.data.villagerName as string,
          thoughtContent: event.data.thoughtContent as string,
          thoughtType: event.data.thoughtType as string,
        })
      }
      
      // Process transaction events
      if (event.type === 'transaction_completed' && event.data) {
        const interaction: VillageInteraction = {
          id: event.data.transactionId as string,
          type: 'trade',
          villager1_id: event.data.fromId as string || '',
          villager1_name: 'Seller',
          villager2_id: event.data.toId as string || '',
          villager2_name: 'Buyer',
          amount: event.data.amount as number,
          item: event.data.item as string,
          timestamp: event.timestamp,
        }
        setInteractionHistory(prev => [interaction, ...prev].slice(0, maxEvents))
      }
    },
    pollInterval: 1000,
  })

  // World to screen coordinate conversion (updated when camera changes)
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const TILE_SIZE = 16
    const containerRect = canvasContainerRef.current?.getBoundingClientRect()
    const width = containerRect?.width || 800
    const height = containerRect?.height || 600
    const tilePixels = TILE_SIZE * cameraState.zoom
    
    const screenX = (worldX - cameraState.x) * tilePixels + width / 2
    const screenY = (worldY - cameraState.y) * tilePixels + height / 2
    
    return { x: screenX, y: screenY }
  }, [cameraState])

  // Group villagers by status
  const villagersByStatus = useMemo(() => {
    if (!state?.villagers) return {}
    return state.villagers.reduce((acc, v) => {
      const status = v.status || 'unknown'
      if (!acc[status]) acc[status] = []
      acc[status].push(v)
      return acc
    }, {} as Record<string, VillagerState[]>)
  }, [state?.villagers])

  // Get selected villager's full data (for info panel)
  const selectedVillagerData = useMemo(() => {
    if (!selectedVillager || !state?.villagers) return null
    return state.villagers.find(v => v.id === selectedVillager.id) || selectedVillager
  }, [selectedVillager, state?.villagers])

  // Handle villager click from canvas
  const handleVillagerClick = useCallback((villager: VillagerState) => {
    setSelectedVillager(prev => prev?.id === villager.id ? null : villager)
    setRightPanelMode('info')
  }, [])

  // Handle villager click from interaction history or info panel
  const handleVillagerSelect = useCallback((villagerId: string) => {
    const villager = state?.villagers?.find(v => v.id === villagerId)
    if (villager) {
      setSelectedVillager(villager)
      setRightPanelMode('info')
    }
  }, [state?.villagers])

  // Simulation control handlers
  const handleTogglePlay = useCallback((running: boolean) => {
    setIsSimRunning(running)
    // TODO: Send command to backend to pause/resume simulation
  }, [])

  const handleSpeedChange = useCallback((speed: number) => {
    setSimSpeed(speed)
    // TODO: Send command to backend to change simulation speed
  }, [])

  const formatEventType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getEventIcon = (type: string): string => {
    const icons: Record<string, string> = {
      connected: '🔗',
      villager_moved: '🚶',
      villager_status_changed: '🔄',
      interaction_started: '🤝',
      interaction_completed: '✅',
      transaction_completed: '💰',
      thought_added: '💭',
      relationship_changed: '❤️',
      world_state_changed: '🌍',
      time_tick: '⏱️',
      full_state_update: '📦',
    }
    return icons[type] || '📌'
  }

  // Calculate tick/time info from state
  const currentTick = state?.tick || 0
  const timeOfDay = Math.floor((currentTick / 60) % 24) // Assuming 60 ticks per hour
  const currentDay = Math.floor(currentTick / (60 * 24)) + 1

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top bar: Connection status + Simulation controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-3">
          <h2 className="text-xl font-bold text-white">🏘️ Village</h2>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'} via {transport.toUpperCase()}
            </span>
          </div>
          {connectionCount > 0 && (
            <span className="text-sm text-slate-500">
              {connectionCount} viewer{connectionCount !== 1 ? 's' : ''}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={refresh}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
              title="Refresh state"
            >
              🔄
            </button>
            <button
              onClick={reconnect}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition"
              title="Reconnect"
            >
              🔌
            </button>
          </div>
        </div>

        {/* Simulation controls (compact) */}
        <SimulationControls
          isRunning={isSimRunning}
          speed={simSpeed}
          tick={currentTick}
          timeOfDay={timeOfDay}
          day={currentDay}
          onTogglePlay={handleTogglePlay}
          onSpeedChange={handleSpeedChange}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3">
          <span className="text-red-300">⚠️ {error.message}</span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left sidebar - Villager list */}
        {showVillagerList && (
          <div className="w-64 bg-slate-800/50 rounded-lg p-4 flex-shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Villagers</h3>
              <span className="text-sm text-slate-400">
                {state?.villagers?.length || 0}
              </span>
            </div>

            {state?.villagers ? (
              <div className="space-y-2">
                {Object.entries(villagersByStatus).map(([status, villagers]) => (
                  <div key={status}>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                      {STATUS_ICONS[status] || STATUS_ICONS.default} {status} ({villagers.length})
                    </div>
                    {villagers.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleVillagerClick(v)}
                        className={`w-full text-left p-2 rounded transition ${
                          selectedVillager?.id === v.id
                            ? 'bg-yellow-600/30 border border-yellow-500'
                            : 'bg-slate-700/50 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{ROLE_ICONS[v.role] || ROLE_ICONS.default}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm truncate">
                              {v.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {v.role}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            ({v.position_x}, {v.position_y})
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-sm">Loading...</div>
            )}
          </div>
        )}

        {/* Center - Canvas with thought bubbles overlay */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={canvasContainerRef} className="relative flex-1">
            <VillageCanvas
              state={state}
              buildings={DEFAULT_BUILDINGS}
              width={800}
              height={600}
              onVillagerClick={handleVillagerClick}
              onCameraChange={setCameraState}
            />
            
            {/* Thought bubbles overlay */}
            {showThoughtBubbles && state?.villagers && (
              <ThoughtBubbles
                villagers={state.villagers}
                thoughts={thoughts}
                worldToScreen={worldToScreen}
                showAmbient={false}
                maxBubbles={5}
              />
            )}
          </div>
          
          {/* Canvas controls bar */}
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Drag to pan • Scroll to zoom • WASD/Arrows to move • +/- to zoom • Home to reset</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showThoughtBubbles}
                onChange={(e) => setShowThoughtBubbles(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span>💭 Show Thoughts</span>
            </label>
          </div>
        </div>

        {/* Right sidebar - Info panel / Interactions / Events */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0 overflow-hidden">
          {/* Panel mode tabs */}
          <div className="flex bg-slate-800/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setRightPanelMode('info')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                rightPanelMode === 'info'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              👤 Info
            </button>
            <button
              onClick={() => setRightPanelMode('interactions')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                rightPanelMode === 'interactions'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              🤝 History
            </button>
            <button
              onClick={() => setRightPanelMode('events')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                rightPanelMode === 'events'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              📜 Events
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {/* Info panel */}
            {rightPanelMode === 'info' && (
              selectedVillagerData ? (
                <VillagerInfoPanel
                  villager={selectedVillagerData}
                  relationships={[]} // TODO: Connect to actual relationship data
                  inventory={[]} // TODO: Connect to actual inventory data
                  thoughts={[]} // TODO: Connect to actual thoughts history
                  onClose={() => setSelectedVillager(null)}
                  onVillagerClick={handleVillagerSelect}
                />
              ) : (
                <div className="bg-slate-800/50 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-3">👆</div>
                  <div className="text-slate-400">
                    Click on a villager to see their details
                  </div>
                </div>
              )
            )}

            {/* Interactions panel */}
            {rightPanelMode === 'interactions' && (
              <InteractionHistory
                interactions={interactionHistory}
                onVillagerClick={handleVillagerSelect}
                showFilters={true}
              />
            )}

            {/* Events panel */}
            {rightPanelMode === 'events' && (
              <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                <div className="bg-slate-700/50 p-3 border-b border-slate-600 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>📜</span>
                    Event Log
                    <span className="text-sm text-slate-400 font-normal">
                      ({eventLog.length})
                    </span>
                  </h3>
                  <button
                    onClick={() => setEventLog([])}
                    className="text-sm text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-600 transition"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-[500px] overflow-y-auto space-y-1 p-2">
                  {eventLog.length === 0 ? (
                    <div className="text-slate-400 text-sm text-center py-8">
                      Waiting for events...
                    </div>
                  ) : (
                    eventLog.map((event, i) => (
                      <div
                        key={`${event.timestamp}-${i}`}
                        className="bg-slate-700/30 rounded p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span>{getEventIcon(event.type)}</span>
                          <span className="text-slate-300 font-medium">
                            {formatEventType(event.type)}
                          </span>
                          <span className="text-slate-500 ml-auto">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {event.data?.villagerName && (
                          <div className="text-slate-400 truncate">
                            {event.data.villagerName}
                            {event.data.status && ` → ${event.data.status}`}
                            {event.data.position && ` @ (${event.data.position.x}, ${event.data.position.y})`}
                          </div>
                        )}
                        {event.data?.participants && (
                          <div className="text-slate-400">
                            {(event.data.participants as string[]).join(' & ')}
                          </div>
                        )}
                        {event.data?.thoughtContent && (
                          <div className="text-slate-300 italic truncate">
                            "{event.data.thoughtContent}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom toggle buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowVillagerList(prev => !prev)}
          className={`px-4 py-2 rounded transition ${
            showVillagerList ? 'bg-blue-600' : 'bg-slate-600'
          }`}
        >
          {showVillagerList ? '◀️ Hide' : '▶️ Show'} Villagers
        </button>
      </div>
    </div>
  )
}

export default VillageViewer
