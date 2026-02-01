import useSWR from 'swr'

export interface RunningAgent {
  taskId: string
  project: string
  model: 'sonnet' | 'opus'
  started: string
}

export interface AgentsData {
  agents: RunningAgent[]
  availableSlots: number
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch agents')
  return res.json()
})

export function useAgents() {
  const { data, error, isLoading, mutate } = useSWR<AgentsData>(
    '/api/agents',
    fetcher,
    {
      refreshInterval: 5000, // Auto-refresh every 5 seconds
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  return {
    agents: data?.agents ?? [],
    availableSlots: data?.availableSlots ?? 3,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}
