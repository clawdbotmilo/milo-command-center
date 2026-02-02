# Village Real-Time System

This document describes the real-time update infrastructure for the Village simulation.

## Overview

The system supports two transport mechanisms:
1. **Server-Sent Events (SSE)** - Primary, for long-running servers
2. **Polling** - Fallback for serverless environments (Vercel)

The client automatically detects the best transport and falls back gracefully.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Simulation Engine                         │
│  (updates villager positions, triggers interactions, etc.)  │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/village/broadcast
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  VillageEventEmitter                         │
│  (Node.js EventEmitter singleton, buffers last 100 events) │
└──────────────┬────────────────────────────┬─────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│  GET /api/village/events │  │  GET /api/village/state      │
│  (SSE streaming)         │  │  (REST polling + delta)      │
└──────────────────────────┘  └──────────────────────────────┘
               │                            │
               └──────────┬─────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  useVillageEvents hook                       │
│  (auto-detects transport, handles reconnection)             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  (VillageEventsDemo, VillageMap, etc.)                      │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### GET /api/village/events
SSE endpoint for real-time updates.

**Response:** Stream of server-sent events
```
data: {"type":"connected","sequence":0,"timestamp":"..."}

data: {"type":"villager_moved","data":{...},"timestamp":"..."}

: keepalive
```

### GET /api/village/state
Full state fetch (polling).

**Response:**
```json
{
  "mode": "full",
  "state": {
    "villagers": [...],
    "worldState": {...},
    "tick": 123,
    "lastUpdate": "..."
  },
  "sequence": 42,
  "connectionCount": 3
}
```

### GET /api/village/state?since=42
Delta updates since sequence number.

**Response:**
```json
{
  "mode": "delta",
  "events": [...],
  "sequence": 50,
  "connectionCount": 3
}
```

### POST /api/village/broadcast
Push events from simulation engine.

**Request (single event):**
```json
{
  "type": "villager_moved",
  "data": {
    "villagerId": "abc",
    "villagerName": "Bob",
    "position": { "id": "abc", "x": 100, "y": 150 }
  }
}
```

**Request (batch events):**
```json
{
  "events": [
    { "type": "villager_moved", "data": {...} },
    { "type": "interaction_started", "data": {...} }
  ]
}
```

**Request (full state):**
```json
{
  "type": "full_state",
  "state": {
    "villagers": [...],
    "worldState": {...},
    "tick": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventCount": 2,
  "sequence": 45,
  "connectionCount": 3
}
```

## Event Types

| Type | Description | Data Fields |
|------|-------------|-------------|
| `connected` | Client connected | sequence |
| `villager_moved` | Position changed | villagerId, villagerName, position |
| `villager_status_changed` | Status changed | villagerId, villagerName, status |
| `interaction_started` | Interaction began | interactionId, participants, interactionType |
| `interaction_completed` | Interaction ended | interactionId, participants, sentiment |
| `transaction_completed` | Economic exchange | transactionId, fromId, toId, amount, item |
| `thought_added` | Villager thought | villagerId, thoughtId, thoughtContent, thoughtType |
| `relationship_changed` | Affinity/trust changed | villagerAId, villagerBId, affinity, trust |
| `world_state_changed` | Global state changed | worldKey, worldValue |
| `time_tick` | Simulation tick | tick |
| `full_state_update` | Complete state | fullState |

## Client Usage

### Basic Hook
```tsx
import { useVillageEvents } from '@/lib/use-village-events'

function VillageMap() {
  const { state, isConnected, transport } = useVillageEvents({
    onEvent: (event) => {
      if (event.type === 'villager_moved') {
        // Update villager position on map
      }
    }
  })
  
  return (
    <div>
      {state?.villagers.map(v => (
        <Villager key={v.id} x={v.position_x} y={v.position_y} />
      ))}
    </div>
  )
}
```

### Simple State Hook
```tsx
import { useVillageState } from '@/lib/use-village-events'

function VillagerList() {
  const { state, isLoading, refresh } = useVillageState(5000) // poll every 5s
  
  if (isLoading) return <Spinner />
  
  return state?.villagers.map(v => <VillagerCard key={v.id} {...v} />)
}
```

### Force Polling (for Vercel)
```tsx
const { state } = useVillageEvents({ forcePolling: true, pollInterval: 1000 })
```

## Vercel Deployment Notes

Vercel's serverless functions have a **10-second execution limit** (30s on Pro).
SSE connections will be terminated after this limit.

**Recommended approach for Vercel:**
1. Use `forcePolling: true` in the hook
2. Set `pollInterval` to 1000-2000ms for near-real-time
3. Or use Vercel's Edge Config / KV for state synchronization

**For true real-time on Vercel:**
- Consider Ably, Pusher, or similar real-time service
- Use Supabase Realtime (if using Supabase)
- Self-host on a persistent server

## Development Testing

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000/village
3. Use the "Test Broadcasts" buttons to send events
4. Open multiple browser tabs to test multi-client sync

## Integration with Native WebSocket Server

This project also includes a native WebSocket server (`src/websocket/villageSocket.js`) for 
environments that support persistent connections. The two systems are complementary:

| Feature | Native WebSocket | SSE/Polling System |
|---------|------------------|-------------------|
| **Best for** | Standalone Node.js servers | Next.js API routes, Vercel |
| **Transport** | WebSocket (ws://) | SSE + HTTP polling |
| **Connection** | Persistent bidirectional | Unidirectional server→client |
| **Latency** | Lowest (~10ms) | Low (~50ms SSE, 1-2s polling) |
| **Vercel compatible** | ❌ No | ✅ Yes |
| **Delta compression** | ✅ Built-in | ✅ Built-in |

### Using Both Together

For the best experience across environments:

```typescript
// In your client code
import { useVillageEvents } from '@/lib/use-village-events'

function VillageApp() {
  // SSE/polling for serverless-compatible real-time
  const { state, isConnected } = useVillageEvents({
    // Force polling on Vercel
    forcePolling: process.env.VERCEL === '1',
    pollInterval: 1000
  })
  
  // Or use native WebSocket when available
  // const ws = useWebSocket('/ws/village')
}
```

### Connecting Simulation Engine to Both

The simulation engine (`src/simulation/`) can broadcast to both systems:

```javascript
import { getVillageEmitter } from '@/lib/village-events'

// In your simulation tick handler:
function onTick(state) {
  // Broadcast via SSE/polling system
  const emitter = getVillageEmitter()
  emitter.setFullState({
    villagers: state.villagers.map(v => ({
      id: v.id,
      name: v.name,
      role: v.role,
      personality: v.personality.summary || '',
      position_x: v.x,
      position_y: v.y,
      money: v.money || 100,
      home_x: v.homeX,
      home_y: v.homeY,
      status: v.activity
    })),
    worldState: {
      time_of_day: state.dayPeriod,
      tick: state.tick,
      day: state.day,
      hour: state.hour
    },
    tick: state.tick,
    lastUpdate: new Date().toISOString()
  })
  
  // Native WebSocket handles its own broadcasting
}
```

## Files

### SSE/Polling System (Vercel-compatible)
- `src/lib/village-events.ts` - Server-side event emitter
- `src/lib/use-village-events.ts` - Client-side React hook
- `src/app/api/village/events/route.ts` - SSE endpoint
- `src/app/api/village/state/route.ts` - Polling endpoint
- `src/app/api/village/broadcast/route.ts` - Push endpoint
- `src/components/village/VillageEventsDemo.tsx` - Demo component

### Native WebSocket (for standalone servers)
- `src/websocket/villageSocket.js` - WebSocket server using `ws` library
- `src/simulation/villager.js` - Villager AI and behavior
