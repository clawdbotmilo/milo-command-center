/**
 * Village Simulation Engine
 * Main simulation loop, time management, and coordination
 */

import { World, createDefaultVillage } from './world.js';
import { Villager, ACTIVITY, TRAITS } from './villager.js';
import { InteractionManager, createInteractionManager } from './interactions.js';
import { createTransactionManager } from './transactions.js';
import { ThoughtSystem, MemorySystem, createThoughtSystem, createMemorySystem } from './thoughts.js';

// Time constants
const TICKS_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const TICKS_PER_DAY = TICKS_PER_HOUR * HOURS_PER_DAY;

// Default villager configurations - the 7 villagers with distinct personalities
const DEFAULT_VILLAGERS = [
  {
    id: 'elara',
    name: 'Elara Moonshadow',
    role: 'herbalist',
    traits: [TRAITS.INTROVERTED, TRAITS.CURIOUS, TRAITS.CAUTIOUS],
    homeId: 'cottage_elara',
    workplaceId: 'farm',
    personality: {
      openness: 0.8,
      conscientiousness: 0.7,
      extraversion: 0.2,
      agreeableness: 0.9,
      neuroticism: 0.4
    },
    schedule: {
      0: ACTIVITY.SLEEPING,
      5: ACTIVITY.WAKING,    // Early riser
      6: ACTIVITY.WANDERING, // Gathering herbs
      11: ACTIVITY.EATING,
      12: ACTIVITY.WORKING,
      17: ACTIVITY.RESTING,
      21: ACTIVITY.SLEEPING
    }
  },
  {
    id: 'brom',
    name: 'Brom Ironhand',
    role: 'blacksmith',
    traits: [TRAITS.HARDWORKING, TRAITS.EXTROVERTED, TRAITS.CHEERFUL],
    homeId: 'cottage_brom',
    workplaceId: 'blacksmith',
    personality: {
      openness: 0.4,
      conscientiousness: 0.9,
      extraversion: 0.7,
      agreeableness: 0.6,
      neuroticism: 0.2
    },
    schedule: {
      0: ACTIVITY.SLEEPING,
      6: ACTIVITY.WAKING,
      7: ACTIVITY.WORKING,   // Long work hours
      12: ACTIVITY.EATING,
      13: ACTIVITY.WORKING,
      18: ACTIVITY.SOCIALIZING, // Loves the tavern
      22: ACTIVITY.SLEEPING
    }
  },
  {
    id: 'maeve',
    name: 'Maeve Brightwater',
    role: 'baker',
    traits: [TRAITS.CHEERFUL, TRAITS.EXTROVERTED, TRAITS.HARDWORKING],
    homeId: 'cottage_maeve',
    workplaceId: 'bakery',
    personality: {
      openness: 0.6,
      conscientiousness: 0.8,
      extraversion: 0.8,
      agreeableness: 0.9,
      neuroticism: 0.3
    },
    schedule: {
      0: ACTIVITY.SLEEPING,
      4: ACTIVITY.WAKING,    // Very early for baking
      5: ACTIVITY.WORKING,
      11: ACTIVITY.EATING,
      12: ACTIVITY.WORKING,
      15: ACTIVITY.RESTING,
      17: ACTIVITY.SOCIALIZING,
      20: ACTIVITY.SLEEPING  // Early to bed
    }
  },
  {
    id: 'finn',
    name: 'Finn Quickfoot',
    role: 'messenger',
    traits: [TRAITS.ADVENTUROUS, TRAITS.CURIOUS, TRAITS.EXTROVERTED],
    homeId: 'cottage_finn',
    workplaceId: 'market',
    personality: {
      openness: 0.9,
      conscientiousness: 0.4,
      extraversion: 0.8,
      agreeableness: 0.7,
      neuroticism: 0.5
    },
    schedule: {
      0: ACTIVITY.SLEEPING,
      7: ACTIVITY.WAKING,
      8: ACTIVITY.WANDERING, // Delivers messages
      12: ACTIVITY.EATING,
      13: ACTIVITY.WANDERING,
      16: ACTIVITY.SOCIALIZING,
      20: ACTIVITY.WANDERING, // Evening wandering
      23: ACTIVITY.SLEEPING
    },
    moveSpeed: 1.5 // Faster than average
  },
  {
    id: 'ivy',
    name: 'Ivy Thornwood',
    role: 'tavern keeper',
    traits: [TRAITS.EXTROVERTED, TRAITS.CHEERFUL, TRAITS.HOMEBODY],
    homeId: 'cottage_ivy',
    workplaceId: 'tavern',
    personality: {
      openness: 0.5,
      conscientiousness: 0.7,
      extraversion: 0.9,
      agreeableness: 0.8,
      neuroticism: 0.3
    },
    schedule: {
      0: ACTIVITY.SLEEPING,
      8: ACTIVITY.WAKING,
      9: ACTIVITY.WORKING,   // Opens tavern late morning
      14: ACTIVITY.EATING,
      15: ACTIVITY.WORKING,
      23: ACTIVITY.SLEEPING  // Late night
    }
  },
  {
    id: 'gideon',
    name: 'Gideon Ashford',
    role: 'scholar',
    traits: [TRAITS.SCHOLARLY, TRAITS.INTROVERTED, TRAITS.CURIOUS, TRAITS.DEVOUT],
    homeId: 'cottage_gideon',
    workplaceId: 'library',
    personality: {
      openness: 0.95,
      conscientiousness: 0.8,
      extraversion: 0.2,
      agreeableness: 0.6,
      neuroticism: 0.5
    },
    schedule: {
      0: ACTIVITY.SLEEPING,
      6: ACTIVITY.PRAYING,
      7: ACTIVITY.WORKING,   // Reading/writing
      12: ACTIVITY.EATING,
      13: ACTIVITY.WORKING,
      18: ACTIVITY.WANDERING, // Evening walk
      20: ACTIVITY.WORKING,   // Night reading
      23: ACTIVITY.SLEEPING
    }
  },
  {
    id: 'rose',
    name: 'Rose Meadowbrook',
    role: 'farmer',
    traits: [TRAITS.HARDWORKING, TRAITS.CAUTIOUS, TRAITS.MELANCHOLIC],
    homeId: 'cottage_rose',
    workplaceId: 'farm',
    personality: {
      openness: 0.3,
      conscientiousness: 0.9,
      extraversion: 0.4,
      agreeableness: 0.7,
      neuroticism: 0.6
    },
    schedule: {
      0: ACTIVITY.SLEEPING,
      5: ACTIVITY.WAKING,
      6: ACTIVITY.WORKING,
      12: ACTIVITY.EATING,
      13: ACTIVITY.WORKING,
      17: ACTIVITY.RESTING,
      19: ACTIVITY.SOCIALIZING, // Occasional socializing
      21: ACTIVITY.SLEEPING
    }
  }
];

/**
 * SimulationEngine - Main controller for the village simulation
 */
export class SimulationEngine {
  constructor(options = {}) {
    // Time
    this.tick = options.startTick || 0;
    this.day = options.startDay || 1;
    this.paused = true;
    this.speed = options.speed || 1; // Multiplier for simulation speed
    
    // World
    this.world = options.world || createDefaultVillage();
    
    // Villagers
    this.villagers = new Map();
    
    // Transaction system (shared with interaction manager)
    this.transactionManager = options.transactionManager || createTransactionManager();
    
    // Interaction system with transaction support
    this.interactionManager = options.interactionManager || createInteractionManager(this.transactionManager);
    
    // Thought & Memory systems
    this.thoughtSystem = options.thoughtSystem || createThoughtSystem();
    this.memorySystem = options.memorySystem || createMemorySystem();
    
    // Events/callbacks
    this.eventListeners = new Map();
    
    // State tracking
    this.lastUpdate = Date.now();
    this.tickAccumulator = 0;
    
    // Initialize villagers
    this.initializeVillagers(options.villagerConfigs || DEFAULT_VILLAGERS);
  }

  /**
   * Initialize villagers with starting positions at their homes
   */
  initializeVillagers(configs) {
    for (const config of configs) {
      // Place villager at their home entrance
      const home = this.world.getBuilding(config.homeId);
      if (home) {
        config.x = home.entrance.x;
        config.y = home.entrance.y;
      }
      
      const villager = new Villager(config.id, config);
      this.villagers.set(config.id, villager);
    }
  }

  /**
   * Get current hour of day (0-23)
   */
  get hour() {
    return Math.floor((this.tick % TICKS_PER_DAY) / TICKS_PER_HOUR);
  }

  /**
   * Get current minute within hour (0-59)
   */
  get minute() {
    return this.tick % TICKS_PER_HOUR;
  }

  /**
   * Get formatted time string
   */
  get timeString() {
    const h = this.hour.toString().padStart(2, '0');
    const m = this.minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Get time of day period
   */
  get dayPeriod() {
    const h = this.hour;
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
  }

  /**
   * Check if it's daytime (for lighting, behavior, etc.)
   */
  get isDaytime() {
    return this.hour >= 6 && this.hour < 20;
  }

  /**
   * Start the simulation
   */
  start() {
    this.paused = false;
    this.lastUpdate = Date.now();
    this.emit('start', { day: this.day, tick: this.tick });
  }

  /**
   * Pause the simulation
   */
  pause() {
    this.paused = true;
    this.emit('pause', { day: this.day, tick: this.tick });
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.paused) {
      this.start();
    } else {
      this.pause();
    }
    return !this.paused;
  }

  /**
   * Set simulation speed (1 = normal, 2 = double, etc.)
   */
  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(10, speed));
    this.emit('speedChange', { speed: this.speed });
  }

  /**
   * Main update loop - call this from requestAnimationFrame or setInterval
   */
  update(deltaMs = null) {
    if (this.paused) return;
    
    const now = Date.now();
    if (deltaMs === null) {
      deltaMs = now - this.lastUpdate;
    }
    this.lastUpdate = now;
    
    // Accumulate time and process ticks
    // Base rate: 1 tick = ~1 second real time at speed 1
    this.tickAccumulator += (deltaMs / 1000) * this.speed;
    
    // Process accumulated ticks
    while (this.tickAccumulator >= 1) {
      this.processTick();
      this.tickAccumulator -= 1;
    }
  }

  /**
   * Process a single simulation tick
   */
  processTick() {
    const prevHour = this.hour;
    const prevDay = this.day;
    
    // Increment tick
    this.tick++;
    
    // Check for new day
    if (this.tick >= TICKS_PER_DAY) {
      this.tick = 0;
      this.day++;
      this.onNewDay();
    }
    
    // Check for new hour
    if (this.hour !== prevHour) {
      this.onNewHour(this.hour);
    }
    
    // Update all villagers
    const villagerArray = Array.from(this.villagers.values());
    for (const villager of villagerArray) {
      villager.update(this.world, this.hour, villagerArray);
      
      // Track location visits when villagers arrive at buildings (every 30 ticks)
      if (this.tick % 30 === 0) {
        const nearbyBuilding = this.findNearbyBuilding(villager.x, villager.y, 3);
        if (nearbyBuilding) {
          this.memorySystem.recordLocationVisit(
            villager.id,
            nearbyBuilding.id,
            nearbyBuilding.name || nearbyBuilding.type,
            { x: villager.x, y: villager.y }
          );
        }
      }
    }
    
    // Process interactions via InteractionManager
    const interactions = this.interactionManager.processTick(
      villagerArray, 
      this.tick, 
      this.dayPeriod
    );
    
    // Record interactions in memory system and emit events
    for (const interaction of interactions) {
      // Record in both villagers' memories
      this.memorySystem.recordInteraction(interaction.villager1_id, interaction);
      this.memorySystem.recordInteraction(interaction.villager2_id, interaction);
      
      // Generate thoughts about the interaction
      const v1 = this.villagers.get(interaction.villager1_id);
      const v2 = this.villagers.get(interaction.villager2_id);
      
      if (v1 && Math.random() < 0.5) {
        const thought = this.thoughtSystem.generateInteractionThought(v1, interaction);
        if (thought) this.emit('thought', thought);
      }
      if (v2 && Math.random() < 0.3) {
        const thought = this.thoughtSystem.generateInteractionThought(v2, interaction);
        if (thought) this.emit('thought', thought);
      }
      
      this.emit('interaction', interaction);
    }
    
    // Process thoughts (every 5 ticks for performance)
    if (this.tick % 5 === 0) {
      const thoughts = this.thoughtSystem.processTick(villagerArray, {
        currentTick: this.tick,
        timeOfDay: this.hour,
        interactions: this.interactionManager.pendingLogs
      });
      
      for (const thought of thoughts) {
        this.emit('thought', thought);
      }
    }
    
    // Periodically clean up old cooldowns and memories (every 500 ticks)
    if (this.tick % 500 === 0) {
      this.interactionManager.clearOldCooldowns(this.tick);
      this.memorySystem.clearOldMemories();
    }
    
    // Emit tick event (throttled to every 10 ticks for performance)
    if (this.tick % 10 === 0) {
      this.emit('tick', this.getState());
    }
  }

  /**
   * Called at the start of each new day
   */
  onNewDay() {
    const incomeResults = [];
    
    // Process each villager
    for (const villager of this.villagers.values()) {
      // Reset daily memory
      villager.resetDailyMemory();
      
      // Add daily income based on role
      const incomeResult = this.interactionManager.addDailyIncome(villager);
      incomeResults.push({
        villager: villager.id,
        name: villager.name,
        income: incomeResult.income
      });
      
      // Restock inventory if running low
      this.interactionManager.restockInventory(villager);
    }
    
    this.emit('newDay', { 
      day: this.day,
      dailyIncome: incomeResults
    });
  }

  /**
   * Called at the start of each new hour
   */
  onNewHour(hour) {
    this.emit('newHour', { hour, day: this.day, timeString: this.timeString });
  }

  /**
   * Get a specific villager
   */
  getVillager(id) {
    return this.villagers.get(id);
  }

  /**
   * Get all villagers
   */
  getAllVillagers() {
    return Array.from(this.villagers.values());
  }

  /**
   * Get current simulation state
   */
  getState() {
    return {
      tick: this.tick,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      timeString: this.timeString,
      dayPeriod: this.dayPeriod,
      isDaytime: this.isDaytime,
      paused: this.paused,
      speed: this.speed,
      villagers: this.getAllVillagers().map(v => v.getStatus())
    };
  }

  /**
   * Get full state for persistence
   */
  getFullState() {
    return {
      tick: this.tick,
      day: this.day,
      speed: this.speed,
      world: this.world.toJSON(),
      villagers: this.getAllVillagers().map(v => v.toJSON())
    };
  }

  /**
   * Load state from persistence
   */
  loadState(state) {
    if (state.tick !== undefined) this.tick = state.tick;
    if (state.day !== undefined) this.day = state.day;
    if (state.speed !== undefined) this.speed = state.speed;
    
    if (state.world) {
      this.world = World.fromJSON(state.world);
    }
    
    if (state.villagers) {
      this.villagers.clear();
      for (const vData of state.villagers) {
        const villager = Villager.fromJSON(vData);
        this.villagers.set(villager.id, villager);
      }
    }
    
    this.emit('stateLoaded', this.getState());
  }

  /**
   * Jump to a specific time
   */
  setTime(hour, minute = 0) {
    this.tick = hour * TICKS_PER_HOUR + minute;
    this.emit('timeSet', { hour, minute, timeString: this.timeString });
  }

  /**
   * Event system - subscribe to events
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  /**
   * Emit an event
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      }
    }
  }

  /**
   * Find villagers at or near a position
   */
  getVillagersAt(x, y, radius = 0) {
    return this.getAllVillagers().filter(v => {
      const dist = Math.abs(v.x - x) + Math.abs(v.y - y);
      return dist <= radius;
    });
  }

  /**
   * Find building near a position (checks entrance proximity)
   */
  findNearbyBuilding(x, y, radius = 3) {
    for (const [id, building] of this.world.buildings) {
      if (building.entrance) {
        const dist = Math.abs(building.entrance.x - x) + Math.abs(building.entrance.y - y);
        if (dist <= radius) {
          return building;
        }
      }
    }
    return null;
  }

  /**
   * Get villagers by activity
   */
  getVillagersByActivity(activity) {
    return this.getAllVillagers().filter(v => v.activity === activity);
  }

  /**
   * Get building occupancy (who's at/near each building)
   */
  getBuildingOccupancy() {
    const occupancy = {};
    
    for (const [id, building] of this.world.buildings) {
      const nearby = this.getVillagersAt(building.entrance.x, building.entrance.y, 3);
      occupancy[id] = {
        building: building.name || id,
        villagers: nearby.map(v => v.name)
      };
    }
    
    return occupancy;
  }

  /**
   * Get a narrative summary of current village state
   */
  getNarrativeSummary() {
    const state = this.getState();
    const occupancy = this.getBuildingOccupancy();
    
    let summary = `Day ${state.day}, ${state.timeString} (${state.dayPeriod})\n\n`;
    
    // Group villagers by activity
    const byActivity = {};
    for (const v of state.villagers) {
      if (!byActivity[v.activity]) byActivity[v.activity] = [];
      byActivity[v.activity].push(v.name);
    }
    
    for (const [activity, names] of Object.entries(byActivity)) {
      summary += `${activity}: ${names.join(', ')}\n`;
    }
    
    return summary;
  }

  /**
   * Get pending interaction logs for database sync
   * Clears the queue after retrieval
   */
  flushInteractionLogs() {
    return this.interactionManager.flushPendingLogs();
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats() {
    return this.interactionManager.getStats();
  }

  /**
   * Force an interaction between two villagers (for testing/scripting)
   */
  forceInteraction(villager1Id, villager2Id, type = null) {
    const v1 = this.villagers.get(villager1Id);
    const v2 = this.villagers.get(villager2Id);
    
    if (!v1 || !v2) {
      console.warn('Cannot force interaction: villager not found');
      return null;
    }
    
    // Import interaction types
    const { INTERACTION_TYPE } = require('./interactions.js');
    
    // Execute the interaction
    const interaction = this.interactionManager.executeInteraction(
      v1, v2, this.tick, this.dayPeriod
    );
    
    // Emit event
    this.emit('interaction', interaction);
    
    return interaction;
  }

  /**
   * Get recent interactions for a specific villager
   */
  getVillagerInteractions(villagerId) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return [];
    
    return villager.memory.recentEvents.filter(e => e.type === 'interaction');
  }

  /**
   * Get all relationships for a villager
   */
  getVillagerRelationships(villagerId) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return {};
    
    const relationships = {};
    for (const [otherId, value] of villager.relationships) {
      const other = this.villagers.get(otherId);
      relationships[otherId] = {
        name: other?.name || otherId,
        value: value,
        level: value > 70 ? 'friend' : value > 40 ? 'acquaintance' : 'stranger'
      };
    }
    
    return relationships;
  }

  // ==========================================
  // THOUGHT & MEMORY METHODS
  // ==========================================

  /**
   * Get pending thoughts for database sync
   * Clears the queue after retrieval
   */
  flushThoughtLogs() {
    return this.thoughtSystem.flushPendingThoughts();
  }

  /**
   * Get a villager's memories (interactions, impressions)
   */
  getVillagerMemories(villagerId) {
    return this.memorySystem.getMemories(villagerId);
  }

  /**
   * Get a villager's memory of a specific other villager
   */
  getVillagerMemoryOf(villagerId, otherId) {
    return this.memorySystem.getInteractionMemory(villagerId, otherId);
  }

  /**
   * Get recent interactions from memory for a villager
   */
  getRecentMemories(villagerId, limit = 5) {
    return this.memorySystem.getRecentInteractions(villagerId, limit);
  }

  /**
   * Generate a thought on demand for a specific villager
   */
  generateThought(villagerId) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return null;

    const villagerArray = Array.from(this.villagers.values());
    const nearbyVillagers = villagerArray.filter(v => 
      v.id !== villager.id && 
      Math.abs(v.x - villager.x) + Math.abs(v.y - villager.y) <= 5
    );

    const thought = this.thoughtSystem.generateThought(villager, {
      nearbyVillagers,
      recentInteractions: this.memorySystem.getRecentInteractions(villagerId),
      currentTick: this.tick,
      timeOfDay: this.hour
    });

    if (thought) {
      this.emit('thought', thought);
    }

    return thought;
  }

  /**
   * Get a narrative of what a villager is thinking based on their current state
   */
  getVillagerInnerMonologue(villagerId) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return null;

    const memories = this.memorySystem.getMemories(villagerId);
    const recentInteractions = memories.interactions.slice(-3);
    
    // Build context-aware inner monologue
    const parts = [];
    
    // Current activity thought
    parts.push(`*${villager.activity}*`);
    
    // Mood-based reflection
    if (villager.mood > 70) {
      parts.push("Feeling good today.");
    } else if (villager.mood < 30) {
      parts.push("Something feels off...");
    }

    // Recent interaction memory
    if (recentInteractions.length > 0) {
      const lastInteraction = recentInteractions[recentInteractions.length - 1];
      const otherName = lastInteraction.villager1_id === villagerId 
        ? lastInteraction.villager2_name 
        : lastInteraction.villager1_name;
      parts.push(`Just spoke with ${otherName?.split(' ')[0] || 'someone'}...`);
    }

    // Needs-based desire
    if (villager.hunger > 70) parts.push("I'm getting hungry.");
    if (villager.energy < 30) parts.push("I could use some rest.");
    if (villager.social < 30 && villager.hasTrait('extroverted')) {
      parts.push("I should find someone to talk to.");
    }

    return {
      villager: villager.name,
      activity: villager.activity,
      mood: villager.mood,
      thoughts: parts
    };
  }

  /**
   * Serialize memory system state for persistence
   */
  getMemoryState() {
    return this.memorySystem.toJSON();
  }

  /**
   * Load memory system state from persistence
   */
  loadMemoryState(state) {
    if (state) {
      this.memorySystem.fromJSON(state);
    }
  }

  // ==========================================
  // ECONOMY & TRANSACTION METHODS
  // ==========================================

  /**
   * Get pending transaction logs for database sync
   * Clears the queue after retrieval
   */
  flushTransactionLogs() {
    return this.interactionManager.flushTransactionLogs();
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats() {
    return this.interactionManager.getTransactionStats();
  }

  /**
   * Get a villager's economic status
   * @param {string} villagerId - Villager ID
   * @returns {Object} Economic status including coins and inventory
   */
  getVillagerEconomy(villagerId) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return null;
    return villager.getEconomicStatus();
  }

  /**
   * Get economic summary for all villagers
   */
  getVillageEconomy() {
    const economy = {
      totalCoins: 0,
      totalItems: 0,
      villagers: {}
    };

    for (const [id, villager] of this.villagers) {
      const status = villager.getEconomicStatus();
      economy.totalCoins += status.coins;
      economy.totalItems += status.totalItems;
      economy.villagers[id] = {
        name: villager.name,
        role: villager.role,
        ...status
      };
    }

    return economy;
  }

  /**
   * Force a trade between two villagers
   * @param {string} sellerId - Seller villager ID
   * @param {string} buyerId - Buyer villager ID
   * @param {string} item - Item to trade
   * @param {number} quantity - Quantity to trade
   * @param {number} [price] - Optional price override
   * @returns {Object} Transaction result
   */
  forceTrade(sellerId, buyerId, item, quantity = 1, price = null) {
    const seller = this.villagers.get(sellerId);
    const buyer = this.villagers.get(buyerId);

    if (!seller || !buyer) {
      return { success: false, reason: 'villager_not_found' };
    }

    const result = this.transactionManager.executePurchase(
      buyer, seller, item, quantity, price
    );

    if (result.success) {
      this.emit('transaction', result.transaction);
    }

    return result;
  }

  /**
   * Force a gift between villagers
   * @param {string} giverId - Giver villager ID
   * @param {string} receiverId - Receiver villager ID
   * @param {string} [item] - Item to gift
   * @param {number} [quantity] - Item quantity
   * @param {number} [coins] - Coins to gift
   * @returns {Object} Transaction result
   */
  forceGift(giverId, receiverId, item = null, quantity = 1, coins = 0) {
    const giver = this.villagers.get(giverId);
    const receiver = this.villagers.get(receiverId);

    if (!giver || !receiver) {
      return { success: false, reason: 'villager_not_found' };
    }

    const result = this.transactionManager.executeGift(
      giver, receiver, item, quantity, coins
    );

    if (result.success) {
      this.emit('transaction', result.transaction);
    }

    return result;
  }

  /**
   * Add coins to a villager
   * @param {string} villagerId - Villager ID
   * @param {number} amount - Amount to add
   */
  addCoinsToVillager(villagerId, amount) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return null;
    return villager.addCoins(amount);
  }

  /**
   * Add item to a villager's inventory
   * @param {string} villagerId - Villager ID
   * @param {string} item - Item name
   * @param {number} quantity - Quantity to add
   */
  addItemToVillager(villagerId, item, quantity = 1) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return null;
    return villager.addItem(item, quantity);
  }

  /**
   * Get trade price for an item
   * @param {string} item - Item name
   * @param {string} [sellerRole] - Seller's role
   * @param {number} [relationship] - Buyer-seller relationship
   * @returns {number} Calculated price
   */
  getTradePrice(item, sellerRole = null, relationship = 50) {
    const basePrice = this.transactionManager.getBasePrice(item, sellerRole);
    return this.transactionManager.calculatePrice(basePrice, relationship, true);
  }

  // ==========================================
  // THOUGHT & MEMORY SYSTEM METHODS
  // ==========================================

  /**
   * Get current thought bubble for a villager (for UI display)
   * @param {string} villagerId - Villager ID
   * @returns {Object} Thought bubble data
   */
  getVillagerThoughtBubble(villagerId) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return null;
    
    return this.thoughtSystem.getCurrentThoughtBubble(villager, {
      currentTick: this.tick,
      timeOfDay: this.hour
    });
  }

  /**
   * Get all thought bubbles for all villagers (for UI display)
   * @returns {Object} Map of villagerId -> thought bubble
   */
  getAllThoughtBubbles() {
    return this.thoughtSystem.getAllThoughtBubbles(
      this.getAllVillagers(),
      { currentTick: this.tick, timeOfDay: this.hour }
    );
  }

  /**
   * Get villager's memory summary (relationships, locations)
   * @param {string} villagerId - Villager ID
   * @returns {Object} Memory summary
   */
  getVillagerMemory(villagerId) {
    const memories = this.memorySystem.getMemories(villagerId);
    const relationships = this.memorySystem.getRelationshipSummary(villagerId);
    const recentLocations = this.memorySystem.getRecentLocations(villagerId, 5);
    const favoriteLocations = this.memorySystem.getFavoriteLocations(villagerId, 3);
    const recentInteractions = this.memorySystem.getRecentInteractions(villagerId, 5);
    
    return {
      relationships,
      recentLocations,
      favoriteLocations,
      recentInteractions: recentInteractions.map(i => ({
        with: i.villager1_id === villagerId ? i.villager2_name : i.villager1_name,
        type: i.type,
        sentiment: i.sentiment,
        when: i.rememberedAt
      }))
    };
  }

  /**
   * Get pending thoughts for database sync
   * Clears the queue after retrieval
   */
  flushThoughtLogs() {
    return this.thoughtSystem.flushPendingThoughts();
  }

  /**
   * Get memory data for database sync
   */
  getMemoryForDatabase() {
    return this.memorySystem.getAllForDatabase();
  }

  /**
   * Get who a villager likes/dislikes
   * @param {string} villagerId - Villager ID
   * @returns {Object} { likes: [], dislikes: [] }
   */
  getVillagerOpinions(villagerId) {
    const villager = this.villagers.get(villagerId);
    if (!villager) return { likes: [], dislikes: [] };
    
    return {
      likes: this.memorySystem.getLikedVillagers(villagerId).map(r => ({
        ...r,
        name: this.villagers.get(r.otherId)?.name || r.otherId
      })),
      dislikes: this.memorySystem.getDislikedVillagers(villagerId).map(r => ({
        ...r,
        name: this.villagers.get(r.otherId)?.name || r.otherId
      }))
    };
  }
}

// Export constants
export { TICKS_PER_HOUR, HOURS_PER_DAY, TICKS_PER_DAY };
export { ACTIVITY, TRAITS };

// Factory function for easy creation
export function createSimulation(options = {}) {
  return new SimulationEngine(options);
}

export default SimulationEngine;
