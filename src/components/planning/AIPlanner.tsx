'use client'

import { useState, useRef, useEffect } from 'react'

interface AIPlannerProps {
  projectName: string
  onPlanGenerated: (content: string) => void
  isGenerating?: boolean
}

export function AIPlanner({ projectName, onPlanGenerated, isGenerating = false }: AIPlannerProps) {
  const [idea, setIdea] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [idea])

  const handleGenerate = async () => {
    if (!idea.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          idea: idea.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate plan')
      }

      const data = await res.json()
      onPlanGenerated(data.plan)
      setIdea('') // Clear after success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
          <span className="text-white text-sm">✨</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">AI Planner</h3>
          <p className="text-xs text-gray-500">Describe your idea, I&apos;ll create the plan</p>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to build? e.g. 'Add user authentication with OAuth2 and session management'"
          className="w-full min-h-[80px] p-3 pr-12 text-sm rounded-xl border border-blue-200 
            bg-white/80 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-400 
            focus:border-transparent resize-none placeholder:text-gray-400"
          disabled={isLoading || isGenerating}
        />
        
        <button
          onClick={handleGenerate}
          disabled={!idea.trim() || isLoading || isGenerating}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 
            text-white flex items-center justify-center shadow-lg
            hover:from-blue-600 hover:to-indigo-700 transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-indigo-600
            active:scale-95"
          title="Generate plan (Ctrl+Enter)"
        >
          {isLoading || isGenerating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {(isLoading || isGenerating) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Generating your plan...</span>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">⌘↵</kbd> to generate
      </p>
    </div>
  )
}
