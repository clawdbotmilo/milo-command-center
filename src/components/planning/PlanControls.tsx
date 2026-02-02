'use client'

import { useState } from 'react'
import { ConfirmModal } from './ConfirmModal'
import type { ProjectStatus } from '@/types/project'

interface PlanControlsProps {
  projectName: string
  status: ProjectStatus
  onStatusChange: () => void
}

type ActionState = 'idle' | 'loading' | 'success' | 'error'

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'gray', icon: '📝' },
  FINALIZED: { label: 'Ready', color: 'green', icon: '✅' },
  EXECUTING: { label: 'Running', color: 'blue', icon: '⚡' },
  COMPLETED: { label: 'Done', color: 'purple', icon: '🎉' },
}

export function PlanControls({ projectName, status, onStatusChange }: PlanControlsProps) {
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [showStartModal, setShowStartModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const config = STATUS_CONFIG[status]

  const doAction = async (endpoint: string, successCallback?: () => void) => {
    setActionState('loading')
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/${endpoint}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      
      setActionState('success')
      onStatusChange()
      successCallback?.()
      setTimeout(() => setActionState('idle'), 1500)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed')
      setActionState('error')
      setTimeout(() => { setActionState('idle'); setErrorMsg(null) }, 3000)
    }
  }

  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700 border-gray-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    purple: 'bg-purple-100 text-purple-700 border-purple-300',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${colorClasses[config.color as keyof typeof colorClasses]}`}>
          <span>{config.icon}</span>
          <span>{config.label}</span>
          {status === 'EXECUTING' && (
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {status === 'DRAFT' && (
            <button
              onClick={() => doAction('finalize')}
              disabled={actionState === 'loading'}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 touch-target no-select transition-all active:scale-95"
            >
              {actionState === 'loading' ? '...' : '✓ Finalize'}
            </button>
          )}

          {status === 'FINALIZED' && (
            <>
              <button
                onClick={() => doAction('revert')}
                disabled={actionState === 'loading'}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 touch-target no-select transition-all active:scale-95"
              >
                ← Edit
              </button>
              <button
                onClick={() => setShowStartModal(true)}
                disabled={actionState === 'loading'}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 touch-target no-select transition-all active:scale-95"
              >
                ▶ Start
              </button>
            </>
          )}

          {status === 'EXECUTING' && (
            <span className="text-sm text-gray-500">🔒 In progress...</span>
          )}

          {status === 'COMPLETED' && (
            <span className="text-sm text-purple-600">All tasks complete!</span>
          )}
        </div>
      </div>

      {/* Error feedback */}
      {errorMsg && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Start confirmation */}
      {showStartModal && (
        <ConfirmModal
          title="Start Execution?"
          message="This will lock the plan and begin running tasks. Make sure your plan is ready!"
          confirmText="Start"
          cancelText="Cancel"
          onConfirm={() => doAction('start', () => setShowStartModal(false))}
          onCancel={() => setShowStartModal(false)}
          isLoading={actionState === 'loading'}
          variant="danger"
        />
      )}
    </div>
  )
}
