'use client'

import { useState } from 'react'
import { useProjects, ProjectSummary } from '@/hooks/useProjects'
import type { ProjectStatus } from '@/types/project'
import { NewProjectModal } from './NewProjectModal'
import { LoadingSpinner, ErrorMessage, EmptyState } from '@/components/ui'

interface ProjectListProps {
  selectedProject?: string
  onSelect: (projectName: string) => void
}

const STATUS_ORDER: ProjectStatus[] = ['EXECUTING', 'DRAFT', 'FINALIZED', 'COMPLETED']

const STATUS_CONFIG: Record<ProjectStatus, { label: string; badgeClass: string }> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  FINALIZED: {
    label: 'Ready',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  EXECUTING: {
    label: 'Running',
    badgeClass: 'bg-green-100 text-green-700 border-green-300 animate-pulse',
  },
  COMPLETED: {
    label: 'Done',
    badgeClass: 'bg-green-50 text-green-600 border-green-200',
  },
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border transition-all duration-200 ${config.badgeClass}`}
    >
      {config.label}
    </span>
  )
}

function ProjectItem({
  project,
  isSelected,
  onSelect,
}: {
  project: ProjectSummary
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        isSelected
          ? 'bg-blue-50 border border-blue-200 shadow-sm'
          : 'hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm active:scale-[0.98]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`font-medium truncate text-sm transition-colors duration-200 ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
          {project.name}
        </span>
        <StatusBadge status={project.status} />
      </div>
      {project.taskCount > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          {project.taskCount} task{project.taskCount !== 1 ? 's' : ''}
        </div>
      )}
    </button>
  )
}

function ProjectGroup({
  status,
  projects,
  selectedProject,
  onSelect,
}: {
  status: ProjectStatus
  projects: ProjectSummary[]
  selectedProject?: string
  onSelect: (name: string) => void
}) {
  if (projects.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
        {STATUS_CONFIG[status].label}
      </h3>
      <div className="space-y-1">
        {projects.map((project) => (
          <ProjectItem
            key={project.name}
            project={project}
            isSelected={selectedProject === project.name}
            onSelect={() => onSelect(project.name)}
          />
        ))}
      </div>
    </div>
  )
}

export function ProjectList({ selectedProject, onSelect }: ProjectListProps) {
  const { projects, isLoading, error, mutate } = useProjects()
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)

  // Group projects by status
  const projectsByStatus = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = projects.filter((p) => p.status === status)
      return acc
    },
    {} as Record<ProjectStatus, ProjectSummary[]>
  )

  const handleProjectCreated = () => {
    mutate() // Refresh the projects list
    setShowNewProjectModal(false)
  }

  return (
    <div className="w-[250px] h-full border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Project
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <LoadingSpinner size="sm" className="py-8" />
        ) : error ? (
          <ErrorMessage
            message="Failed to load projects"
            onRetry={() => mutate()}
            variant="compact"
            className="py-8 px-4 flex-col items-center"
          />
        ) : projects.length === 0 ? (
          <EmptyState
            icon="📁"
            title="No projects yet"
            description="Create one to get started"
            variant="compact"
            action={{
              label: 'Create Project',
              onClick: () => setShowNewProjectModal(true),
            }}
          />
        ) : (
          <div className="animate-fadeIn">
            {STATUS_ORDER.map((status) => (
              <ProjectGroup
                key={status}
                status={status}
                projects={projectsByStatus[status]}
                selectedProject={selectedProject}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}
