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

interface SystemInfo {
  hostname: string
  os: string
  nodeVersion: string
  uptime: string
  model: string
  channel: string
  disk: { total: string; used: string; usedPercent: string }
  memory: { total: string; used: string; usedPercent: string }
}

interface JournalEntry {
  date: string
  preview: string
  content: string
}

const SKILLS: Skill[] = [
  { name: 'github', emoji: '🐙' },
  { name: 'himalaya', emoji: '📧' },
  { name: 'notion', emoji: '📝' },
  { name: 'slack', emoji: '💬' },
  { name: 'tmux', emoji: '🖥️' },
  { name: 'weather', emoji: '🌤️' },
  { name: 'skill-creator', emoji: '🛠️' },
  { name: 'bluebubbles', emoji: '💭' }
]

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
  const [system, setSystem] = useState<SystemInfo | null>(null)
  const [cron, setCron] = useState<CronJob[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  const fetchAll = async () => {
    try {
      const [systemRes, cronRes, tasksRes, journalRes] = await Promise.all([
        fetch('/api/system', { cache: 'no-store' }).catch(() => null),
        fetch('/api/cron', { cache: 'no-store' }).catch(() => null),
        fetch('/api/tasks', { cache: 'no-store' }),
        fetch('/api/journal', { cache: 'no-store' }).catch(() => null)
      ])

      if (systemRes?.ok) {
        const systemData = await systemRes.json()
        setSystem(systemData)
      }

      if (cronRes?.ok) {
        const cronData = await cronRes.json()
        setCron(cronData.cron || [])
      }

      if (journalRes?.ok) {
        const journalData = await journalRes.json()
        setJournal(journalData.entries || [])
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData.tasks || [])
      }

      setLastUpdated(new Date().toLocaleString())
    } catch (e) {
      console.error('Failed to fetch data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
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
            Updated: {lastUpdated}
          </p>
          <button 
            onClick={fetchAll}
            className="text-xs text-gray-500 hover:text-gray-300 mt-1"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Disk Usage</div>
          <div className="text-2xl font-bold">{system?.disk.usedPercent || '—'}</div>
          <div className="text-sm text-gray-500">{system ? `${system.disk.used} / ${system.disk.total}` : '—'}</div>
        </div>
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Memory</div>
          <div className="text-2xl font-bold">{system?.memory.usedPercent || '—'}</div>
          <div className="text-sm text-gray-500">{system ? `${system.memory.used} / ${system.memory.total}` : '—'}</div>
        </div>
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Active Cron Jobs</div>
          <div className="text-2xl font-bold">{cron.length || '—'}</div>
          <div className="text-sm text-gray-500">Scheduled tasks</div>
        </div>
        <div className="bg-milo-card border border-milo-border rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Skills Loaded</div>
          <div className="text-2xl font-bold">{SKILLS.length}</div>
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
            {cron.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No cron jobs</div>
            ) : (
              cron.map((job, i) => (
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
                  {job.nextRun && (
                    <div className="text-xs text-gray-500 mt-1">Next: {job.nextRun}</div>
                  )}
                </div>
              ))
            )}
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
            {SKILLS.map((skill, i) => (
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
              <span>{system?.hostname || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">OS:</span>
              <span>{system?.os || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Node.js:</span>
              <span>{system?.nodeVersion || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uptime:</span>
              <span>{system?.uptime || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Model:</span>
              <span>{system?.model || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Channel:</span>
              <span>{system?.channel || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="mt-6 bg-milo-card border border-milo-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>📔</span> Journal
          </h2>
          <span className="text-sm text-gray-500">{journal.length} entries</span>
        </div>
        <div className="space-y-3">
          {journal.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No journal entries yet</div>
          ) : (
            journal.map((entry) => (
              <div 
                key={entry.date} 
                className="bg-milo-dark rounded-lg p-4 border border-milo-border cursor-pointer hover:border-green-500/50 transition-colors"
                onClick={() => setExpandedEntry(expandedEntry === entry.date ? null : entry.date)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-400">{entry.date}</span>
                  <span className="text-xs text-gray-500">{expandedEntry === entry.date ? '▼' : '▶'}</span>
                </div>
                {expandedEntry === entry.date ? (
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{entry.content}</div>
                ) : (
                  <div className="text-sm text-gray-400">{entry.preview}...</div>
                )}
              </div>
            ))
          )}
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
