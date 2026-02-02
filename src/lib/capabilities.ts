/**
 * Agent capabilities registry
 * Lists all tools/skills available to the agent system
 */

export interface Capability {
  id: string
  name: string
  description: string
  category: 'generation' | 'communication' | 'data' | 'code' | 'system'
  icon: string
  enabled: boolean
  config?: Record<string, unknown>
}

export const capabilities: Capability[] = [
  // Generation
  {
    id: 'image-gen',
    name: 'Image Generation',
    description: 'Generate images from text prompts using Gemini/Nano Banana',
    category: 'generation',
    icon: '🎨',
    enabled: true,
    config: { model: 'gemini-2.0-flash-exp-image-generation' }
  },
  {
    id: 'tts',
    name: 'Text-to-Speech',
    description: 'Convert text to natural speech using ElevenLabs',
    category: 'generation',
    icon: '🔊',
    enabled: true,
    config: { voice: 'George' }
  },
  
  // Communication
  {
    id: 'telegram',
    name: 'Telegram Messaging',
    description: 'Send messages, images, and files via Telegram',
    category: 'communication',
    icon: '💬',
    enabled: true
  },
  {
    id: 'email',
    name: 'Email (Himalaya)',
    description: 'Read and send emails via IMAP/SMTP',
    category: 'communication',
    icon: '📧',
    enabled: true
  },
  
  // Data & APIs
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web using Brave Search API',
    category: 'data',
    icon: '🔍',
    enabled: true
  },
  {
    id: 'web-fetch',
    name: 'Web Fetch',
    description: 'Fetch and extract content from URLs',
    category: 'data',
    icon: '🌐',
    enabled: true
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read and write to Notion databases and pages',
    category: 'data',
    icon: '📝',
    enabled: true
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, PRs via gh CLI',
    category: 'data',
    icon: '🐙',
    enabled: true
  },
  
  // Code & Execution
  {
    id: 'code-exec',
    name: 'Code Execution',
    description: 'Run shell commands and scripts',
    category: 'code',
    icon: '⚡',
    enabled: true
  },
  {
    id: 'file-ops',
    name: 'File Operations',
    description: 'Read, write, and edit files',
    category: 'code',
    icon: '📁',
    enabled: true
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Spawn Claude Code sessions for complex coding tasks',
    category: 'code',
    icon: '🤖',
    enabled: true
  },
  
  // System
  {
    id: 'cron',
    name: 'Scheduled Tasks',
    description: 'Schedule and manage cron jobs',
    category: 'system',
    icon: '⏰',
    enabled: true
  },
  {
    id: 'memory',
    name: 'Memory System',
    description: 'Persistent memory storage and recall',
    category: 'system',
    icon: '🧠',
    enabled: true
  },
  {
    id: 'browser',
    name: 'Browser Control',
    description: 'Automate browser interactions',
    category: 'system',
    icon: '🖥️',
    enabled: true
  }
]

export function getCapabilitiesByCategory() {
  const grouped: Record<string, Capability[]> = {}
  for (const cap of capabilities) {
    if (!grouped[cap.category]) grouped[cap.category] = []
    grouped[cap.category].push(cap)
  }
  return grouped
}

export function getEnabledCapabilities() {
  return capabilities.filter(c => c.enabled)
}

export function getCapabilityById(id: string) {
  return capabilities.find(c => c.id === id)
}

// Format capabilities for AI context
export function formatCapabilitiesForAI(): string {
  const enabled = getEnabledCapabilities()
  const lines = ['Available capabilities/tools:', '']
  
  for (const cap of enabled) {
    lines.push(`- ${cap.icon} **${cap.name}** (${cap.id}): ${cap.description}`)
  }
  
  return lines.join('\n')
}
