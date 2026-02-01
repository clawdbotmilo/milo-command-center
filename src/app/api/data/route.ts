import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

async function fetchNotionTasks(): Promise<Task[]> {
  try {
    const keyPath = `${os.homedir()}/.config/notion/api_key`
    if (!fs.existsSync(keyPath)) return []
    
    const notionKey = fs.readFileSync(keyPath, 'utf8').trim()
    const response = await fetch(
      'https://api.notion.com/v1/data_sources/2fa57efe-1839-80b4-9edd-000b236269ce/query',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionKey}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            property: 'Status',
            status: { does_not_equal: 'Done' }
          }
        }),
        cache: 'no-store'
      }
    )
    
    const data = await response.json()
    return (data.results || []).map((page: any) => {
      const props = page.properties || {}
      return {
        name: props.Name?.title?.[0]?.plain_text || 'Untitled',
        status: props.Status?.status?.name || 'Not started',
        description: props.Description?.rich_text?.[0]?.plain_text || ''
      }
    })
  } catch (e) {
    console.error('Failed to fetch Notion tasks:', e)
    return []
  }
}

async function fetchCronJobs(): Promise<CronJob[]> {
  try {
    const result = execSync('clawdbot cron list --json 2>/dev/null', { encoding: 'utf8' })
    const data = JSON.parse(result)
    const jobs = Array.isArray(data) ? data : data.jobs || []
    
    return jobs.map((job: any) => {
      let schedule = 'Unknown'
      if (job.schedule?.kind === 'cron') {
        schedule = job.schedule.expr
      } else if (job.schedule?.kind === 'every') {
        const ms = job.schedule.everyMs
        if (ms >= 3600000) schedule = `Every ${ms / 3600000}h`
        else if (ms >= 60000) schedule = `Every ${ms / 60000}m`
        else schedule = `Every ${ms / 1000}s`
      }
      
      return {
        name: job.name || 'Unnamed',
        enabled: job.enabled !== false,
        schedule,
        nextRun: job.state?.nextRunAtMs 
          ? new Date(job.state.nextRunAtMs).toLocaleString()
          : null
      }
    })
  } catch (e) {
    console.error('Failed to fetch cron jobs:', e)
    return []
  }
}

function getSystemInfo() {
  try {
    const diskInfo = execSync("df -h / | tail -1", { encoding: 'utf8' }).split(/\s+/)
    const memInfo = execSync("free -h | grep Mem", { encoding: 'utf8' }).split(/\s+/)
    const memPercent = execSync("free | grep Mem | awk '{printf \"%.0f%%\", $3/$2 * 100}'", { encoding: 'utf8' })
    const uptime = execSync("uptime -p", { encoding: 'utf8' }).trim()
    
    return {
      hostname: os.hostname(),
      os: `${os.type()} ${os.release()}`,
      nodeVersion: process.version,
      uptime,
      model: 'claude-opus-4-5',
      channel: 'telegram',
      disk: {
        total: diskInfo[1] || '?',
        used: diskInfo[2] || '?',
        usedPercent: diskInfo[4] || '?'
      },
      memory: {
        total: memInfo[1] || '?',
        used: memInfo[2] || '?',
        usedPercent: memPercent || '?'
      }
    }
  } catch (e) {
    console.error('Failed to get system info:', e)
    return {
      hostname: os.hostname(),
      os: `${os.type()} ${os.release()}`,
      nodeVersion: process.version,
      uptime: 'Unknown',
      model: 'claude-opus-4-5',
      channel: 'telegram',
      disk: { total: '?', used: '?', usedPercent: '?' },
      memory: { total: '?', used: '?', usedPercent: '?' }
    }
  }
}

const skills: Skill[] = [
  { name: 'github', emoji: '🐙' },
  { name: 'himalaya', emoji: '📧' },
  { name: 'notion', emoji: '📝' },
  { name: 'slack', emoji: '💬' },
  { name: 'tmux', emoji: '🖥️' },
  { name: 'weather', emoji: '🌤️' },
  { name: 'skill-creator', emoji: '🛠️' },
  { name: 'bluebubbles', emoji: '💭' }
]

export async function GET() {
  const [tasks, cron] = await Promise.all([
    fetchNotionTasks(),
    fetchCronJobs()
  ])
  
  const system = getSystemInfo()
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    system,
    tasks,
    cron,
    skills
  })
}
