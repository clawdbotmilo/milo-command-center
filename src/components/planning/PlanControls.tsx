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

interface ActionFeedback {
  state: ActionState
  message?: string
}

export function PlanControls({
  projectName,
  status,
  onStatusChange,
}: PlanControlsProps) {
  const [finalizeFeedback, setFinalizeFeedback] = useState<ActionFeedback>({ state: 'idle' })
  const [revertFeedback, setRevertFeedback] = useState<ActionFeedback>({ state: 'idle' })
  const [startFeedback, setStartFeedback] = useState<ActionFeedback>({ state: 'idle' })
  const [showStartModal, setShowStartModal] = useState(false)

  // Finalize plan (DRAFT -> FINALIZED)
  const handleFinalize = async () => {
    setFinalizeFeedback({ state: 'loading' })
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/finalize`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to finalize plan')
      }
      
      setFinalizeFeedback({ state: 'success', message: 'Plan finalized!' })
      onStatusChange()
      
      // Clear feedback after a moment
      setTimeout(() => setFinalizeFeedback({ state: 'idle' }), 2000)
    } catch (error) {
      setFinalizeFeedback({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to finalize',
      })
      setTimeout(() => setFinalizeFeedback({ state: 'idle' }), 3000)
    }
  }

  // Revert to draft (FINALIZED -> DRAFT)
  const handleRevert = async () => {
    setRevertFeedback({ state: 'loading' })
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/revert`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revert plan')
      }
      
      setRevertFeedback({ state: 'success', message: 'Reverted to draft!' })
      onStatusChange()
      
      setTimeout(() => setRevertFeedback({ state: 'idle' }), 2000)
    } catch (error) {
      setRevertFeedback({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to revert',
      })
      setTimeout(() => setRevertFeedback({ state: 'idle' }), 3000)
    }
  }

  // Start execution (FINALIZED -> EXECUTING)
  const handleStartExecution = async () => {
    setStartFeedback({ state: 'loading' })
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/start`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start execution')
      }
      
      setShowStartModal(false)
      setStartFeedback({ state: 'success', message: 'Execution started!' })
      onStatusChange()
      
      setTimeout(() => setStartFeedback({ state: 'idle' }), 2000)
    } catch (error) {
      setStartFeedback({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to start',
      })
      setShowStartModal(false)
      setTimeout(() => setStartFeedback({ state: 'idle' }), 3000)
    }
  }

  // Status badge styling
  const getStatusBadge = () => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Draft
          </span>
        )
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Finalized
          </span>
        )
      case 'EXECUTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-300">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Executing
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 border border-purple-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Completed
          </span>
        )
    }
  }

  // Feedback message component
  const FeedbackMessage = ({ feedback }: { feedback: ActionFeedback }) => {
    if (feedback.state === 'idle') return null
    
    if (feedback.state === 'success') {
      return (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {feedback.message}
        </span>
      )
    }
    
    if (feedback.state === 'error') {
      return (
        <span className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {feedback.message}
        </span>
      )
    }
    
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Display */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          {getStatusBadge()}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* DRAFT state: Show Finalize button */}
          {status === 'DRAFT' && (
            <>
              <button
                onClick={handleFinalize}
                disabled={finalizeFeedback.state === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {finalizeFeedback.state === 'loading' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Finalize Plan
              </button>
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Execution
              </button>
              <FeedbackMessage feedback={finalizeFeedback} />
            </>
          )}

          {/* FINALIZED state: Show Revert and Start buttons */}
          {status === 'FINALIZED' && (
            <>
              <button
                onClick={handleRevert}
                disabled={revertFeedback.state === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {revertFeedback.state === 'loading' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                )}
                Revert to Draft
              </button>
              <button
                onClick={() => setShowStartModal(true)}
                disabled={startFeedback.state === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startFeedback.state === 'loading' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                Start Execution
              </button>
              <FeedbackMessage feedback={revertFeedback} />
              <FeedbackMessage feedback={startFeedback} />
            </>
          )}

          {/* EXECUTING state: Show locked message */}
          {status === 'EXECUTING' && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Plan is locked. View progress below.
            </div>
          )}

          {/* COMPLETED state: Show completion message */}
          {status === 'COMPLETED' && (
            <div className="text-sm text-purple-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Project completed successfully!
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Start Execution */}
      {showStartModal && (
        <ConfirmModal
          title="Start Execution"
          message="Are you sure you want to start execution? This will lock the plan and begin running tasks. This action cannot be undone."
          confirmText="Start Execution"
          cancelText="Cancel"
          onConfirm={handleStartExecution}
          onCancel={() => setShowStartModal(false)}
          isLoading={startFeedback.state === 'loading'}
          variant="danger"
        />
      )}
    </div>
  )
}
