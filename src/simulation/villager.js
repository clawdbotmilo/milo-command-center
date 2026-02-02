/**
 * Villager Class with Movement and AI
 * Handles individual villager behavior, pathfinding, and decision making
 */

import { GRID_SIZE } from './world.js';
import { INTERACTION_TYPE, INTERACTION_RANGE } from './interactions.js';
import { Inventory, DEFAULT_INVENTORY, DEFAULT_COINS, ROLE_ITEMS } from './transactions.js';

// Activity states
export const ACTIVITY = {
  SLEEPING: 'sleeping',
  WAKING: 'waking',
  WORKING: 'working',
  EATING: 'eating',
  SOCIALIZING: 'socializing',
  WANDERING: 'wandering',
  TRAVELING: 'traveling',
  RESTING: 'resting',
  PRAYING: 'praying',
  SHOPPING: 'shopping'
};

// Default daily schedule (hours 0-23)
const DEFAULT_SCHEDULE = {
  0: ACTIVITY.SLEEPING,
  6: ACTIVITY.WAKING,
  7: ACTIVITY.WORKING,
  12: ACTIVITY.EATING,
  13: ACTIVITY.WORKING,
  17: ACTIVITY.SOCIALIZING,
  20: ACTIVITY.RESTING,
  22: ACTIVITY.SLEEPING
};

// Personality traits that affect behavior
export const TRAITS = {
  INTROVERTED: 'introverted',
  EXTROVERTED: 'extroverted',
  HARDWORKING: 'hardworking',
  LAZY: 'lazy',
  CURIOUS: 'curious',
  CAUTIOUS: 'cautious',
  CHEERFUL: 'cheerful',
  MELANCHOLIC: 'melancholic',
  DEVOUT: 'devout',
  SCHOLARLY: 'scholarly',
  ADVENTUROUS: 'adventurous',
  HOMEBODY: 'homebody'
};

/**
 * Villager class - represents a single villager with AI behavior
 */
export class Villager {
  constructor(id, config = {}) {
    // Identity
    this.id = id;
    this.name = config.name || id;
    this.role = config.role || 'villager';
    
    // Position
    this.x = config.x ?? Math.floor(GRID_SIZE / 2);
    this.y = config.y ?? Math.floor(GRID_SIZE / 2);
    
    // Movement
    this.targetX = null;
    this.targetY = null;
    this.path = [];
    this.moveSpeed = config.moveSpeed || 1; // tiles per tick
    this.moveCooldown = 0;
    
    // State
    this.activity = ACTIVITY.SLEEPING;
    this.energy = config.energy ?? 100;
    this.hunger = config.hunger ?? 0;
    this.social = config.social ?? 50;
    this.mood = config.mood ?? 75;
    
    // Personality
    this.personality = config.personality || {};
    this.traits = config.traits || [];
    this.schedule = { ...DEFAULT_SCHEDULE, ...config.schedule };
    
    // Preferences (building IDs or types they prefer)
    this.homeId = config.homeId || null;
    this.workplaceId = config.workplaceId || null;
    this.favoriteSpots = config.favoriteSpots || [];
    
    // Interaction
    this.interactionTarget = null;
    this.lastInteraction = null;
    this.relationships = new Map(); // villagerId -> relationship value
    this.interactionCooldowns = new Map(); // villagerId -> last interaction tick
    this.currentInteraction = null; // Active interaction data
    
    // Memory for AI decisions
    this.memory = {
      lastActivity: null,
      ticksInActivity: 0,
      visitedToday: new Set(),
      recentEvents: []
    };

    // Economy - coins and inventory
    this.coins = config.coins ?? DEFAULT_COINS[this.role] ?? 50;
    this.inventory = config.inventory instanceof Inventory 
      ? config.inventory 
      : new Inventory(config.inventory || DEFAULT_INVENTORY[this.role] || []);
    
    // Trade cooldowns and pending trades
    this.tradeCooldowns = new Map(); // villagerId -> lastTradeTick
    this.pendingTrade = null; // Current trade offer being considered
  }

  /**
   * Main update function called each tick
   */
  update(world, timeOfDay, allVillagers) {
    this.updateNeeds();
    this.updateActivity(timeOfDay);
    this.updateMovement(world);
    this.updateInteractions(allVillagers, world);
    
    this.memory.ticksInActivity++;
  }

  /**
   * Update villager needs over time
   */
  updateNeeds() {
    // Energy decreases during day, recovers while sleeping
    if (this.activity === ACTIVITY.SLEEPING) {
      this.energy = Math.min(100, this.energy + 0.5);
    } else {
      this.energy = Math.max(0, this.energy - 0.1);
    }
    
    // Hunger increases over time
    if (this.activity !== ACTIVITY.EATING) {
      this.hunger = Math.min(100, this.hunger + 0.05);
    } else {
      this.hunger = Math.max(0, this.hunger - 2);
    }
    
    // Social needs based on personality
    if (this.activity === ACTIVITY.SOCIALIZING) {
      if (this.hasTrait(TRAITS.EXTROVERTED)) {
        this.social = Math.min(100, this.social + 1);
        this.mood = Math.min(100, this.mood + 0.5);
      } else if (this.hasTrait(TRAITS.INTROVERTED)) {
        this.social = Math.min(100, this.social + 0.3);
        // Introverts get tired from too much socializing
        if (this.social > 80) this.energy -= 0.2;
      } else {
        this.social = Math.min(100, this.social + 0.5);
      }
    } else {
      // Social need decays differently based on personality
      const decayRate = this.hasTrait(TRAITS.INTROVERTED) ? 0.02 : 0.08;
      this.social = Math.max(0, this.social - decayRate);
    }
    
    // Mood affected by needs
    if (this.hunger > 70) this.mood = Math.max(0, this.mood - 0.3);
    if (this.energy < 30) this.mood = Math.max(0, this.mood - 0.2);
    if (this.social < 20 && this.hasTrait(TRAITS.EXTROVERTED)) {
      this.mood = Math.max(0, this.mood - 0.3);
    }
  }

  /**
   * Determine activity based on time and personality
   */
  updateActivity(hour) {
    // Find scheduled activity for current hour
    let scheduledActivity = ACTIVITY.WANDERING;
    let lastScheduleHour = 0;
    
    for (const scheduleHour of Object.keys(this.schedule).map(Number).sort((a, b) => a - b)) {
      if (scheduleHour <= hour) {
        scheduledActivity = this.schedule[scheduleHour];
        lastScheduleHour = scheduleHour;
      }
    }
    
    // Personality can modify scheduled activity
    const newActivity = this.modifyActivityByPersonality(scheduledActivity, hour);
    
    // Track activity changes
    if (newActivity !== this.activity) {
      this.memory.lastActivity = this.activity;
      this.memory.ticksInActivity = 0;
      this.activity = newActivity;
      this.onActivityChange(newActivity);
    }
  }

  /**
   * Personality modifies base schedule
   */
  modifyActivityByPersonality(baseActivity, hour) {
    // Hardworking villagers work longer
    if (this.hasTrait(TRAITS.HARDWORKING) && baseActivity === ACTIVITY.SOCIALIZING) {
      if (Math.random() < 0.3) return ACTIVITY.WORKING;
    }
    
    // Lazy villagers might skip work
    if (this.hasTrait(TRAITS.LAZY) && baseActivity === ACTIVITY.WORKING) {
      if (Math.random() < 0.1) return ACTIVITY.RESTING;
    }
    
    // Devout villagers pray in the morning
    if (this.hasTrait(TRAITS.DEVOUT) && baseActivity === ACTIVITY.WAKING) {
      return ACTIVITY.PRAYING;
    }
    
    // Scholarly villagers might read instead of socialize
    if (this.hasTrait(TRAITS.SCHOLARLY) && baseActivity === ACTIVITY.SOCIALIZING) {
      if (Math.random() < 0.4) return ACTIVITY.WANDERING; // Heading to library
    }
    
    // Low energy forces rest
    if (this.energy < 20 && baseActivity !== ACTIVITY.SLEEPING) {
      return ACTIVITY.RESTING;
    }
    
    // High hunger forces eating
    if (this.hunger > 85) {
      return ACTIVITY.EATING;
    }
    
    return baseActivity;
  }

  /**
   * Called when activity changes - set new destination
   */
  onActivityChange(newActivity) {
    // Clear current path to recalculate
    this.path = [];
    this.targetX = null;
    this.targetY = null;
  }

  /**
   * Update movement and pathfinding
   */
  updateMovement(world) {
    // Cooldown between moves
    if (this.moveCooldown > 0) {
      this.moveCooldown--;
      return;
    }
    
    // If we have a path, follow it
    if (this.path.length > 0) {
      const next = this.path.shift();
      this.x = next.x;
      this.y = next.y;
      this.moveCooldown = Math.floor(10 / this.moveSpeed); // Slower = longer cooldown
      return;
    }
    
    // No path - decide where to go based on activity
    this.decideDestination(world);
  }

  /**
   * Decide where to go based on current activity
   */
  decideDestination(world) {
    let destination = null;
    
    switch (this.activity) {
      case ACTIVITY.SLEEPING:
      case ACTIVITY.WAKING:
        destination = this.getHomePosition(world);
        break;
        
      case ACTIVITY.WORKING:
        destination = this.getWorkplacePosition(world);
        break;
        
      case ACTIVITY.EATING:
        // Go home or to tavern
        destination = Math.random() < 0.6 
          ? this.getHomePosition(world)
          : this.getBuildingPosition(world, 'social');
        break;
        
      case ACTIVITY.SOCIALIZING:
        destination = this.getSocialDestination(world);
        break;
        
      case ACTIVITY.PRAYING:
        destination = this.getBuildingPosition(world, 'spiritual');
        break;
        
      case ACTIVITY.SHOPPING:
        destination = this.getBuildingPosition(world, 'commerce');
        break;
        
      case ACTIVITY.WANDERING:
      case ACTIVITY.RESTING:
      default:
        destination = this.getWanderDestination(world);
        break;
    }
    
    if (destination && (destination.x !== this.x || destination.y !== this.y)) {
      this.path = world.findPath(this.x, this.y, destination.x, destination.y);
      this.targetX = destination.x;
      this.targetY = destination.y;
    }
  }

  /**
   * Get home position
   */
  getHomePosition(world) {
    if (this.homeId) {
      const home = world.getBuilding(this.homeId);
      if (home) return { x: home.entrance.x, y: home.entrance.y };
    }
    return { x: this.x, y: this.y };
  }

  /**
   * Get workplace position
   */
  getWorkplacePosition(world) {
    if (this.workplaceId) {
      const work = world.getBuilding(this.workplaceId);
      if (work) return { x: work.entrance.x, y: work.entrance.y };
    }
    // Default to nearest work building
    const work = world.findNearestBuilding(this.x, this.y, 'work');
    if (work) return { x: work.entrance.x, y: work.entrance.y };
    return this.getWanderDestination(world);
  }

  /**
   * Get position of building by category
   */
  getBuildingPosition(world, category) {
    const building = world.findNearestBuilding(this.x, this.y, category);
    if (building) return { x: building.entrance.x, y: building.entrance.y };
    return this.getWanderDestination(world);
  }

  /**
   * Get social destination based on personality
   */
  getSocialDestination(world) {
    // Introverts prefer quieter spots
    if (this.hasTrait(TRAITS.INTROVERTED)) {
      if (Math.random() < 0.5) return this.getHomePosition(world);
      return this.getBuildingPosition(world, 'learning'); // Library
    }
    
    // Extroverts go to the tavern
    if (this.hasTrait(TRAITS.EXTROVERTED)) {
      return this.getBuildingPosition(world, 'social');
    }
    
    // Others mix it up
    const choices = ['social', 'commerce', 'utility'];
    const choice = choices[Math.floor(Math.random() * choices.length)];
    return this.getBuildingPosition(world, choice);
  }

  /**
   * Get a random wander destination influenced by personality
   */
  getWanderDestination(world) {
    // Homebodies stay close to home
    if (this.hasTrait(TRAITS.HOMEBODY)) {
      const home = this.getHomePosition(world);
      return {
        x: home.x + Math.floor(Math.random() * 20) - 10,
        y: home.y + Math.floor(Math.random() * 20) - 10
      };
    }
    
    // Adventurous villagers explore farther
    if (this.hasTrait(TRAITS.ADVENTUROUS)) {
      return world.getRandomWalkablePosition();
    }
    
    // Curious villagers visit places they haven't been
    if (this.hasTrait(TRAITS.CURIOUS)) {
      const buildings = Array.from(world.buildings.values());
      const unvisited = buildings.filter(b => !this.memory.visitedToday.has(b.id));
      if (unvisited.length > 0) {
        const target = unvisited[Math.floor(Math.random() * unvisited.length)];
        this.memory.visitedToday.add(target.id);
        return { x: target.entrance.x, y: target.entrance.y };
      }
    }
    
    // Default: wander near current position
    const range = 15;
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, this.x + Math.floor(Math.random() * range * 2) - range)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, this.y + Math.floor(Math.random() * range * 2) - range))
    };
  }

  /**
   * Update interactions with nearby villagers
   */
  updateInteractions(allVillagers, world) {
    // Skip if sleeping or traveling
    if (this.activity === ACTIVITY.SLEEPING) return;
    
    // Find nearby villagers
    const nearby = allVillagers.filter(v => 
      v.id !== this.id && 
      v.activity !== ACTIVITY.SLEEPING &&
      this.distanceTo(v) < 5
    );
    
    if (nearby.length === 0) {
      this.interactionTarget = null;
      return;
    }
    
    // Maybe start interaction
    if (!this.interactionTarget && this.shouldInitiateInteraction()) {
      // Pick someone to interact with
      const target = this.selectInteractionTarget(nearby);
      if (target) {
        this.interactionTarget = target.id;
        // Move toward them
        this.path = world.findPath(this.x, this.y, target.x, target.y);
      }
    }
    
    // Update existing interaction
    if (this.interactionTarget) {
      const target = nearby.find(v => v.id === this.interactionTarget);
      if (!target || this.distanceTo(target) > 10) {
        // Lost interaction target
        this.interactionTarget = null;
      } else if (this.distanceTo(target) <= 2) {
        // Close enough to interact
        this.doInteraction(target);
      }
    }
  }

  /**
   * Check if this villager wants to start an interaction
   */
  shouldInitiateInteraction() {
    // Base chance
    let chance = 0.05;
    
    // Extroverts more likely
    if (this.hasTrait(TRAITS.EXTROVERTED)) chance += 0.1;
    
    // Introverts less likely
    if (this.hasTrait(TRAITS.INTROVERTED)) chance -= 0.03;
    
    // Socializing activity increases chance
    if (this.activity === ACTIVITY.SOCIALIZING) chance += 0.15;
    
    // Low social need increases chance for extroverts
    if (this.social < 30 && this.hasTrait(TRAITS.EXTROVERTED)) chance += 0.1;
    
    // Good mood increases chance
    if (this.mood > 70) chance += 0.05;
    
    return Math.random() < chance;
  }

  /**
   * Select who to interact with from nearby villagers
   */
  selectInteractionTarget(nearby) {
    // Prefer villagers we have good relationships with
    const scored = nearby.map(v => ({
      villager: v,
      score: (this.relationships.get(v.id) || 50) + Math.random() * 20
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.villager;
  }

  /**
   * Perform interaction with target (legacy method - now uses InteractionManager)
   */
  doInteraction(target) {
    // Update relationship
    const currentRel = this.relationships.get(target.id) || 50;
    const change = (Math.random() * 10) - 2; // Usually positive
    this.relationships.set(target.id, Math.max(0, Math.min(100, currentRel + change)));
    
    // Log interaction
    this.lastInteraction = {
      with: target.id,
      timestamp: Date.now(),
      type: this.activity
    };
    
    // Clear interaction after it happens
    this.interactionTarget = null;
    
    // Add to memory
    this.memory.recentEvents.push({
      type: 'interaction',
      with: target.id,
      mood: this.mood
    });
    
    // Keep memory limited
    if (this.memory.recentEvents.length > 20) {
      this.memory.recentEvents.shift();
    }
  }

  // ==========================================
  // INTERACTION METHODS
  // ==========================================

  /**
   * Check if this villager can interact with another
   * @param {Villager} other - The other villager
   * @param {number} currentTick - Current simulation tick
   * @param {number} cooldown - Cooldown period in ticks
   * @returns {boolean} Whether interaction is possible
   */
  canInteractWith(other, currentTick = 0, cooldown = 120) {
    // Can't interact with self
    if (other.id === this.id) return false;
    
    // Can't interact while sleeping
    if (this.activity === ACTIVITY.SLEEPING || other.activity === ACTIVITY.SLEEPING) {
      return false;
    }
    
    // Check distance
    if (this.distanceTo(other) > INTERACTION_RANGE) return false;
    
    // Check cooldown
    const lastInteraction = this.interactionCooldowns.get(other.id);
    if (lastInteraction && (currentTick - lastInteraction) < cooldown) {
      return false;
    }
    
    return true;
  }

  /**
   * Get likelihood to initiate an interaction (0-1)
   * Based on personality, current state, and activity
   */
  getInteractionLikelihood() {
    let likelihood = 0.05; // Base 5%
    
    // Personality modifiers
    if (this.hasTrait(TRAITS.EXTROVERTED)) likelihood += 0.15;
    if (this.hasTrait(TRAITS.INTROVERTED)) likelihood -= 0.03;
    if (this.hasTrait(TRAITS.CHEERFUL)) likelihood += 0.05;
    if (this.hasTrait(TRAITS.MELANCHOLIC)) likelihood -= 0.02;
    if (this.hasTrait(TRAITS.CURIOUS)) likelihood += 0.05;
    if (this.hasTrait(TRAITS.CAUTIOUS)) likelihood -= 0.02;
    
    // Activity modifiers
    if (this.activity === ACTIVITY.SOCIALIZING) likelihood += 0.20;
    if (this.activity === ACTIVITY.WORKING) likelihood -= 0.05;
    if (this.activity === ACTIVITY.RESTING) likelihood -= 0.03;
    
    // State modifiers
    if (this.social < 30 && this.hasTrait(TRAITS.EXTROVERTED)) likelihood += 0.15;
    if (this.mood > 70) likelihood += 0.05;
    if (this.mood < 30) likelihood -= 0.05;
    if (this.energy < 20) likelihood -= 0.10;
    
    return Math.max(0, Math.min(1, likelihood));
  }

  /**
   * Initiate a greeting with another villager
   * @param {Villager} target - The villager to greet
   * @returns {Object} Greeting interaction data
   */
  initiateGreeting(target) {
    const relationship = this.relationships.get(target.id) || 50;
    
    // Determine warmth based on relationship and personality
    let warmth = 'neutral';
    if (this.hasTrait(TRAITS.CHEERFUL)) warmth = 'warm';
    else if (relationship > 70) warmth = 'warm';
    else if (relationship < 30) warmth = 'cold';
    
    // Generate greeting
    const greetings = {
      warm: [
        `Good to see you, ${target.name.split(' ')[0]}!`,
        `Ah, ${target.name.split(' ')[0]}! What a pleasure!`,
        `${target.name.split(' ')[0]}, my friend!`
      ],
      neutral: [
        `Hello, ${target.name.split(' ')[0]}.`,
        `Good day, ${target.name.split(' ')[0]}.`,
        `${target.name.split(' ')[0]}. *nods*`
      ],
      cold: [
        `${target.name.split(' ')[0]}.`,
        `*brief nod*`,
        `Oh. It's you.`
      ]
    };
    
    const options = greetings[warmth];
    const dialogue = options[Math.floor(Math.random() * options.length)];
    
    return {
      type: INTERACTION_TYPE.GREETING,
      initiator: this.id,
      target: target.id,
      dialogue,
      warmth,
      sentiment: warmth === 'warm' ? 0.5 : warmth === 'cold' ? -0.3 : 0.1
    };
  }

  /**
   * Initiate a conversation with another villager
   * @param {Villager} target - The villager to talk to
   * @param {string} [topic] - Optional topic override
   * @returns {Object} Conversation interaction data
   */
  initiateConversation(target, topic = null) {
    // Pick topic based on roles if not provided
    const roleTopics = {
      herbalist: ['herbs', 'remedies', 'the forest'],
      blacksmith: ['metalwork', 'tools', 'the forge'],
      baker: ['bread', 'recipes', 'the morning'],
      messenger: ['news', 'the roads', 'travelers'],
      'tavern keeper': ['gossip', 'visitors', 'ale'],
      scholar: ['books', 'history', 'philosophy'],
      farmer: ['crops', 'weather', 'the harvest']
    };
    
    if (!topic) {
      const myTopics = roleTopics[this.role] || ['the village'];
      const theirTopics = roleTopics[target.role] || ['life'];
      const allTopics = [...myTopics, ...theirTopics];
      topic = allTopics[Math.floor(Math.random() * allTopics.length)];
    }
    
    // Generate conversation starter based on personality
    let starter;
    if (this.hasTrait(TRAITS.CURIOUS)) {
      starter = `What do you think about ${topic}?`;
    } else if (this.hasTrait(TRAITS.SCHOLARLY)) {
      starter = `I've been reading about ${topic}...`;
    } else if (this.hasTrait(TRAITS.CHEERFUL)) {
      starter = `Isn't ${topic} just wonderful?`;
    } else if (this.hasTrait(TRAITS.MELANCHOLIC)) {
      starter = `${topic} has been on my mind lately...`;
    } else {
      starter = `About ${topic}... what are your thoughts?`;
    }
    
    const sentiment = (this.mood + target.mood) / 200; // 0-1 based on combined mood
    
    return {
      type: INTERACTION_TYPE.CONVERSATION,
      initiator: this.id,
      target: target.id,
      dialogue: starter,
      topic,
      sentiment: sentiment - 0.5 // Normalize to -0.5 to 0.5
    };
  }

  /**
   * Initiate a trade with another villager
   * @param {Villager} target - The villager to trade with
   * @param {Object} [offer] - Optional trade offer {item, price}
   * @returns {Object} Trade interaction data
   */
  initiateTrade(target, offer = null) {
    // Default items based on role
    const roleItems = {
      herbalist: ['healing herbs', 'dried flowers', 'remedy potion'],
      blacksmith: ['iron nails', 'small tool', 'metal charm'],
      baker: ['fresh bread', 'pastry', 'biscuits'],
      messenger: ['map', 'letter', 'news'],
      'tavern keeper': ['ale', 'snacks', 'drink token'],
      scholar: ['old book', 'notes', 'quill'],
      farmer: ['vegetables', 'eggs', 'grain']
    };
    
    if (!offer) {
      const items = roleItems[this.role] || ['goods'];
      offer = {
        item: items[Math.floor(Math.random() * items.length)],
        price: Math.floor(Math.random() * 10) + 1
      };
    }
    
    const relationship = this.relationships.get(target.id) || 50;
    const isFriendly = relationship > 60;
    
    const dialogue = isFriendly
      ? `${target.name.split(' ')[0]}, I have some ${offer.item}. ${offer.price} coins, just for you.`
      : `Looking for ${offer.item}? ${offer.price} coins.`;
    
    return {
      type: INTERACTION_TYPE.TRADE,
      initiator: this.id,
      target: target.id,
      dialogue,
      offer,
      sentiment: isFriendly ? 0.3 : 0.1
    };
  }

  /**
   * Offer help to another villager
   * @param {Villager} target - The villager to help
   * @returns {Object} Help interaction data
   */
  initiateHelp(target) {
    // Help actions based on role
    const roleHelp = {
      herbalist: ['offers herbal advice', 'shares a remedy', 'identifies a plant'],
      blacksmith: ['offers to repair something', 'shares tips', 'lends a tool'],
      baker: ['shares fresh bread', 'offers a recipe', 'gives baking advice'],
      messenger: ['offers to deliver something', 'shares directions', 'gives news'],
      'tavern keeper': ['offers a free drink', 'shares information', 'listens'],
      scholar: ['shares knowledge', 'helps with reading', 'offers counsel'],
      farmer: ['helps carry something', 'shares wisdom', 'offers produce']
    };
    
    const actions = roleHelp[this.role] || ['offers assistance'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const dialogue = `${this.name.split(' ')[0]} ${action} for ${target.name.split(' ')[0]}.`;
    
    return {
      type: INTERACTION_TYPE.HELP,
      initiator: this.id,
      target: target.id,
      dialogue,
      action,
      sentiment: 0.5 // Helping is always positive
    };
  }

  /**
   * Record an interaction (for cooldown tracking)
   * @param {string} otherId - ID of the other villager
   * @param {number} tick - Current simulation tick
   */
  recordInteraction(otherId, tick) {
    this.interactionCooldowns.set(otherId, tick);
  }

  /**
   * Get relationship level with another villager
   * @param {string} otherId - ID of the other villager
   * @returns {number} Relationship value 0-100
   */
  getRelationship(otherId) {
    return this.relationships.get(otherId) || 50;
  }

  /**
   * Adjust relationship with another villager
   * @param {string} otherId - ID of the other villager
   * @param {number} change - Amount to change (+/-)
   */
  adjustRelationship(otherId, change) {
    const current = this.relationships.get(otherId) || 50;
    const newValue = Math.max(0, Math.min(100, current + change));
    this.relationships.set(otherId, newValue);
    return newValue;
  }

  /**
   * Get interaction style based on personality
   * @returns {string} Style descriptor
   */
  getInteractionStyle() {
    if (this.hasTrait(TRAITS.EXTROVERTED) && this.hasTrait(TRAITS.CHEERFUL)) {
      return 'enthusiastic';
    } else if (this.hasTrait(TRAITS.INTROVERTED) && this.hasTrait(TRAITS.SCHOLARLY)) {
      return 'thoughtful';
    } else if (this.hasTrait(TRAITS.CURIOUS)) {
      return 'inquisitive';
    } else if (this.hasTrait(TRAITS.CAUTIOUS)) {
      return 'reserved';
    } else if (this.hasTrait(TRAITS.MELANCHOLIC)) {
      return 'subdued';
    } else if (this.hasTrait(TRAITS.HARDWORKING)) {
      return 'practical';
    }
    return 'friendly';
  }

  /**
   * Check if this villager is likely to accept a trade
   * @param {Object} offer - The trade offer
   * @param {Villager} from - The offering villager
   * @returns {boolean} Whether the trade would be accepted
   */
  wouldAcceptTrade(offer, from) {
    const relationship = this.relationships.get(from.id) || 50;
    
    // Base acceptance rate
    let acceptChance = 0.5;
    
    // Better relationship = more likely to accept
    acceptChance += (relationship - 50) / 100;
    
    // Mood affects willingness
    acceptChance += (this.mood - 50) / 200;
    
    // Extroverts are more agreeable
    if (this.hasTrait(TRAITS.EXTROVERTED)) acceptChance += 0.1;
    
    // Cautious villagers are harder to convince
    if (this.hasTrait(TRAITS.CAUTIOUS)) acceptChance -= 0.15;

    // Check if can actually afford if it's a purchase
    if (offer.price && !this.canAfford(offer.price)) {
      return false;
    }
    
    return Math.random() < acceptChance;
  }

  // ==========================================
  // ECONOMY METHODS
  // ==========================================

  /**
   * Check if villager can afford a cost
   * @param {number} amount - Cost to check
   * @returns {boolean} True if has enough coins
   */
  canAfford(amount) {
    return this.coins >= amount;
  }

  /**
   * Add coins to balance
   * @param {number} amount - Amount to add
   * @returns {number} New balance
   */
  addCoins(amount) {
    this.coins = Math.max(0, this.coins + amount);
    return this.coins;
  }

  /**
   * Remove coins from balance
   * @param {number} amount - Amount to remove
   * @returns {boolean} True if successful
   */
  removeCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    return true;
  }

  /**
   * Check if has item in inventory
   * @param {string} item - Item name
   * @param {number} quantity - Required quantity
   * @returns {boolean} True if has enough
   */
  hasItem(item, quantity = 1) {
    return this.inventory.has(item, quantity);
  }

  /**
   * Get quantity of item in inventory
   * @param {string} item - Item name
   * @returns {number} Quantity owned
   */
  getItemQuantity(item) {
    return this.inventory.getQuantity(item);
  }

  /**
   * Add item to inventory
   * @param {string} item - Item name
   * @param {number} quantity - Amount to add
   * @param {string} [type] - Item type
   * @returns {number} New total quantity
   */
  addItem(item, quantity = 1, type = null) {
    return this.inventory.add(item, quantity, type);
  }

  /**
   * Remove item from inventory
   * @param {string} item - Item name
   * @param {number} quantity - Amount to remove
   * @returns {boolean} True if successful
   */
  removeItem(item, quantity = 1) {
    return this.inventory.remove(item, quantity);
  }

  /**
   * Get all inventory items
   * @returns {Array} All items
   */
  getInventory() {
    return this.inventory.getAll();
  }

  /**
   * Get a tradeable item based on role
   * @returns {Object|null} Item offer with name, quantity, basePrice
   */
  getTradeableItem() {
    // Get role-specific items
    const roleItems = ROLE_ITEMS[this.role] || {};
    const availableItems = [];
    
    for (const [itemName, itemData] of Object.entries(roleItems)) {
      const qty = this.inventory.getQuantity(itemName);
      if (qty > 0) {
        availableItems.push({
          item: itemName,
          quantity: qty,
          price: itemData.price,
          type: itemData.type
        });
      }
    }
    
    if (availableItems.length === 0) {
      // Try any inventory item
      const anyItem = this.inventory.getRandomItem();
      if (anyItem) {
        return {
          item: anyItem.item,
          quantity: anyItem.quantity,
          price: 5, // Default price for unknown items
          type: anyItem.type
        };
      }
      return null;
    }
    
    // Pick a random tradeable item
    return availableItems[Math.floor(Math.random() * availableItems.length)];
  }

  /**
   * Check if can trade with another villager (cooldown check)
   * @param {string} otherId - Other villager's ID
   * @param {number} currentTick - Current simulation tick
   * @param {number} cooldown - Cooldown period in ticks
   * @returns {boolean} True if can trade
   */
  canTradeWith(otherId, currentTick, cooldown = 300) {
    const lastTrade = this.tradeCooldowns.get(otherId);
    if (!lastTrade) return true;
    return (currentTick - lastTrade) >= cooldown;
  }

  /**
   * Record a trade (for cooldown tracking)
   * @param {string} otherId - Other villager's ID
   * @param {number} tick - Current simulation tick
   */
  recordTrade(otherId, tick) {
    this.tradeCooldowns.set(otherId, tick);
  }

  /**
   * Get economic status summary
   * @returns {Object} Economic status
   */
  getEconomicStatus() {
    return {
      coins: this.coins,
      inventoryCount: this.inventory.uniqueCount,
      totalItems: this.inventory.totalCount,
      inventory: this.inventory.getAll()
    };
  }

  /**
   * Determine willingness to sell an item
   * Based on personality, stock levels, and relationship
   * @param {string} item - Item being requested
   * @param {number} offered - Price offered
   * @param {Villager} buyer - The potential buyer
   * @returns {Object} Willingness result
   */
  willingToSell(item, offered, buyer) {
    const qty = this.getItemQuantity(item);
    if (qty === 0) {
      return { willing: false, reason: 'out_of_stock' };
    }
    
    // Get base price
    const roleItems = ROLE_ITEMS[this.role] || {};
    const basePrice = roleItems[item]?.price || 5;
    
    // Relationship modifier
    const relationship = this.relationships.get(buyer.id) || 50;
    let minAcceptable = basePrice;
    
    if (relationship > 70) {
      minAcceptable = Math.floor(basePrice * 0.8); // Friend discount
    } else if (relationship < 30) {
      minAcceptable = Math.floor(basePrice * 1.2); // Stranger markup
    }
    
    // Low stock = higher price requirement
    if (qty <= 2) {
      minAcceptable = Math.floor(minAcceptable * 1.3);
    }
    
    // Personality affects haggling
    if (this.hasTrait(TRAITS.CHEERFUL)) {
      minAcceptable = Math.floor(minAcceptable * 0.9);
    }
    if (this.hasTrait(TRAITS.CAUTIOUS)) {
      minAcceptable = Math.floor(minAcceptable * 1.1);
    }
    
    return {
      willing: offered >= minAcceptable,
      reason: offered >= minAcceptable ? 'acceptable' : 'price_too_low',
      minAcceptable,
      offered
    };
  }

  /**
   * Calculate distance to another villager
   */
  distanceTo(other) {
    return Math.abs(other.x - this.x) + Math.abs(other.y - this.y);
  }

  /**
   * Check if villager has a specific trait
   */
  hasTrait(trait) {
    return this.traits.includes(trait);
  }

  /**
   * Reset daily memory (called at midnight)
   */
  resetDailyMemory() {
    this.memory.visitedToday.clear();
  }

  /**
   * Get current state summary
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      position: { x: this.x, y: this.y },
      activity: this.activity,
      needs: {
        energy: Math.round(this.energy),
        hunger: Math.round(this.hunger),
        social: Math.round(this.social),
        mood: Math.round(this.mood)
      },
      economy: {
        coins: this.coins,
        inventoryItems: this.inventory.uniqueCount
      },
      moving: this.path.length > 0,
      destination: this.targetX !== null ? { x: this.targetX, y: this.targetY } : null
    };
  }

  /**
   * Serialize for persistence
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      x: this.x,
      y: this.y,
      energy: this.energy,
      hunger: this.hunger,
      social: this.social,
      mood: this.mood,
      activity: this.activity,
      personality: this.personality,
      traits: this.traits,
      schedule: this.schedule,
      homeId: this.homeId,
      workplaceId: this.workplaceId,
      favoriteSpots: this.favoriteSpots,
      relationships: Array.from(this.relationships.entries()),
      memory: {
        lastActivity: this.memory.lastActivity,
        recentEvents: this.memory.recentEvents.slice(-10)
      },
      // Economic data
      coins: this.coins,
      inventory: this.inventory.toJSON()
    };
  }

  /**
   * Load from JSON
   */
  static fromJSON(data) {
    const villager = new Villager(data.id, data);
    villager.activity = data.activity || ACTIVITY.SLEEPING;
    if (data.relationships) {
      villager.relationships = new Map(data.relationships);
    }
    if (data.memory) {
      villager.memory.lastActivity = data.memory.lastActivity;
      villager.memory.recentEvents = data.memory.recentEvents || [];
    }
    // Restore economic data
    if (data.coins !== undefined) {
      villager.coins = data.coins;
    }
    if (data.inventory) {
      villager.inventory = Inventory.fromJSON(data.inventory);
    }
    return villager;
  }
}

export default Villager;
