import { watch, FSWatcher } from 'fs'
import { readdir, stat } from 'fs/promises'
import path from 'path'
import { EventEmitter } from 'events'

export type FileEventType = 
  | 'plan_updated' 
  | 'orchestration_updated'
  | 'task_status_changed' 
  | 'agent_started' 
  | 'agent_completed'
  | 'project_created'
  | 'connected'

export interface FileEvent {
  type: FileEventType
  project: string
  data?: Record<string, unknown>
  timestamp: string
}

const PROJECTS_DIR = path.join(process.cwd(), 'projects')
const WATCHED_FILES = ['PROJECT-PLAN.md', 'ORCHESTRATION-STATE.json']

class ProjectFileWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map()
  private isWatching = false
  private pollInterval: NodeJS.Timeout | null = null

  /**
   * Start watching the projects directory
   */
  async start(): Promise<void> {
    if (this.isWatching) return
    this.isWatching = true

    // Initial scan of existing projects
    await this.scanProjects()

    // Poll for new projects periodically (fs.watch doesn't reliably catch new directories)
    this.pollInterval = setInterval(() => this.scanProjects(), 5000)
  }

  /**
   * Stop all watchers
   */
  stop(): void {
    this.isWatching = false
    
    for (const [key, watcher] of this.watchers) {
      watcher.close()
      this.watchers.delete(key)
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  /**
   * Scan for projects and set up watchers
   */
  private async scanProjects(): Promise<void> {
    try {
      const entries = await readdir(PROJECTS_DIR, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.watchProject(entry.name)
        }
      }
    } catch (error) {
      // Projects directory doesn't exist yet - that's okay
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error scanning projects:', error)
      }
    }
  }

  /**
   * Watch a specific project directory for file changes
   */
  private async watchProject(projectName: string): Promise<void> {
    const projectDir = path.join(PROJECTS_DIR, projectName)

    // Watch each relevant file in the project
    for (const filename of WATCHED_FILES) {
      const filePath = path.join(projectDir, filename)
      const watchKey = `${projectName}:${filename}`

      // Skip if already watching
      if (this.watchers.has(watchKey)) continue

      try {
        // Check if file exists
        await stat(filePath)
        
        // Set up watcher
        const watcher = watch(filePath, (eventType) => {
          if (eventType === 'change') {
            this.handleFileChange(projectName, filename)
          }
        })

        watcher.on('error', (error) => {
          console.error(`Watcher error for ${watchKey}:`, error)
          this.watchers.delete(watchKey)
        })

        this.watchers.set(watchKey, watcher)
      } catch {
        // File doesn't exist yet - we'll catch it on next poll
      }
    }
  }

  /**
   * Handle a file change event
   */
  private handleFileChange(project: string, filename: string): void {
    const timestamp = new Date().toISOString()

    if (filename === 'PROJECT-PLAN.md') {
      this.emit('event', {
        type: 'plan_updated',
        project,
        timestamp,
      } as FileEvent)
    } else if (filename === 'ORCHESTRATION-STATE.json') {
      // For orchestration changes, we emit a generic update
      // The client can fetch full state if needed
      this.emit('event', {
        type: 'orchestration_updated',
        project,
        timestamp,
      } as FileEvent)
    }
  }

  /**
   * Emit a custom event (useful for task status changes detected by parsing)
   */
  emitTaskEvent(
    type: 'task_status_changed' | 'agent_started' | 'agent_completed',
    project: string,
    taskId: string,
    status?: string
  ): void {
    this.emit('event', {
      type,
      project,
      data: { taskId, status },
      timestamp: new Date().toISOString(),
    } as FileEvent)
  }
}

// Singleton instance
let watcherInstance: ProjectFileWatcher | null = null

/**
 * Get the singleton file watcher instance
 */
export function getFileWatcher(): ProjectFileWatcher {
  if (!watcherInstance) {
    watcherInstance = new ProjectFileWatcher()
  }
  return watcherInstance
}

/**
 * Subscribe to file events with a callback
 * Returns an unsubscribe function
 */
export function subscribeToFileEvents(
  callback: (event: FileEvent) => void
): () => void {
  const watcher = getFileWatcher()
  
  watcher.on('event', callback)
  
  // Start watching if not already
  watcher.start().catch(console.error)

  return () => {
    watcher.off('event', callback)
  }
}
