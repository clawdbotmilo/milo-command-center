'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

interface PlanResponse {
  content: string
}

const fetcher = async (url: string): Promise<PlanResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404) {
      return { content: '' }
    }
    throw new Error('Failed to fetch plan')
  }
  return res.json()
}

export function usePlan(projectName: string | null) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR<PlanResponse>(
    projectName ? `/api/projects/${encodeURIComponent(projectName)}/plan` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const save = useCallback(
    async (content: string): Promise<boolean> => {
      if (!projectName) return false

      setIsSaving(true)
      setSaveError(null)

      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectName)}/plan`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          }
        )

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save plan')
        }

        // Update local cache without revalidating
        mutate({ content }, false)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save plan'
        setSaveError(message)
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [projectName, mutate]
  )

  return {
    content: data?.content ?? '',
    isLoading,
    error,
    save,
    isSaving,
    saveError,
    mutate,
  }
}
