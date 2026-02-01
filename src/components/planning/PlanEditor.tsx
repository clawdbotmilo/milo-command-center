'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MarkdownPreview } from './MarkdownPreview'
import { TaskList } from './TaskList'
import type { ProjectStatus } from '@/types/project'

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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contentRef = useRef(content)

  // Update content when initialContent changes (e.g., project switch)
  useEffect(() => {
    setContent(initialContent)
    contentRef.current = initialContent
    setHasUnsavedChanges(false)
  }, [initialContent, projectName])

  // Check if editing is disabled
  const isReadonly = status === 'FINALIZED' || status === 'EXECUTING'

  // Debounced auto-save
  const scheduleAutoSave = useCallback(() => {
    if (isReadonly) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Schedule new save in 2 seconds
    saveTimeoutRef.current = setTimeout(async () => {
      const currentContent = contentRef.current
      const success = await onSave(currentContent)
      if (success) {
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      }
    }, 2000)
  }, [onSave, isReadonly])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    contentRef.current = newContent
    setHasUnsavedChanges(true)
    scheduleAutoSave()
  }

  // Format last saved time
  const formatLastSaved = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    
    if (diffSec < 5) return 'just now'
    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    return date.toLocaleTimeString()
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 lg:px-4 py-2 gap-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Plan Editor</h2>
          {isReadonly && (
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full border border-yellow-300">
              Read Only ({status})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isSaving && (
            <span className="flex items-center gap-1 text-blue-600">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          )}
          {!isSaving && hasUnsavedChanges && (
            <span className="text-yellow-600">Unsaved changes</span>
          )}
          {!isSaving && !hasUnsavedChanges && lastSaved && (
            <span className="text-gray-500">
              Saved {formatLastSaved(lastSaved)}
            </span>
          )}
        </div>
      </div>

      {/* Split Editor/Preview - stacks on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Editor Pane */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 min-w-0 min-h-[200px] lg:min-h-0">
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Editor
            </span>
          </div>
          <textarea
            value={content}
            onChange={handleChange}
            disabled={isReadonly}
            placeholder={
              isReadonly
                ? 'Plan is locked while project is ' + status.toLowerCase()
                : 'Write your project plan in markdown...'
            }
            className={`flex-1 w-full p-3 lg:p-4 font-mono text-sm resize-none focus:outline-none ${
              isReadonly
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'bg-white text-gray-900'
            }`}
            spellCheck={false}
          />
        </div>

        {/* Preview Pane */}
        <div className="flex-1 flex flex-col min-w-0 min-h-[200px] lg:min-h-0">
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Preview
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 lg:p-4">
            {content ? (
              <MarkdownPreview content={content} />
            ) : (
              <div className="text-gray-400 text-sm italic">
                Start typing to see preview...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task List Footer */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <TaskList content={content} />
      </div>
    </div>
  )
}
