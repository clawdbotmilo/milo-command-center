import useSWR from 'swr'
import type { ProjectStatus } from '@/types/project'

export interface ProjectSummary {
  name: string
  status: ProjectStatus
  created: string
  updated: string
  taskCount: number
}

interface ProjectsResponse {
  projects: ProjectSummary[]
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
})

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<ProjectsResponse>(
    '/api/projects',
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Refresh every 30s for live status updates
    }
  )

  return {
    projects: data?.projects ?? [],
    isLoading,
    error,
    mutate,
  }
}
