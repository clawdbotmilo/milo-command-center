'use client'

/**
 * VillagerInfoPanel - Detailed villager information panel
 * 
 * Shows status, inventory, relationships, and recent activity for a selected villager.
 */

import { useState } from 'react'
import type { VillagerState } from '@/lib/use-village-events'

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
  traveling: '🚶‍♂️',
  wandering: '🚶‍♀️',
  default: '❓',
}

// Mood colors
const MOOD_COLORS: Record<string, string> = {
  happy: 'text-green-400',
  content: 'text-blue-400',
  neutral: 'text-slate-400',
  tired: 'text-yellow-400',
  sad: 'text-purple-400',
  angry: 'text-red-400',
}

// Relationship level display
const RELATIONSHIP_DISPLAY: Record<string, { icon: string; color: string; label: string }> = {
  best_friend: { icon: '💜', color: 'text-purple-400', label: 'Best Friend' },
  friend: { icon: '💚', color: 'text-green-400', label: 'Friend' },
  acquaintance: { icon: '🤝', color: 'text-blue-400', label: 'Acquaintance' },
  neutral: { icon: '😐', color: 'text-slate-400', label: 'Neutral' },
  dislike: { icon: '😒', color: 'text-orange-400', label: 'Disliked' },
  enemy: { icon: '💔', color: 'text-red-400', label: 'Enemy' },
}

// Item type icons
const ITEM_TYPE_ICONS: Record<string, string> = {
  food: '🍖',
  tool: '🔧',
  material: '📦',
  goods: '🏷️',
  curiosity: '✨',
  keepsake: '💎',
  currency: '💰',
}

interface VillagerRelationship {
  otherId: string
  otherName: string
  affinity: number
  level: string
  trend?: string
}

interface VillagerInventoryItem {
  item: string
  quantity: number
  type?: string
}

interface VillagerThought {
  content: string
  type: string
  timestamp: string
}

interface VillagerInfoPanelProps {
  villager: VillagerState
  relationships?: VillagerRelationship[]
  inventory?: VillagerInventoryItem[]
  thoughts?: VillagerThought[]
  mood?: number
  energy?: number
  hunger?: number
  social?: number
  onClose?: () => void
  onVillagerClick?: (villagerId: string) => void
}

type TabType = 'status' | 'inventory' | 'relationships' | 'thoughts'

export function VillagerInfoPanel({
  villager,
  relationships = [],
  inventory = [],
  thoughts = [],
  mood = 50,
  energy = 50,
  hunger = 50,
  social = 50,
  onClose,
  onVillagerClick,
}: VillagerInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('status')

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'status', label: 'Status', icon: '📊' },
    { id: 'inventory', label: 'Items', icon: '🎒' },
    { id: 'relationships', label: 'Relations', icon: '❤️' },
    { id: 'thoughts', label: 'Thoughts', icon: '💭' },
  ]

  // Get affinity level from value
  const getAffinityLevel = (affinity: number): string => {
    if (affinity >= 90) return 'best_friend'
    if (affinity >= 70) return 'friend'
    if (affinity >= 50) return 'acquaintance'
    if (affinity >= 30) return 'neutral'
    if (affinity >= 15) return 'dislike'
    return 'enemy'
  }

  // Stat bar component
  const StatBar = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{icon} {label}</span>
        <span className="text-white">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 shadow-xl overflow-hidden w-80">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">
              {ROLE_ICONS[villager.role] || ROLE_ICONS.default}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{villager.name}</h3>
              <p className="text-sm text-slate-400 capitalize">{villager.role}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick status */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 bg-slate-600/50 px-2 py-1 rounded">
            <span>{STATUS_ICONS[villager.status] || STATUS_ICONS.default}</span>
            <span className="text-sm text-white capitalize">{villager.status}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-600/20 px-2 py-1 rounded">
            <span>💰</span>
            <span className="text-sm text-yellow-400">{villager.money}</span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition ${
              activeTab === tab.id
                ? 'text-white bg-slate-700/50 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {/* Status tab */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Vital stats */}
            <div className="space-y-3">
              <StatBar label="Mood" value={mood} color="bg-green-500" icon="😊" />
              <StatBar label="Energy" value={energy} color="bg-blue-500" icon="⚡" />
              <StatBar label="Hunger" value={100 - hunger} color="bg-yellow-500" icon="🍎" />
              <StatBar label="Social" value={social} color="bg-pink-500" icon="💬" />
            </div>

            {/* Location info */}
            <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">📍 Position</span>
                <span className="text-white">
                  ({villager.position_x}, {villager.position_y})
                </span>
              </div>
              {villager.home_x !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">🏠 Home</span>
                  <span className="text-white">
                    ({villager.home_x}, {villager.home_y})
                  </span>
                </div>
              )}
            </div>

            {/* Personality */}
            {villager.personality && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">🎭 Personality</div>
                <div className="text-sm text-white">{villager.personality}</div>
              </div>
            )}
          </div>
        )}

        {/* Inventory tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-2">
            {inventory.length === 0 ? (
              <div className="text-center text-slate-400 py-4">
                <div className="text-2xl mb-2">🎒</div>
                <div className="text-sm">No items in inventory</div>
              </div>
            ) : (
              inventory.map((item, index) => (
                <div
                  key={`${item.item}-${index}`}
                  className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {ITEM_TYPE_ICONS[item.type || 'goods'] || '📦'}
                    </span>
                    <div>
                      <div className="text-sm text-white">{item.item}</div>
                      {item.type && (
                        <div className="text-xs text-slate-400 capitalize">{item.type}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-300 font-medium">
                    ×{item.quantity}
                  </div>
                </div>
              ))
            )}
            <div className="text-xs text-slate-500 text-center pt-2">
              {inventory.reduce((sum, i) => sum + i.quantity, 0)} total items
            </div>
          </div>
        )}

        {/* Relationships tab */}
        {activeTab === 'relationships' && (
          <div className="space-y-2">
            {relationships.length === 0 ? (
              <div className="text-center text-slate-400 py-4">
                <div className="text-2xl mb-2">👥</div>
                <div className="text-sm">No relationships yet</div>
              </div>
            ) : (
              relationships
                .sort((a, b) => b.affinity - a.affinity)
                .map((rel) => {
                  const level = rel.level || getAffinityLevel(rel.affinity)
                  const display = RELATIONSHIP_DISPLAY[level] || RELATIONSHIP_DISPLAY.neutral
                  return (
                    <button
                      key={rel.otherId}
                      onClick={() => onVillagerClick?.(rel.otherId)}
                      className="w-full flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 rounded-lg p-2 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{display.icon}</span>
                        <div className="text-left">
                          <div className="text-sm text-white">{rel.otherName}</div>
                          <div className={`text-xs ${display.color}`}>{display.label}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white">{Math.round(rel.affinity)}</div>
                        {rel.trend && (
                          <div className={`text-xs ${
                            rel.trend === 'positive' ? 'text-green-400' : 
                            rel.trend === 'negative' ? 'text-red-400' : 'text-slate-400'
                          }`}>
                            {rel.trend === 'positive' ? '↑' : rel.trend === 'negative' ? '↓' : '—'}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })
            )}
          </div>
        )}

        {/* Thoughts tab */}
        {activeTab === 'thoughts' && (
          <div className="space-y-2">
            {thoughts.length === 0 ? (
              <div className="text-center text-slate-400 py-4">
                <div className="text-2xl mb-2">💭</div>
                <div className="text-sm">No recent thoughts</div>
              </div>
            ) : (
              thoughts.map((thought, index) => (
                <div
                  key={`thought-${index}`}
                  className="bg-slate-700/50 rounded-lg p-3"
                >
                  <div className="text-sm text-white italic">"{thought.content}"</div>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                    <span className="capitalize">{thought.type}</span>
                    <span>{new Date(thought.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default VillagerInfoPanel
