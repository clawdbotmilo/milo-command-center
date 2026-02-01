'use client'

import { useEffect, useState } from 'react'

interface Task {
  name: string
  status: string
  description: string
}

interface CronJob {
  name: string
  enabled: boolean
  schedule: string
  nextRun: string | null
}

interface Skill {
  name: string
  emoji: string
}

interface StaticData {
  generatedAt: string
  system: {
    hostname: string
    os: string
    nodeVersion: string
    uptime: string
    model: string
    channel: string
    disk: { total: string; used: string; usedPercent: string }
    memory: { total: string; used: string; usedPercent: string }
  }
  cron: CronJob[]
  skills: Skill[]
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Not started': 'bg-gray-700 text-gray-300',
    'In progress': 'bg-blue-900 text-blue-300',
    'Done': 'bg-green-900 text-green-300',
    'Blocked': 'bg-red-900 text-red-300'
  }
  return colors[status] || 'bg-gray-700 text-gray-300'
}

export default function Home() {
  const [staticData, setStaticData] = useState<StaticData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch static data (cron, system, skills) - generated at build time
  useEffect(() => {
    fetch('/static-data.json')
      .then(res => res.json())
      .then(data => {
        setStaticData(data)
        setLoading(false)
      })
      .catch(e => {
        console.error('Failed to load static data:', e)
        setError('Failed to load dashboard data')
        setLoading(false)
      })
  }, [])

  // Fetch dynamic Notion tasks
  const fetchTasks = async () => {
    setTasksLoading(true)
    try {
      const response = await fetch('/api/tasks', { cache: 'no-store' })
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (e) {
      console.error('Failed to fetch tasks:', e)
    } finally {
      setTasksLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // Auto-refresh tasks every 30 seconds
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    )
  }

  if (error || !staticData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-400">{error || 'No data available'}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🌱</div>
          <div>
            <h1 className="text-3xl font-bold text-white">Milo Command Center</h1>
            <p className="text-gray-400">Personal AI Assistant Dashboard</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-green-500">
            <span className="w-2 h-2 bg-green-500 rounded-full pulse"></span>
            <span className="font-medium">Online</span>
          </div>
          <p className="text-sm text-gray-500 mono">
            System data: {new Date(staticData.generatedAt).toLocaleString()}
          </p>
          <button 
            onClick={fetchTasks}
            className="text-xs text-gray-500 hover:text-gray-300 mt-1"
          >
            ↻ Refresh Tasks
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Disk Usage</div>
          <div className="text-2xl font-bold">{staticData.system.disk.usedPercent}</div>
          <div className="text-sm text-gray-500">{staticData.system.disk.used} / {staticData.system.disk.total}</div>
        </div>
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Memory</div>
          <div className="text-2xl font-bold">{staticData.system.memory.usedPercent}</div>
          <div className="text-sm text-gray-500">{staticData.system.memory.used} / {staticData.system.memory.total}</div>
        </div>
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Active Cron Jobs</div>
          <div className="text-2xl font-bold">{staticData.cron.length}</div>
          <div className="text-sm text-gray-500">Scheduled tasks</div>
        </div>
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Skills Loaded</div>
          <div className="text-2xl font-bold">{staticData.skills.length}</div>
          <div className="text-sm text-gray-500">Available capabilities</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notion Tasks */}
        <div className="bg-milo-card border border-milo-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>📋</span> Notion Tasks
              {tasksLoading && <span className="text-xs text-gray-500">(refreshing...)</span>}
            </h2>
            <span className="text-sm text-gray-500 mono">{tasks.length} tasks</span>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No active tasks 🎉</div>
            ) : (
              tasks.map((task, i) => (
                <div key={i} className="bg-milo-dark rounded-lg p-3 border border-milo-border">
                  <div className="flex items-start justify-between">
                    <div className="font-medium">{task.name}</div>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <div className="text-sm text-gray-400 mt-1">{task.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cron Jobs */}
        <div className="bg-milo-card border border-milo-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>⏰</span> Cron Jobs
            </h2>
          </div>
          <div className="space-y-3">
            {staticData.cron.map((job, i) => (
              <div key={i} className="bg-milo-dark rounded-lg p-3 border border-milo-border">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{job.name}</div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    job.enabled ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {job.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mt-1 mono">{job.schedule}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-milo-card border border-milo-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>🛠️</span> Skills
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {staticData.skills.map((skill, i) => (
              <div key={i} className="bg-milo-dark rounded-lg p-2 border border-milo-border text-center">
                <div className="text-lg">{skill.emoji}</div>
                <div className="text-sm font-medium">{skill.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-milo-card border border-milo-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>💻</span> System Info
            </h2>
          </div>
          <div className="space-y-2 mono text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Host:</span>
              <span>{staticData.system.hostname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">OS:</span>
              <span>{staticData.system.os}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Node.js:</span>
              <span>{staticData.system.nodeVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uptime:</span>
              <span>{staticData.system.uptime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Model:</span>
              <span>{staticData.system.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Channel:</span>
              <span>{staticData.system.channel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Milo 🌱 — Jake&apos;s personal AI assistant</p>
        <p className="mt-1">
          Powered by{' '}
          <a href="https://github.com/clawdbot/clawdbot" className="text-green-500 hover:underline">
            Clawdbot
          </a>
        </p>
      </footer>
    </div>
  )
}
