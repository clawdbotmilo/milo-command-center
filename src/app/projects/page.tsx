'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { ProjectList } from '@/components/planning/ProjectList'
import { PlanEditor } from '@/components/planning/PlanEditor'
import { PlanControls } from '@/components/planning/PlanControls'
import { AgentStatusPanel } from '@/components/execution/AgentStatusPanel'
import { TaskQueuePanel } from '@/components/execution/TaskQueuePanel'
import { ProgressPanel } from '@/components/execution/ProgressPanel'
import { LoadingSpinner, LoadingSpinnerDark, ErrorMessage, EmptyState } from '@/components/ui'
import { usePlan } from '@/hooks/usePlan'
import { useTasks } from '@/hooks/useTasks'
import type { ProjectStatus } from '@/types/project'

interface ProjectDetails {
  name: string
  status: ProjectStatus
  created: string
  updated: string
}

function PlanningView({
  projectName,
  status,
  onStatusChange,
}: {
  projectName: string
  status: ProjectStatus
  onStatusChange: () => void
}) {
  const { content, isLoading, save, isSaving } = usePlan(projectName)

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-gray-100 rounded-lg" />
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <LoadingSpinner label="Loading plan..." />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col animate-fadeIn">
      <PlanControls
        projectName={projectName}
        status={status}
        onStatusChange={onStatusChange}
      />
      <div className="flex-1 min-h-0">
        <PlanEditor
          projectName={projectName}
          initialContent={content}
          status={status}
          onSave={save}
          isSaving={isSaving}
        />
      </div>
    </div>
  )
}

function ExecutionView({ projectName }: { projectName: string }) {
  const { tasks, tasksByStatus, isLoading } = useTasks(projectName)

  // Calculate progress
  const totalTasks = tasks.length
  const completedTasks = tasksByStatus.DONE.length

  // Get recently completed (last 5)
  const recentlyCompleted = tasksByStatus.DONE
    .filter((t) => t.completed)
    .sort((a, b) => {
      const dateA = a.completed ? new Date(a.completed).getTime() : 0
      const dateB = b.completed ? new Date(b.completed).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      name: t.name,
      completedAt: t.completed || new Date().toISOString(),
    }))

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-64 bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
          <LoadingSpinnerDark size="md" />
        </div>
        <div className="h-64 bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top row: Agent Status and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-children">
        <div className="bg-milo-card border border-milo-border rounded-xl p-6 transition-shadow duration-300 hover:shadow-lg">
          <AgentStatusPanel />
        </div>
        <ProgressPanel
          totalTasks={totalTasks}
          completedTasks={completedTasks}
          recentlyCompleted={recentlyCompleted}
        />
      </div>

      {/* Bottom: Task Queue */}
      <TaskQueuePanel projectName={projectName} refreshInterval={5000} />
    </div>
  )
}

function NoProjectSelected() {
  return (
    <EmptyState
      icon="📋"
      title="No Project Selected"
      description="Select a project from the sidebar to view its plan and execution status, or create a new project to get started."
      className="h-full"
    />
  )
}

function ProjectLoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size="lg" label="Loading project..." />
    </div>
  )
}

function ProjectErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <ErrorMessage
      title="Failed to Load Project"
      message={message}
      onRetry={onRetry}
      className="h-full"
    />
  )
}

function PageLoadingFallback() {
  return (
    <div className="bg-milo-dark min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <LoadingSpinnerDark size="lg" label="Loading projects..." />
    </div>
  )
}

function ProjectsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)

  // Sync selection from URL
  useEffect(() => {
    const projectFromUrl = searchParams.get('project')
    if (projectFromUrl && projectFromUrl !== selectedProject) {
      setSelectedProject(projectFromUrl)
    }
  }, [searchParams, selectedProject])

  // Fetch project details when selection changes
  useEffect(() => {
    if (!selectedProject) {
      setProjectDetails(null)
      return
    }

    const fetchProject = async () => {
      setIsLoadingProject(true)
      setProjectError(null)

      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(selectedProject)}`)
        if (!res.ok) {
          throw new Error('Failed to fetch project')
        }
        const data = await res.json()
        setProjectDetails({
          name: data.name,
          status: data.status,
          created: data.created,
          updated: data.updated,
        })
      } catch (err) {
        setProjectError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoadingProject(false)
      }
    }

    fetchProject()
  }, [selectedProject])

  const handleProjectSelect = (projectName: string) => {
    setSelectedProject(projectName)
    router.push(`/projects?project=${encodeURIComponent(projectName)}`, {
      scroll: false,
    })
  }

  const handleStatusChange = async () => {
    // Refetch project details to get updated status
    if (selectedProject) {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(selectedProject)}`)
        if (res.ok) {
          const data = await res.json()
          setProjectDetails({
            name: data.name,
            status: data.status,
            created: data.created,
            updated: data.updated,
          })
        }
      } catch (err) {
        console.error('Failed to refresh project status:', err)
      }
    }
  }

  // Determine which view to show based on project status
  const renderMainContent = () => {
    if (!selectedProject) {
      return <NoProjectSelected />
    }

    if (isLoadingProject) {
      return <ProjectLoadingState />
    }

    if (projectError) {
      return (
        <ProjectErrorState
          message={projectError}
          onRetry={() => setSelectedProject(selectedProject)}
        />
      )
    }

    if (!projectDetails) {
      return <NoProjectSelected />
    }

    // Show planning view for DRAFT and FINALIZED
    if (projectDetails.status === 'DRAFT' || projectDetails.status === 'FINALIZED') {
      return (
        <PlanningView
          projectName={projectDetails.name}
          status={projectDetails.status}
          onStatusChange={handleStatusChange}
        />
      )
    }

    // Show execution view for EXECUTING and COMPLETED
    if (projectDetails.status === 'EXECUTING' || projectDetails.status === 'COMPLETED') {
      return (
        <div className="space-y-4 animate-fadeIn">
          <PlanControls
            projectName={projectDetails.name}
            status={projectDetails.status}
            onStatusChange={handleStatusChange}
          />
          <ExecutionView projectName={projectDetails.name} />
        </div>
      )
    }

    return <NoProjectSelected />
  }

  return (
    <div className="bg-milo-dark min-h-[calc(100vh-4rem)]">
      <ProjectLayout
        sidebar={
          <ProjectList
            selectedProject={selectedProject ?? undefined}
            onSelect={handleProjectSelect}
          />
        }
      >
        {renderMainContent()}
      </ProjectLayout>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ProjectsPageContent />
    </Suspense>
  )
}
