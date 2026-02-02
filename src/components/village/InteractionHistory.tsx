'use client'

/**
 * InteractionHistory - Displays recent villager interactions
 * 
 * Shows a scrollable list of recent interactions between villagers,
 * including trades, conversations, and other social activities.
 */

import { useState, useMemo } from 'react'

// Interaction type icons and colors
const INTERACTION_DISPLAY: Record<string, { icon: string; color: string; label: string }> = {
  greeting: { icon: '👋', color: 'text-blue-400', label: 'Greeting' },
  conversation: { icon: '💬', color: 'text-green-400', label: 'Conversation' },
  trade: { icon: '🤝', color: 'text-yellow-400', label: 'Trade' },
  help: { icon: '🆘', color: 'text-purple-400', label: 'Help' },
  gossip: { icon: '🗣️', color: 'text-pink-400', label: 'Gossip' },
  argument: { icon: '😤', color: 'text-red-400', label: 'Argument' },
  gift: { icon: '🎁', color: 'text-cyan-400', label: 'Gift' },
  purchase: { icon: '💰', color: 'text-yellow-500', label: 'Purchase' },
  payment: { icon: '💳', color: 'text-emerald-400', label: 'Payment' },
  default: { icon: '🔄', color: 'text-slate-400', label: 'Interaction' },
}

// Sentiment indicators
const SENTIMENT_DISPLAY = {
  positive: { icon: '😊', color: 'text-green-400', bg: 'bg-green-500/20' },
  neutral: { icon: '😐', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  negative: { icon: '😟', color: 'text-red-400', bg: 'bg-red-500/20' },
}

export interface VillageInteraction {
  id?: string
  type: string
  villager1_id: string
  villager1_name: string
  villager2_id: string
  villager2_name: string
  content?: string
  sentiment?: number
  location_x?: number
  location_y?: number
  amount?: number
  item?: string
  timestamp: string | number
}

interface InteractionHistoryProps {
  interactions: VillageInteraction[]
  maxItems?: number
  showFilters?: boolean
  onVillagerClick?: (villagerId: string) => void
  onInteractionClick?: (interaction: VillageInteraction) => void
  compact?: boolean
}

type FilterType = 'all' | 'social' | 'economic' | 'positive' | 'negative'

export function InteractionHistory({
  interactions,
  maxItems = 50,
  showFilters = true,
  onVillagerClick,
  onInteractionClick,
  compact = false,
}: InteractionHistoryProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter interactions
  const filteredInteractions = useMemo(() => {
    let filtered = [...interactions].slice(0, maxItems)

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter((i) => {
        const sentiment = i.sentiment ?? 0
        switch (filter) {
          case 'social':
            return ['greeting', 'conversation', 'gossip'].includes(i.type)
          case 'economic':
            return ['trade', 'purchase', 'payment', 'gift'].includes(i.type)
          case 'positive':
            return sentiment > 0.2
          case 'negative':
            return sentiment < -0.2
          default:
            return true
        }
      })
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (i) =>
          i.villager1_name?.toLowerCase().includes(term) ||
          i.villager2_name?.toLowerCase().includes(term) ||
          i.content?.toLowerCase().includes(term) ||
          i.type.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [interactions, maxItems, filter, searchTerm])

  // Get sentiment category
  const getSentimentCategory = (sentiment?: number): 'positive' | 'neutral' | 'negative' => {
    if (sentiment === undefined || sentiment === null) return 'neutral'
    if (sentiment > 0.2) return 'positive'
    if (sentiment < -0.2) return 'negative'
    return 'neutral'
  }

  // Format timestamp
  const formatTime = (timestamp: string | number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Less than a minute
    if (diff < 60000) return 'Just now'
    // Less than an hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    // Less than a day
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    // Otherwise
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Filter buttons
  const filterButtons: { id: FilterType; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'social', label: 'Social', icon: '💬' },
    { id: 'economic', label: 'Trade', icon: '💰' },
    { id: 'positive', label: 'Good', icon: '😊' },
    { id: 'negative', label: 'Bad', icon: '😤' },
  ]

  if (compact) {
    // Compact mode - simpler display for sidebar
    return (
      <div className="space-y-1">
        {filteredInteractions.length === 0 ? (
          <div className="text-center text-slate-400 py-4 text-sm">
            No interactions yet
          </div>
        ) : (
          filteredInteractions.slice(0, 10).map((interaction, index) => {
            const display = INTERACTION_DISPLAY[interaction.type] || INTERACTION_DISPLAY.default
            return (
              <div
                key={interaction.id || `${interaction.timestamp}-${index}`}
                className="flex items-start gap-2 bg-slate-700/30 rounded p-2 text-xs cursor-pointer hover:bg-slate-700/50 transition"
                onClick={() => onInteractionClick?.(interaction)}
              >
                <span>{display.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-300 truncate">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onVillagerClick?.(interaction.villager1_id)
                      }}
                      className="text-white hover:text-blue-400 transition"
                    >
                      {interaction.villager1_name.split(' ')[0]}
                    </button>
                    {' & '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onVillagerClick?.(interaction.villager2_id)
                      }}
                      className="text-white hover:text-blue-400 transition"
                    >
                      {interaction.villager2_name.split(' ')[0]}
                    </button>
                  </div>
                  <div className="text-slate-500">{formatTime(interaction.timestamp)}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700/50 p-3 border-b border-slate-600">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span>🤝</span>
          Interaction History
          <span className="text-sm text-slate-400 font-normal">
            ({filteredInteractions.length})
          </span>
        </h3>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 border-b border-slate-700 space-y-2">
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-1">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  filter === btn.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span className="mr-1">{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search interactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* Interaction list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredInteractions.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <div className="text-3xl mb-2">🤝</div>
            <div className="text-sm">No interactions found</div>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-blue-400 hover:text-blue-300 text-sm mt-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredInteractions.map((interaction, index) => {
              const display = INTERACTION_DISPLAY[interaction.type] || INTERACTION_DISPLAY.default
              const sentiment = getSentimentCategory(interaction.sentiment)
              const sentimentDisplay = SENTIMENT_DISPLAY[sentiment]

              return (
                <div
                  key={interaction.id || `${interaction.timestamp}-${index}`}
                  className="p-3 hover:bg-slate-700/30 transition cursor-pointer"
                  onClick={() => onInteractionClick?.(interaction)}
                >
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className={`text-xl ${display.color}`}>{display.icon}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Participants */}
                      <div className="flex items-center gap-1 flex-wrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onVillagerClick?.(interaction.villager1_id)
                          }}
                          className="font-medium text-white hover:text-blue-400 transition"
                        >
                          {interaction.villager1_name}
                        </button>
                        <span className="text-slate-500">&</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onVillagerClick?.(interaction.villager2_id)
                          }}
                          className="font-medium text-white hover:text-blue-400 transition"
                        >
                          {interaction.villager2_name}
                        </button>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${display.color} bg-slate-600/50`}>
                          {display.label}
                        </span>
                      </div>

                      {/* Interaction content/details */}
                      {interaction.content && (
                        <p className="text-sm text-slate-300 mt-1 line-clamp-2">
                          {interaction.content}
                        </p>
                      )}

                      {/* Trade/economic details */}
                      {(interaction.amount || interaction.item) && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          {interaction.item && (
                            <span className="bg-slate-600/50 px-2 py-0.5 rounded">
                              📦 {interaction.item}
                            </span>
                          )}
                          {interaction.amount !== undefined && interaction.amount > 0 && (
                            <span className="bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">
                              💰 {interaction.amount}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom row: sentiment & time */}
                      <div className="flex items-center justify-between mt-2">
                        {/* Sentiment */}
                        <div className={`flex items-center gap-1 text-xs ${sentimentDisplay.color}`}>
                          <span className={`px-1.5 py-0.5 rounded ${sentimentDisplay.bg}`}>
                            {sentimentDisplay.icon}
                            {interaction.sentiment !== undefined && (
                              <span className="ml-1">
                                {interaction.sentiment > 0 ? '+' : ''}
                                {(interaction.sentiment * 100).toFixed(0)}%
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Timestamp & location */}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {interaction.location_x !== undefined && (
                            <span>
                              📍 ({interaction.location_x}, {interaction.location_y})
                            </span>
                          )}
                          <span>{formatTime(interaction.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="bg-slate-700/30 px-3 py-2 border-t border-slate-700 text-xs text-slate-400 flex items-center justify-between">
        <span>Showing {filteredInteractions.length} of {interactions.length}</span>
        {interactions.length > 0 && (
          <span>
            Latest: {formatTime(interactions[0]?.timestamp)}
          </span>
        )}
      </div>
    </div>
  )
}

export default InteractionHistory
