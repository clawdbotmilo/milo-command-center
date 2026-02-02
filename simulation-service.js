#!/usr/bin/env node
/**
 * Village Simulation Background Service
 * 
 * Runs the simulation continuously, persists state to database,
 * handles errors gracefully with automatic restart.
 * 
 * Features:
 * - Continuous simulation even when no clients connected
 * - Periodic state persistence to Supabase
 * - Automatic error recovery and restart
 * - Graceful shutdown with state save
 * - Health monitoring
 * 
 * Usage:
 *   node simulation-service.js
 *   
 * Or with PM2:
 *   pm2 start simulation-service.js --name village-sim
 */

import { createSimulation } from './src/simulation/index.js';
import { createPersistence } from './src/simulation/persistence.js';

// Configuration
const CONFIG = {
  // Simulation settings
  updateIntervalMs: 100,      // 10 updates per second
  speed: 1,                    // Normal speed
  startHour: 6,                // Start at 6 AM
  
  // Persistence settings
  saveIntervalMs: 30000,       // Save every 30 seconds
  
  // Error recovery
  maxRestarts: 10,             // Max restarts in window
  restartWindowMs: 60000,      // 1 minute window
  restartDelayMs: 1000,        // Wait before restart
  
  // Health check
  healthCheckIntervalMs: 10000, // Check every 10 seconds
  
  // Logging
  verbose: process.env.VERBOSE === 'true'
};

// Service state
let simulation = null;
let persistence = null;
let updateInterval = null;
let healthCheckInterval = null;
let restartCount = 0;
let restartWindowStart = Date.now();
let isShuttingDown = false;
let lastTick = 0;
let ticksProcessed = 0;
let errorsCount = 0;

/**
 * Initialize and start the simulation
 */
async function startSimulation() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('       VILLAGE SIMULATION BACKGROUND SERVICE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`PID: ${process.pid}`);
  console.log('───────────────────────────────────────────────────────────\n');
  
  try {
    // Create persistence manager
    persistence = createPersistence({
      saveIntervalMs: CONFIG.saveIntervalMs,
      enabled: true
    });
    
    // Try to load existing state
    const savedState = await persistence.loadState();
    
    // Create simulation engine
    const simOptions = {
      speed: CONFIG.speed,
      startDay: 1,
      startTick: CONFIG.startHour * 60
    };
    
    simulation = createSimulation(simOptions);
    
    // Load saved state if available
    if (savedState) {
      simulation.loadState({
        tick: savedState.tick,
        day: savedState.day,
        speed: savedState.speed || CONFIG.speed,
        villagers: savedState.villagers
      });
      
      if (savedState.memoryState) {
        simulation.loadMemoryState(savedState.memoryState);
      }
      
      console.log(`[Service] Resumed from saved state: Day ${savedState.day}, Time ${simulation.timeString}`);
    } else {
      console.log(`[Service] Starting fresh simulation at 06:00`);
    }
    
    // Set up event listeners for logging
    setupEventListeners();
    
    // Start the simulation
    simulation.start();
    console.log(`[Service] Simulation started - Day ${simulation.day}, ${simulation.timeString}`);
    
    // Start update loop
    let lastUpdateTime = Date.now();
    updateInterval = setInterval(() => {
      try {
        const now = Date.now();
        const deltaMs = now - lastUpdateTime;
        lastUpdateTime = now;
        
        simulation.update(deltaMs);
        
        // Track ticks
        if (simulation.tick !== lastTick) {
          ticksProcessed++;
          lastTick = simulation.tick;
        }
        
        // Periodic state save
        persistence.saveState(simulation);
        
      } catch (err) {
        errorsCount++;
        console.error(`[Service] Update error: ${err.message}`);
        
        // If too many errors, restart
        if (errorsCount > 10) {
          console.error('[Service] Too many errors, restarting simulation...');
          restartSimulation();
        }
      }
    }, CONFIG.updateIntervalMs);
    
    // Start health check
    healthCheckInterval = setInterval(() => {
      logHealthStatus();
    }, CONFIG.healthCheckIntervalMs);
    
    console.log('[Service] Update loop started');
    
  } catch (err) {
    console.error(`[Service] Startup error: ${err.message}`);
    console.error(err.stack);
    handleError(err);
  }
}

/**
 * Set up event listeners on the simulation
 */
function setupEventListeners() {
  if (!simulation) return;
  
  // New day event
  simulation.on('newDay', (data) => {
    console.log(`\n[Day ${data.day}] ═══════════════════════════════════════`);
    
    // Save state at start of each day
    persistence.forceSave(simulation);
  });
  
  // Hour change (optional, can be verbose)
  if (CONFIG.verbose) {
    simulation.on('newHour', (data) => {
      console.log(`[Service] ${data.timeString} - Day ${data.day}`);
    });
  }
  
  // Interactions (summary)
  let interactionCount = 0;
  simulation.on('interaction', (interaction) => {
    interactionCount++;
    if (CONFIG.verbose) {
      console.log(`[Interaction] ${interaction.type}: ${interaction.villager1_id} <-> ${interaction.villager2_id}`);
    }
  });
  
  // Thoughts (sample occasionally)
  simulation.on('thought', (thought) => {
    if (CONFIG.verbose && Math.random() < 0.1) {
      console.log(`[Thought] ${thought.villagerId}: "${thought.content?.slice(0, 50)}..."`);
    }
  });
  
  // Transaction summary
  simulation.on('transaction', (txn) => {
    if (CONFIG.verbose) {
      console.log(`[Transaction] ${txn.type}: ${txn.buyerId || txn.toId} <- ${txn.item}`);
    }
  });
}

/**
 * Log health status
 */
function logHealthStatus() {
  if (!simulation) return;
  
  const state = simulation.getState();
  const villagersByActivity = {};
  
  for (const v of state.villagers) {
    villagersByActivity[v.activity] = (villagersByActivity[v.activity] || 0) + 1;
  }
  
  if (CONFIG.verbose) {
    console.log(`[Health] Day ${state.day} ${state.timeString} | Ticks: ${ticksProcessed} | Errors: ${errorsCount}`);
    console.log(`         Activities: ${JSON.stringify(villagersByActivity)}`);
  }
}

/**
 * Handle simulation errors with restart logic
 */
function handleError(err) {
  errorsCount++;
  
  // Check if we're in a restart storm
  const now = Date.now();
  if (now - restartWindowStart > CONFIG.restartWindowMs) {
    // Reset window
    restartWindowStart = now;
    restartCount = 0;
  }
  
  restartCount++;
  
  if (restartCount >= CONFIG.maxRestarts) {
    console.error('[Service] Too many restarts, giving up. Manual intervention required.');
    process.exit(1);
  }
  
  console.log(`[Service] Restart ${restartCount}/${CONFIG.maxRestarts} in ${CONFIG.restartDelayMs}ms...`);
  
  setTimeout(() => {
    restartSimulation();
  }, CONFIG.restartDelayMs);
}

/**
 * Restart the simulation
 */
async function restartSimulation() {
  console.log('[Service] Restarting simulation...');
  
  // Stop current update loop
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  // Save current state before restart
  if (simulation && persistence) {
    try {
      await persistence.forceSave(simulation);
    } catch (err) {
      console.error('[Service] Error saving state before restart:', err.message);
    }
  }
  
  // Reset error count
  errorsCount = 0;
  
  // Restart
  await startSimulation();
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n[Service] Received ${signal}, shutting down gracefully...`);
  
  // Stop update loop
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  // Stop health check
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  
  // Pause simulation
  if (simulation) {
    simulation.pause();
    console.log('[Service] Simulation paused');
  }
  
  // Save final state
  if (simulation && persistence) {
    console.log('[Service] Saving final state...');
    try {
      await persistence.forceSave(simulation);
      console.log('[Service] State saved successfully');
    } catch (err) {
      console.error('[Service] Error saving final state:', err.message);
    }
  }
  
  // Log final stats
  console.log('\n───────────────────────────────────────────────────────────');
  console.log('                    SHUTDOWN COMPLETE');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`Final state: Day ${simulation?.day || 'N/A'}, ${simulation?.timeString || 'N/A'}`);
  console.log(`Ticks processed: ${ticksProcessed}`);
  console.log(`Errors encountered: ${errorsCount}`);
  console.log(`Shutdown at: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

// Signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('[Service] Uncaught exception:', err.message);
  console.error(err.stack);
  handleError(err);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Service] Unhandled rejection:', reason);
  // Don't restart for promise rejections, just log
});

// Start the service
startSimulation().catch((err) => {
  console.error('[Service] Failed to start:', err);
  process.exit(1);
});
