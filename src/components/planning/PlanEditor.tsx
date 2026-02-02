'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AIPlannerChat } from './AIPlannerChat'
import { MarkdownPreview } from './MarkdownPreview'
import { TaskList } from './TaskList'
import { Toolbox } from './Toolbox'
import type { ProjectStatus } from '@/types/project'

type ViewMode = 'ai' | 'edit' | 'preview'

interface PlanEditorProps {
  projectName: string
  initialContent: string
  status: ProjectStatus
  onSave: (content: string) => Promise<boolean>
  isSaving?: boolean
}

export function PlanEditor({
  projectName,
  initialContent,
  status,
  onSave,
  isSaving = false,
}: PlanEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(initialContent ? 'preview' : 'ai')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contentRef = useRef(content)

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent)
    contentRef.current = initialContent
    setHasUnsavedChanges(false)
    setViewMode(initialContent ? 'preview' : 'ai')
  }, [initialContent, projectName])

  const isReadonly = status === 'FINALIZED' || status === 'EXECUTING'

  // Debounced auto-save
  const scheduleAutoSave = useCallback(() => {
    if (isReadonly) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      const currentContent = contentRef.current
      const success = await onSave(currentContent)
      if (success) {
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      }
    }, 2000)
  }, [onSave, isReadonly])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    contentRef.current = newContent
    setHasUnsavedChanges(true)
    scheduleAutoSave()
  }

  const handlePlanGenerated = async (plan: string) => {
    setContent(plan)
    contentRef.current = plan
    setViewMode('preview')
    // Auto-save the generated plan
    const success = await onSave(plan)
    if (success) {
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    }
  }

  const formatLastSaved = (date: Date) => {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diffSec < 5) return 'just now'
    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    return date.toLocaleTimeString()
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Mobile-friendly tab header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        {/* View mode tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('ai')}
            disabled={isReadonly}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'ai'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            } ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ✨ AI
          </button>
          <button
            onClick={() => setViewMode('edit')}
            disabled={isReadonly}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'edit'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            } ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'preview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👁️ View
          </button>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2 text-xs">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving
            </span>
          )}
          {!isSaving && hasUnsavedChanges && (
            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Unsaved</span>
          )}
          {!isSaving && !hasUnsavedChanges && lastSaved && (
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full">
              ✓ {formatLastSaved(lastSaved)}
            </span>
          )}
          {isReadonly && (
            <span className="text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
              🔒 {status}
            </span>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'ai' && !isReadonly && (
          <div className="h-full min-h-[400px] p-3 space-y-3 overflow-y-auto">
            <Toolbox className="flex-shrink-0" />
            <AIPlannerChat
              projectName={projectName}
              onPlanGenerated={handlePlanGenerated}
            />
          </div>
        )}

        {viewMode === 'edit' && !isReadonly && (
          <div className="h-full flex flex-col">
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Write your project plan in markdown..."
              className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none bg-white text-gray-900"
              spellCheck={false}
            />
          </div>
        )}

        {(viewMode === 'preview' || isReadonly) && (
          <div className="p-4">
            {content ? (
              <div className="prose prose-sm max-w-none">
                <MarkdownPreview content={content} />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No plan yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Use the AI planner to generate a plan, or write one manually.
                </p>
                {!isReadonly && (
                  <button
                    onClick={() => setViewMode('ai')}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ✨ Create with AI
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task summary footer - only show when there's content */}
      {content && (
        <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white p-3">
          <TaskList content={content} />
        </div>
      )}
    </div>
  )
}
