/**
 * Custom Server for Milo Command Center - Village Project
 * Integrates Next.js with WebSocket server for real-time village simulation
 * Now with state persistence to Supabase
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { createVillageSocket } from './src/websocket/villageSocket.js';
import { createSimulation, createPersistence } from './src/simulation/index.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global references for control
let villageSocket = null;
let simulation = null;
let persistence = null;

async function startServer() {
  try {
    await app.prepare();
    
    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        const { pathname } = parsedUrl;
        
        // Health check endpoint
        if (pathname === '/api/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            timestamp: Date.now(),
            simulation: simulation ? {
              running: !simulation.paused,
              day: simulation.day,
              time: simulation.timeString,
              villagerCount: simulation.villagers.size
            } : null,
            websocket: villageSocket ? villageSocket.getStats() : null
          }));
          return;
        }
        
        // Simulation control API
        if (pathname === '/api/simulation/control') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const command = JSON.parse(body);
                const result = handleSimulationControl(command);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
              } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        
        // Simulation state API
        if (pathname === '/api/simulation/state') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(simulation ? simulation.getState() : null));
          return;
        }
        
        // WebSocket stats API
        if (pathname === '/api/websocket/stats') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(villageSocket ? villageSocket.getStats() : null));
          return;
        }
        
        // Persistence stats API
        if (pathname === '/api/persistence/stats') {
          if (persistence) {
            const stats = await persistence.getStats();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(stats));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ enabled: false }));
          }
          return;
        }
        
        // Force save API
        if (pathname === '/api/persistence/save' && req.method === 'POST') {
          if (simulation && persistence) {
            await persistence.forceSave(simulation);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, savedAt: new Date().toISOString() }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Persistence not initialized' }));
          }
          return;
        }
        
        // Let Next.js handle all other requests
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
    
    // Initialize WebSocket server
    villageSocket = createVillageSocket(server, {
      path: '/ws/village'
    });
    
    // Initialize persistence manager
    persistence = createPersistence({
      saveIntervalMs: 30000, // Save every 30 seconds
      enabled: true
    });
    
    // Try to load existing state
    let savedState = null;
    try {
      savedState = await persistence.loadState();
    } catch (err) {
      console.log('[Server] Could not load saved state:', err.message);
    }
    
    // Initialize simulation engine
    simulation = createSimulation({
      speed: 1,
      startDay: 1,
      startTick: 6 * 60 // Start at 6:00 AM (default)
    });
    
    // Load saved state if available
    if (savedState) {
      simulation.loadState({
        tick: savedState.tick,
        day: savedState.day,
        speed: savedState.speed || 1,
        villagers: savedState.villagers
      });
      if (savedState.memoryState) {
        simulation.loadMemoryState(savedState.memoryState);
      }
      console.log(`[Server] Resumed simulation from saved state: Day ${savedState.day}`);
    }
    
    // Attach WebSocket to simulation
    villageSocket.attachToEngine(simulation);
    
    // Start the simulation update loop with persistence
    let lastTime = Date.now();
    const updateInterval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTime;
      lastTime = now;
      simulation.update(deltaMs);
      
      // Periodic state save
      if (persistence) {
        persistence.saveState(simulation);
      }
    }, 100); // 10 updates per second
    
    // Graceful shutdown with state persistence
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
      clearInterval(updateInterval);
      
      // Save state before shutdown
      if (simulation && persistence) {
        console.log('[Server] Saving simulation state...');
        try {
          await persistence.forceSave(simulation);
          console.log('[Server] State saved successfully');
        } catch (err) {
          console.error('[Server] Error saving state:', err.message);
        }
      }
      
      if (villageSocket) villageSocket.close();
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
      // Force exit after 5 seconds
      setTimeout(() => process.exit(0), 5000);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Start listening
    server.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║        Milo Command Center - Village Server                ║
╠════════════════════════════════════════════════════════════╣
║  HTTP:      http://${hostname}:${port}                          ${' '.repeat(Math.max(0, 14 - String(port).length))}║
║  WebSocket: ws://${hostname}:${port}/ws/village                  ${' '.repeat(Math.max(0, 14 - String(port).length))}║
║                                                            ║
║  Simulation: ${simulation.paused ? 'PAUSED' : 'RUNNING'}                                       ║
║  Villagers:  ${simulation.villagers.size}                                           ║
╚════════════════════════════════════════════════════════════╝
      `);
      
      // Auto-start simulation
      simulation.start();
      console.log('[Server] Simulation started automatically');
    });
    
    return { server, simulation, villageSocket };
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

/**
 * Handle simulation control commands
 */
function handleSimulationControl(command) {
  if (!simulation) {
    return { error: 'Simulation not initialized' };
  }
  
  switch (command.action) {
    case 'start':
      simulation.start();
      return { success: true, running: true };
      
    case 'pause':
      simulation.pause();
      return { success: true, running: false };
      
    case 'toggle':
      const running = simulation.togglePause();
      return { success: true, running };
      
    case 'setSpeed':
      if (typeof command.speed === 'number') {
        simulation.setSpeed(command.speed);
        return { success: true, speed: simulation.speed };
      }
      return { error: 'Speed must be a number' };
      
    case 'setTime':
      if (typeof command.hour === 'number') {
        simulation.setTime(command.hour, command.minute || 0);
        return { success: true, time: simulation.timeString };
      }
      return { error: 'Hour must be provided' };
      
    default:
      return { error: `Unknown action: ${command.action}` };
  }
}

// Export for testing
export { startServer, simulation, villageSocket };

// Start the server
startServer();
