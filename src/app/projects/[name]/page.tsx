'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const name = params.name as string

  useEffect(() => {
    // Redirect to projects page with the project selected
    if (name) {
      router.replace(`/projects?project=${encodeURIComponent(name)}`)
    } else {
      router.replace('/projects')
    }
  }, [name, router])

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-milo-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-milo-green border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Loading project...</p>
      </div>
    </div>
  )
}
