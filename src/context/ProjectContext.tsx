'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { mutate } from 'swr'
import { useEvents, type SSEEvent, type ConnectionStatus } from '@/hooks/useEvents'
import type { OrchestrationState } from '@/types/orchestration'

interface ProjectContextValue {
  /** Currently selected project name */
  selectedProject: string | null
  /** Set the selected project */
  selectProject: (project: string | null) => void
  /** Cached orchestration state for selected project */
  orchestrationState: OrchestrationState | null
  /** Set orchestration state */
  setOrchestrationState: (state: OrchestrationState | null) => void
  /** SSE connection status */
  connectionStatus: ConnectionStatus
  /** Most recent SSE event */
  lastEvent: SSEEvent | null
  /** Manually reconnect to SSE */
  reconnect: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

interface ProjectProviderProps {
  children: ReactNode
}

/**
 * Provider component for project state management with SSE integration
 * 
 * Wraps the application and provides:
 * - Selected project state
 * - Real-time SSE event handling
 * - Automatic SWR cache invalidation on relevant events
 */
export function ProjectProvider({ children }: ProjectProviderProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [orchestrationState, setOrchestrationState] = useState<OrchestrationState | null>(null)

  /**
   * Handle incoming SSE events and trigger appropriate revalidations
   */
  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'connected':
          // Connection established, no action needed
          break

        case 'plan_updated':
          // Revalidate project list (status might have changed)
          mutate('/api/projects')
          
          // Revalidate plan for affected project
          if (event.project) {
            mutate(`/api/projects/${encodeURIComponent(event.project)}/plan`)
            mutate(`/api/projects/${encodeURIComponent(event.project)}`)
          }
          break

        case 'orchestration_updated':
          // Revalidate orchestration state
          if (event.project) {
            mutate(`/api/orchestration/${encodeURIComponent(event.project)}`)
            // Also revalidate agents as running state may have changed
            mutate('/api/agents')
          }
          break

        case 'task_status_changed':
          // Revalidate orchestration state which contains task states
          if (event.project) {
            mutate(`/api/orchestration/${encodeURIComponent(event.project)}`)
          }
          // Also refresh agents in case a task started/completed
          mutate('/api/agents')
          break

        case 'agent_started':
        case 'agent_completed':
          // Revalidate agents
          mutate('/api/agents')
          // And orchestration state for the project
          if (event.project) {
            mutate(`/api/orchestration/${encodeURIComponent(event.project)}`)
          }
          break

        case 'project_created':
          // New project - revalidate project list
          mutate('/api/projects')
          break

        default:
          // Unknown event type, log it
          console.log('Unknown SSE event type:', event.type)
      }
    },
    []
  )

  const { status, lastEvent, reconnect } = useEvents({
    onEvent: handleEvent,
    autoReconnect: true,
    reconnectDelay: 3000,
    maxReconnectAttempts: 10,
  })

  const selectProject = useCallback((project: string | null) => {
    setSelectedProject(project)
    // Clear cached orchestration state when switching projects
    if (project !== selectedProject) {
      setOrchestrationState(null)
    }
  }, [selectedProject])

  const value = useMemo<ProjectContextValue>(
    () => ({
      selectedProject,
      selectProject,
      orchestrationState,
      setOrchestrationState,
      connectionStatus: status,
      lastEvent,
      reconnect,
    }),
    [selectedProject, selectProject, orchestrationState, status, lastEvent, reconnect]
  )

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

/**
 * Hook to access the project context
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { selectedProject, selectProject, connectionStatus } = useProjectContext()
 *   
 *   return (
 *     <div>
 *       <ConnectionIndicator status={connectionStatus} />
 *       <ProjectList onSelect={selectProject} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext)
  
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  
  return context
}

/**
 * Hook to get just the connection status
 */
export function useConnectionStatus(): ConnectionStatus {
  const context = useContext(ProjectContext)
  return context?.connectionStatus ?? 'disconnected'
}

/**
 * Hook to get the selected project
 */
export function useSelectedProject(): [string | null, (project: string | null) => void] {
  const context = useContext(ProjectContext)
  
  if (!context) {
    throw new Error('useSelectedProject must be used within a ProjectProvider')
  }
  
  return [context.selectedProject, context.selectProject]
}
