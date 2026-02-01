# 🌱 Milo Command Center v2

A local Next.js dashboard for monitoring and managing the Milo AI agent system.

## Features

### Dashboard (v1)
- **System Status** - Real-time CPU, memory, and disk usage
- **Cron Jobs** - View scheduled tasks and job status
- **Journal Events** - Recent activity log with filtering
- **Agent Status** - Monitor running agent slots

### Project Orchestration (v2) ✨ New!
- **Project Management** - Create, view, and manage projects
- **Plan Editor** - Write project plans in Markdown with live preview
- **Task Extraction** - Automatically extract tasks from plan syntax
- **Finalization Flow** - Lock plans before execution
- **Execution Dashboard** - Monitor task queue, agent assignments, and progress
- **Status Transitions** - Draft → Finalized → Executing → Completed

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
milo-command-center/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── projects/       # Project CRUD
│   │   │   ├── orchestration/  # Task orchestration state
│   │   │   ├── agents/         # Agent slot status
│   │   │   └── ...
│   │   ├── projects/           # Projects UI
│   │   └── page.tsx            # Dashboard home
│   ├── components/             # React components
│   │   ├── projects/           # Project-related components
│   │   │   ├── ProjectSidebar.tsx
│   │   │   ├── PlanEditor.tsx
│   │   │   ├── ExecutionDashboard.tsx
│   │   │   ├── AgentStatusPanel.tsx
│   │   │   ├── TaskQueuePanel.tsx
│   │   │   └── ProgressPanel.tsx
│   │   └── ...
│   ├── lib/                    # Utility libraries
│   │   ├── projects.ts         # Project file operations
│   │   ├── plan-parser.ts      # Markdown plan parsing
│   │   └── ...
│   └── types/                  # TypeScript types
│       ├── project.ts
│       └── orchestration.ts
└── public/                     # Static assets
```

## API Routes

### Projects API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/[name]` | Get project details |
| DELETE | `/api/projects/[name]` | Delete project |
| GET | `/api/projects/[name]/plan` | Get raw plan markdown |
| PUT | `/api/projects/[name]/plan` | Update plan markdown |
| POST | `/api/projects/[name]/finalize` | Finalize plan |
| POST | `/api/projects/[name]/revert` | Revert to draft |
| POST | `/api/projects/[name]/start` | Start execution |

### Orchestration API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orchestration` | List all orchestration states |
| GET | `/api/orchestration/[project]` | Get project orchestration state |

### Other APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | Get agent slot status |
| GET | `/api/system` | Get system info |
| GET | `/api/cron` | Get cron job status |
| GET | `/api/journal` | Get journal events |

## Plan Syntax

Projects use Markdown plans with special task syntax:

```markdown
# My Project

<!-- Status: DRAFT -->

## Vision
Describe what you're building...

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Tasks

### Task 1: Setup Infrastructure
- **ID:** T1
- **Agent:** sonnet
- **Dependencies:** none
- **Description:** Set up the project structure

### Task 2: Implement Feature
- **ID:** T2
- **Agent:** opus
- **Dependencies:** T1
- **Description:** Build the main feature
```

### Supported Task Fields:
- `**ID:**` - Unique task identifier (T1, T2, etc.)
- `**Agent:**` - Model to use (sonnet, opus)
- `**Dependencies:**` - Comma-separated task IDs or "none"
- `**Description:**` - What the task does
- `**Estimated complexity:**` - low, medium, high

## Project Workflow

1. **Create Project** - Click "New Project" in sidebar
2. **Edit Plan** - Write your plan in the markdown editor
3. **Review Tasks** - See extracted tasks in the panel below
4. **Finalize** - Click "Finalize Plan" to lock the plan
5. **Start Execution** - Confirm to begin running tasks
6. **Monitor Progress** - View task queue, agent status, and progress

## Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Markdown:** remark + rehype

## Configuration

Projects are stored in `/home/ubuntu/clawd/projects/`. Each project has:
- `PROJECT-PLAN.md` - The plan document
- `PROJECT-PLAN.original.md` - Backup after execution starts
- `ORCHESTRATION-STATE.json` - Task execution state

## License

Private - Milo AI Agent System
