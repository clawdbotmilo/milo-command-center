# Village Simulation Background Service

The village simulation runs continuously in the background, even when no users are connected.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Background Service                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Simulation │  │  Persistence │  │  Error Recovery     │ │
│  │  Engine     │──│  Manager     │──│  & Auto-restart     │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│         │                │                                   │
│         ▼                ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Supabase                              ││
│  │  • world_state (simulation state)                        ││
│  │  • villagers (positions, status)                         ││
│  │  • interactions, thoughts, transactions                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Running Directly

```bash
# Development mode (verbose logging)
npm run sim:dev

# Production mode
npm run sim:start
```

### Running with PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start all services
npm run pm2:start

# Start only the simulation service
pm2 start ecosystem.config.cjs --only village-simulation

# View logs
npm run pm2:logs

# Check status
npm run pm2:status

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

## Features

### 1. Continuous Simulation
- Runs at 10 ticks per second (configurable)
- Villagers move, interact, think, and trade 24/7
- No pauses when users disconnect

### 2. State Persistence
- Saves to Supabase every 30 seconds
- Persists on graceful shutdown
- Resumes from saved state on restart

### 3. Error Recovery
- Catches and logs all errors
- Auto-restarts on crash (up to 10 times per minute)
- PM2 provides additional process supervision

### 4. Database Sync
- Villager positions updated periodically
- Interactions logged to database
- Thoughts and transactions recorded
- World state checkpointed

## Configuration

Edit `simulation-service.js` to change:

```javascript
const CONFIG = {
  updateIntervalMs: 100,      // Tick rate
  speed: 1,                    // Simulation speed
  saveIntervalMs: 30000,       // Persistence interval
  maxRestarts: 10,             // Max restarts per minute
  verbose: true                // Logging level
};
```

## Health Checks

### Check Script
```bash
node scripts/check-simulation.js
node scripts/check-simulation.js --verbose
```

### API Endpoints (when server.js is running)
```bash
# Health status
curl http://localhost:3000/api/health

# Simulation state
curl http://localhost:3000/api/simulation/state

# Persistence stats
curl http://localhost:3000/api/persistence/stats

# Force save
curl -X POST http://localhost:3000/api/persistence/save
```

## Database Schema

Tables used by the simulation:

| Table | Purpose |
|-------|---------|
| `world_state` | Simulation checkpoint (tick, day, villager states) |
| `villagers` | Current villager positions and status |
| `interactions` | Logged interactions between villagers |
| `thoughts` | Villager thoughts and internal states |
| `transactions` | Economic transactions (trades, gifts) |
| `relationships` | Villager-to-villager relationship values |

Run `supabase/migrations/001_village_tables.sql` to create these tables.

## Deployment Options

### Option 1: PM2 (Recommended)
Best for dedicated servers or VPS. Provides:
- Process management
- Auto-restart on crash
- Log rotation
- Clustering (if needed)

### Option 2: systemd
Create a service file at `/etc/systemd/system/village-sim.service`:

```ini
[Unit]
Description=Village Simulation Background Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/clawd/milo-command-center
ExecStart=/usr/bin/node simulation-service.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable village-sim
sudo systemctl start village-sim
```

### Option 3: Docker
Coming soon.

## Troubleshooting

### Simulation not saving state
- Check Supabase connection in logs
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Run `node scripts/check-simulation.js -v`

### High restart count
- Check logs for recurring errors
- Increase `maxRestarts` temporarily
- Review database connectivity

### Stale state
- Service may have crashed
- Check PM2 status: `pm2 status`
- Restart: `pm2 restart village-simulation`

## Logs

PM2 logs are stored in:
- `logs/village-sim-out.log` - Standard output
- `logs/village-sim-error.log` - Errors

View live: `pm2 logs village-simulation`
