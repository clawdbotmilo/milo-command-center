'use client'

import { useState, useEffect } from 'react'

interface Capability {
  id: string
  name: string
  description: string
  category: string
  icon: string
  enabled: boolean
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  generation: { label: 'Generation', color: 'from-purple-500 to-pink-500' },
  communication: { label: 'Communication', color: 'from-blue-500 to-cyan-500' },
  data: { label: 'Data & APIs', color: 'from-green-500 to-emerald-500' },
  code: { label: 'Code & Execution', color: 'from-orange-500 to-amber-500' },
  system: { label: 'System', color: 'from-gray-500 to-slate-500' },
}

function CapabilityCard({ cap }: { cap: Capability }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-2xl">{cap.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 text-sm truncate">{cap.name}</h4>
          {cap.enabled ? (
            <span className="w-2 h-2 bg-green-500 rounded-full" title="Enabled" />
          ) : (
            <span className="w-2 h-2 bg-gray-300 rounded-full" title="Disabled" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cap.description}</p>
      </div>
    </div>
  )
}

function CategorySection({ category, capabilities }: { category: string; capabilities: Capability[] }) {
  const config = CATEGORY_LABELS[category] || { label: category, color: 'from-gray-500 to-gray-600' }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${config.color}`} />
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{config.label}</h3>
        <span className="text-xs text-gray-400">({capabilities.length})</span>
      </div>
      <div className="grid gap-2">
        {capabilities.map(cap => (
          <CapabilityCard key={cap.id} cap={cap} />
        ))}
      </div>
    </div>
  )
}

interface ToolboxProps {
  compact?: boolean
  className?: string
}

export function Toolbox({ compact = false, className = '' }: ToolboxProps) {
  const [capabilities, setCapabilities] = useState<Record<string, Capability[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(!compact)

  useEffect(() => {
    fetch('/api/capabilities')
      .then(res => res.json())
      .then(data => {
        setCapabilities(data.byCategory || {})
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const totalCount = Object.values(capabilities).flat().length
  const enabledCount = Object.values(capabilities).flat().filter(c => c.enabled).length

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-24" />
          <div className="h-16 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <span className="text-white text-sm">🧰</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 text-sm">Agent Toolbox</h3>
            <p className="text-xs text-gray-500">{enabledCount} of {totalCount} capabilities enabled</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(capabilities).map(([category, caps]) => (
            <CategorySection key={category} category={category} capabilities={caps} />
          ))}
        </div>
      )}
    </div>
  )
}
