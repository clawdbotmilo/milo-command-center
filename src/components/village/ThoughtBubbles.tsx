'use client'

/**
 * ThoughtBubbles - Renders thought bubbles above villagers
 * 
 * This component overlays the canvas and shows animated thought bubbles
 * for villagers who have active thoughts.
 */

import { useState, useEffect, useMemo } from 'react'
import type { VillagerState } from '@/lib/use-village-events'

export interface VillagerThought {
  villagerId: string
  villagerName: string
  content: string
  type: 'reflection' | 'plan' | 'observation' | 'memory' | 'desire' | 'ambient'
  timestamp: number
  isRecent?: boolean
}

// Thought type styling
const THOUGHT_TYPE_STYLE: Record<string, { bg: string; border: string; icon: string }> = {
  reflection: { bg: 'bg-purple-900/90', border: 'border-purple-500', icon: '🤔' },
  plan: { bg: 'bg-blue-900/90', border: 'border-blue-500', icon: '📋' },
  observation: { bg: 'bg-green-900/90', border: 'border-green-500', icon: '👀' },
  memory: { bg: 'bg-amber-900/90', border: 'border-amber-500', icon: '💭' },
  desire: { bg: 'bg-pink-900/90', border: 'border-pink-500', icon: '💫' },
  ambient: { bg: 'bg-slate-800/90', border: 'border-slate-500', icon: '💭' },
}

interface ThoughtBubbleProps {
  thought: VillagerThought
  x: number
  y: number
  onDismiss?: () => void
}

function ThoughtBubble({ thought, x, y, onDismiss }: ThoughtBubbleProps) {
  const style = THOUGHT_TYPE_STYLE[thought.type] || THOUGHT_TYPE_STYLE.ambient
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(showTimer)
  }, [])

  // Auto-dismiss after some time
  useEffect(() => {
    if (thought.type !== 'ambient') {
      const dismissTimer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => onDismiss?.(), 300)
      }, 5000)
      return () => clearTimeout(dismissTimer)
    }
  }, [thought.type, onDismiss])

  // Calculate safe position (keep bubble on screen)
  const bubbleStyle = useMemo(() => {
    const maxX = typeof window !== 'undefined' ? window.innerWidth - 200 : 800
    const safeX = Math.min(Math.max(20, x - 80), maxX)
    const safeY = Math.max(60, y - 60)
    
    return {
      left: safeX,
      top: safeY,
      transform: `translateY(${isVisible && !isExiting ? '0' : '-10px'})`,
      opacity: isVisible && !isExiting ? 1 : 0,
    }
  }, [x, y, isVisible, isExiting])

  return (
    <div
      className={`absolute z-50 max-w-[180px] transition-all duration-300 ease-out pointer-events-auto`}
      style={bubbleStyle}
    >
      {/* Bubble */}
      <div className={`${style.bg} ${style.border} border rounded-lg p-2 shadow-lg backdrop-blur-sm`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1 text-xs">
            <span>{style.icon}</span>
            <span className="text-slate-300 font-medium truncate">{thought.villagerName.split(' ')[0]}</span>
          </div>
          {onDismiss && thought.type !== 'ambient' && (
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Content */}
        <p className="text-xs text-white leading-relaxed">
          {thought.content}
        </p>
        
        {/* Thought type indicator */}
        {thought.type !== 'ambient' && (
          <div className="text-[10px] text-slate-400 mt-1 capitalize">{thought.type}</div>
        )}
      </div>

      {/* Bubble tail */}
      <div 
        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 
          border-l-[8px] border-r-[8px] border-t-[8px] 
          border-l-transparent border-r-transparent ${style.border.replace('border-', 'border-t-')}`}
      />
    </div>
  )
}

interface ThoughtBubblesProps {
  /** All villagers in the simulation */
  villagers: VillagerState[]
  /** Map of villager ID to their current thought */
  thoughts: Map<string, VillagerThought>
  /** Function to convert world coordinates to screen coordinates */
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number }
  /** Callback when a thought bubble is clicked */
  onThoughtClick?: (thought: VillagerThought) => void
  /** Show ambient thoughts (like "thinking..." or activity-based) */
  showAmbient?: boolean
  /** Maximum thoughts to show at once */
  maxBubbles?: number
}

export function ThoughtBubbles({
  villagers,
  thoughts,
  worldToScreen,
  onThoughtClick,
  showAmbient = false,
  maxBubbles = 5,
}: ThoughtBubblesProps) {
  const [dismissedThoughts, setDismissedThoughts] = useState<Set<string>>(new Set())

  // Reset dismissed thoughts when new thoughts come in
  useEffect(() => {
    setDismissedThoughts(new Set())
  }, [thoughts])

  // Get active thought bubbles
  const activeBubbles = useMemo(() => {
    const bubbles: Array<{
      thought: VillagerThought
      villager: VillagerState
      screen: { x: number; y: number }
    }> = []

    for (const villager of villagers) {
      const thought = thoughts.get(villager.id)
      if (!thought) continue
      
      // Skip ambient if disabled
      if (thought.type === 'ambient' && !showAmbient) continue
      
      // Skip dismissed thoughts
      const thoughtKey = `${villager.id}-${thought.timestamp}`
      if (dismissedThoughts.has(thoughtKey)) continue

      const screen = worldToScreen(villager.position_x, villager.position_y)
      
      // Only show if on screen (roughly)
      if (screen.x < -100 || screen.x > 1000 || screen.y < -100 || screen.y > 800) {
        continue
      }

      bubbles.push({ thought, villager, screen })
    }

    // Sort by timestamp (most recent first) and limit
    return bubbles
      .sort((a, b) => b.thought.timestamp - a.thought.timestamp)
      .slice(0, maxBubbles)
  }, [villagers, thoughts, worldToScreen, showAmbient, dismissedThoughts, maxBubbles])

  const handleDismiss = (villagerId: string, timestamp: number) => {
    setDismissedThoughts(prev => new Set(prev).add(`${villagerId}-${timestamp}`))
  }

  if (activeBubbles.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {activeBubbles.map(({ thought, villager, screen }) => (
        <ThoughtBubble
          key={`${villager.id}-${thought.timestamp}`}
          thought={thought}
          x={screen.x}
          y={screen.y}
          onDismiss={() => handleDismiss(villager.id, thought.timestamp)}
        />
      ))}
    </div>
  )
}

/**
 * Hook to manage thought bubbles from village events
 */
export function useThoughtBubbles() {
  const [thoughts, setThoughts] = useState<Map<string, VillagerThought>>(new Map())

  // Add a new thought for a villager
  const addThought = (thought: VillagerThought) => {
    setThoughts(prev => {
      const next = new Map(prev)
      next.set(thought.villagerId, thought)
      return next
    })
  }

  // Clear thought for a villager
  const clearThought = (villagerId: string) => {
    setThoughts(prev => {
      const next = new Map(prev)
      next.delete(villagerId)
      return next
    })
  }

  // Clear all thoughts
  const clearAll = () => {
    setThoughts(new Map())
  }

  // Process a thought event from the village events system
  const handleThoughtEvent = (event: {
    villagerId: string
    villagerName: string
    thoughtContent: string
    thoughtType: string
  }) => {
    addThought({
      villagerId: event.villagerId,
      villagerName: event.villagerName,
      content: event.thoughtContent,
      type: event.thoughtType as VillagerThought['type'],
      timestamp: Date.now(),
      isRecent: true,
    })
  }

  return {
    thoughts,
    addThought,
    clearThought,
    clearAll,
    handleThoughtEvent,
  }
}

export default ThoughtBubbles
