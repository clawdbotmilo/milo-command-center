/**
 * Village WebSocket Handler
 * Real-time broadcasting of village simulation state to connected clients
 */

import { WebSocketServer } from 'ws';

/**
 * VillageSocketServer - Manages WebSocket connections and state broadcasting
 */
export class VillageSocketServer {
  constructor(server, options = {}) {
    this.wss = new WebSocketServer({ 
      server,
      path: options.path || '/ws/village'
    });
    
    this.clients = new Map(); // ws -> clientInfo
    this.lastState = null;
    this.lastVillagerPositions = new Map(); // villagerId -> {x, y}
    this.engine = null;
    this.unsubscribeFns = [];
    
    this.setupConnectionHandlers();
  }

  /**
   * Set up connection handlers
   */
  setupConnectionHandlers() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        connectedAt: Date.now(),
        ip: req.socket.remoteAddress,
        lastPing: Date.now()
      };
      
      this.clients.set(ws, clientInfo);
      console.log(`[VillageSocket] Client connected: ${clientId} (${this.clients.size} total)`);
      
      // Send initial state if available
      if (this.lastState) {
        this.sendToClient(ws, {
          type: 'init',
          state: this.lastState,
          clientId
        });
      }
      
      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (err) {
          console.error('[VillageSocket] Invalid message:', err.message);
        }
      });
      
      // Handle disconnect
      ws.on('close', () => {
        const info = this.clients.get(ws);
        this.clients.delete(ws);
        console.log(`[VillageSocket] Client disconnected: ${info?.id} (${this.clients.size} remaining)`);
      });
      
      // Handle errors
      ws.on('error', (err) => {
        console.error(`[VillageSocket] Client error:`, err.message);
        this.clients.delete(ws);
      });
      
      // Set up ping/pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
        const info = this.clients.get(ws);
        if (info) info.lastPing = Date.now();
      });
    });
    
    // Heartbeat interval to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          const info = this.clients.get(ws);
          console.log(`[VillageSocket] Terminating unresponsive client: ${info?.id}`);
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Handle incoming client messages
   */
  handleClientMessage(ws, message) {
    const clientInfo = this.clients.get(ws);
    
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
        
      case 'subscribe':
        // Client can subscribe to specific update types
        if (clientInfo) {
          clientInfo.subscriptions = message.subscriptions || ['all'];
        }
        break;
        
      case 'requestState':
        // Client requests full state
        if (this.lastState) {
          this.sendToClient(ws, {
            type: 'fullState',
            state: this.lastState
          });
        }
        break;
        
      default:
        console.log(`[VillageSocket] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(ws, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (err) {
        console.error('[VillageSocket] Send error:', err.message);
      }
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    let sentCount = 0;
    
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
          sentCount++;
        } catch (err) {
          console.error('[VillageSocket] Broadcast error:', err.message);
        }
      }
    });
    
    return sentCount;
  }

  /**
   * Connect to simulation engine and subscribe to events
   */
  attachToEngine(engine) {
    this.engine = engine;
    
    // Subscribe to tick events
    const unsubTick = engine.on('tick', (state) => {
      this.handleTickUpdate(state);
    });
    this.unsubscribeFns.push(unsubTick);
    
    // Subscribe to new day events
    const unsubDay = engine.on('newDay', (data) => {
      this.broadcast({
        type: 'event',
        event: 'newDay',
        data
      });
    });
    this.unsubscribeFns.push(unsubDay);
    
    // Subscribe to new hour events
    const unsubHour = engine.on('newHour', (data) => {
      this.broadcast({
        type: 'event',
        event: 'newHour',
        data
      });
    });
    this.unsubscribeFns.push(unsubHour);
    
    // Subscribe to pause/start events
    const unsubPause = engine.on('pause', (data) => {
      this.broadcast({
        type: 'event',
        event: 'pause',
        data
      });
    });
    this.unsubscribeFns.push(unsubPause);
    
    const unsubStart = engine.on('start', (data) => {
      this.broadcast({
        type: 'event',
        event: 'start',
        data
      });
    });
    this.unsubscribeFns.push(unsubStart);
    
    // Speed change
    const unsubSpeed = engine.on('speedChange', (data) => {
      this.broadcast({
        type: 'event',
        event: 'speedChange',
        data
      });
    });
    this.unsubscribeFns.push(unsubSpeed);
    
    console.log('[VillageSocket] Attached to simulation engine');
  }

  /**
   * Handle tick update - compute and broadcast deltas
   */
  handleTickUpdate(state) {
    // Store full state for new clients
    this.lastState = state;
    
    // If no clients, skip broadcasting
    if (this.clients.size === 0) return;
    
    // Compute delta for villager positions
    const delta = this.computeDelta(state);
    
    // Broadcast delta update
    this.broadcast({
      type: 'tick',
      timestamp: Date.now(),
      time: {
        tick: state.tick,
        day: state.day,
        hour: state.hour,
        minute: state.minute,
        timeString: state.timeString,
        dayPeriod: state.dayPeriod,
        isDaytime: state.isDaytime
      },
      paused: state.paused,
      speed: state.speed,
      ...delta
    });
  }

  /**
   * Compute delta changes from last state
   */
  computeDelta(state) {
    const villagerUpdates = [];
    const villagerFull = [];
    
    for (const villager of state.villagers) {
      const prevPos = this.lastVillagerPositions.get(villager.id);
      
      if (!prevPos) {
        // New villager or first update - send full data
        villagerFull.push(villager);
        this.lastVillagerPositions.set(villager.id, {
          x: villager.x,
          y: villager.y,
          activity: villager.activity,
          mood: villager.mood
        });
      } else {
        // Check what changed
        const changes = {};
        let hasChanges = false;
        
        if (prevPos.x !== villager.x || prevPos.y !== villager.y) {
          changes.x = villager.x;
          changes.y = villager.y;
          hasChanges = true;
        }
        
        if (prevPos.activity !== villager.activity) {
          changes.activity = villager.activity;
          hasChanges = true;
        }
        
        if (prevPos.mood !== villager.mood) {
          changes.mood = villager.mood;
          hasChanges = true;
        }
        
        if (hasChanges) {
          villagerUpdates.push({
            id: villager.id,
            ...changes
          });
          
          // Update cached state
          this.lastVillagerPositions.set(villager.id, {
            x: villager.x,
            y: villager.y,
            activity: villager.activity,
            mood: villager.mood
          });
        }
      }
    }
    
    const result = {};
    
    // Only include arrays if they have content
    if (villagerUpdates.length > 0) {
      result.villagerUpdates = villagerUpdates;
    }
    if (villagerFull.length > 0) {
      result.villagersFull = villagerFull;
    }
    
    return result;
  }

  /**
   * Get connection stats
   */
  getStats() {
    const clients = [];
    for (const [ws, info] of this.clients) {
      clients.push({
        id: info.id,
        connectedAt: info.connectedAt,
        lastPing: info.lastPing,
        subscriptions: info.subscriptions
      });
    }
    
    return {
      clientCount: this.clients.size,
      clients,
      engineAttached: !!this.engine
    };
  }

  /**
   * Clean up resources
   */
  close() {
    // Unsubscribe from engine events
    for (const unsub of this.unsubscribeFns) {
      unsub();
    }
    this.unsubscribeFns = [];
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    this.wss.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });
    
    this.wss.close();
    console.log('[VillageSocket] Server closed');
  }
}

/**
 * Create and attach WebSocket server to HTTP server
 */
export function createVillageSocket(httpServer, options = {}) {
  return new VillageSocketServer(httpServer, options);
}

export default VillageSocketServer;
