/**
 * Villager Interaction System
 * Rich villager-to-villager interactions with personality-driven behavior
 */

import { createTransactionManager, ROLE_ITEMS } from './transactions.js';

// Interaction types
export const INTERACTION_TYPE = {
  GREETING: 'greeting',
  CONVERSATION: 'conversation',
  TRADE: 'trade',
  HELP: 'help',
  GOSSIP: 'gossip',
  ARGUMENT: 'argument'
};

// Interaction range in tiles
export const INTERACTION_RANGE = 3;

// Cooldown between interactions with same villager (in ticks)
export const INTERACTION_COOLDOWN = 120; // ~2 minutes at normal speed

// Conversation topics based on roles/interests
const CONVERSATION_TOPICS = {
  herbalist: ['herbs', 'remedies', 'plants', 'the forest', 'healing'],
  blacksmith: ['metalwork', 'tools', 'fire', 'ore', 'crafting'],
  baker: ['bread', 'recipes', 'the harvest', 'morning routines', 'flavors'],
  messenger: ['news', 'roads', 'travelers', 'the outside world', 'secrets'],
  'tavern keeper': ['gossip', 'drinks', 'visitors', 'stories', 'the evening crowd'],
  scholar: ['books', 'history', 'philosophy', 'the stars', 'ancient texts'],
  farmer: ['crops', 'weather', 'soil', 'seasons', 'hard work']
};

// Greeting templates based on mood/relationship
const GREETING_TEMPLATES = {
  warm: [
    "{name}! How wonderful to see you!",
    "Ah, {name}! Just who I was hoping to run into.",
    "Good {timeOfDay}, dear {name}!",
    "{name}, my friend! How goes your day?"
  ],
  neutral: [
    "Hello, {name}.",
    "Good {timeOfDay}, {name}.",
    "{name}. Nice day, isn't it?",
    "Greetings, {name}."
  ],
  cold: [
    "{name}.",
    "*nods at {name}*",
    "...{name}.",
    "*brief acknowledgment*"
  ],
  cheerful: [
    "Oh! {name}! *waves enthusiastically*",
    "{name}! You're looking well today!",
    "What a pleasant surprise, {name}!",
    "*beams* {name}! Hello!"
  ]
};

// Conversation starters based on personality
const CONVERSATION_STARTERS = {
  curious: [
    "Have you heard anything interesting lately?",
    "I've been wondering about something...",
    "Tell me, what do you think about {topic}?",
    "Did you notice anything unusual today?"
  ],
  scholarly: [
    "I've been reading about {topic}...",
    "There's a fascinating theory about {topic}.",
    "Have you ever considered the nature of {topic}?",
    "The ancient texts mention something about {topic}..."
  ],
  cheerful: [
    "Isn't today just lovely?",
    "I had the most wonderful {topic} today!",
    "You won't believe what happened!",
    "I'm so glad we bumped into each other!"
  ],
  melancholic: [
    "*sighs* Do you ever think about {topic}?",
    "Things haven't been the same since...",
    "I miss how things used to be.",
    "Do you find {topic} as troubling as I do?"
  ],
  extroverted: [
    "Come, let me tell you about {topic}!",
    "Gather 'round, I have news!",
    "You simply must hear this story about {topic}!",
    "I was just telling someone else about {topic}..."
  ],
  introverted: [
    "*quietly* I noticed something about {topic}...",
    "If you have a moment... about {topic}...",
    "*hesitates* I've been thinking...",
    "You know, {topic} is quite interesting, actually."
  ]
};

// Trade offers based on role
const TRADE_ITEMS = {
  herbalist: ['healing herbs', 'dried flowers', 'herb bundle', 'remedy potion'],
  blacksmith: ['iron nails', 'small tool', 'metal charm', 'repaired item'],
  baker: ['fresh bread', 'pastry', 'biscuits', 'cake slice'],
  messenger: ['interesting map', 'letter', 'news scroll', 'curiosity from afar'],
  'tavern keeper': ['ale sample', 'snack', 'tavern token', 'house special'],
  scholar: ['old book', 'research notes', 'quill', 'interesting fact'],
  farmer: ['vegetables', 'eggs', 'grain sack', 'fresh produce']
};

// Help actions based on role
const HELP_ACTIONS = {
  herbalist: ['offers herbal advice', 'shares a healing remedy', 'identifies a plant'],
  blacksmith: ['offers to repair something', 'shares metalworking tips', 'strengthens a tool'],
  baker: ['shares leftover bread', 'teaches a recipe', 'offers baking advice'],
  messenger: ['delivers a message', 'shares directions', 'provides news'],
  'tavern keeper': ['offers a drink on the house', 'shares local gossip', 'provides lodging info'],
  scholar: ['shares knowledge', 'helps with reading', 'offers wise counsel'],
  farmer: ['helps carry something', 'shares farming wisdom', 'offers fresh produce']
};

/**
 * InteractionManager - Handles all villager-to-villager interactions
 */
export class InteractionManager {
  constructor(transactionManager = null) {
    // Track cooldowns: Map<"v1-v2" => timestamp>
    this.cooldowns = new Map();
    
    // Pending interactions queue for database
    this.pendingLogs = [];
    
    // Interaction statistics
    this.stats = {
      total: 0,
      byType: {}
    };

    // Transaction manager for economic trades
    this.transactionManager = transactionManager || createTransactionManager();
  }

  /**
   * Find all villagers within interaction range of a given villager
   * @param {Villager} villager - The source villager
   * @param {Villager[]} allVillagers - All villagers in the simulation
   * @returns {Villager[]} Nearby villagers within range
   */
  findNearbyVillagers(villager, allVillagers) {
    return allVillagers.filter(other => 
      other.id !== villager.id &&
      other.activity !== 'sleeping' &&
      this.getDistance(villager, other) <= INTERACTION_RANGE
    );
  }

  /**
   * Calculate Manhattan distance between two villagers
   */
  getDistance(v1, v2) {
    return Math.abs(v1.x - v2.x) + Math.abs(v1.y - v2.y);
  }

  /**
   * Check if two villagers can interact (cooldown check)
   */
  canInteract(v1, v2, currentTick) {
    const key = this.getCooldownKey(v1.id, v2.id);
    const lastInteraction = this.cooldowns.get(key);
    
    if (!lastInteraction) return true;
    return (currentTick - lastInteraction) >= INTERACTION_COOLDOWN;
  }

  /**
   * Get consistent cooldown key for two villagers
   */
  getCooldownKey(id1, id2) {
    return [id1, id2].sort().join('-');
  }

  /**
   * Set cooldown after interaction
   */
  setCooldown(v1Id, v2Id, currentTick) {
    const key = this.getCooldownKey(v1Id, v2Id);
    this.cooldowns.set(key, currentTick);
  }

  /**
   * Calculate probability that a villager initiates an interaction
   * Based on personality traits and current state
   */
  calculateInitiationProbability(villager, activity) {
    let probability = 0.05; // Base 5% chance per tick when nearby
    
    // Personality modifiers
    if (villager.hasTrait('extroverted')) probability += 0.15;
    if (villager.hasTrait('introverted')) probability -= 0.03;
    if (villager.hasTrait('cheerful')) probability += 0.05;
    if (villager.hasTrait('melancholic')) probability -= 0.02;
    if (villager.hasTrait('curious')) probability += 0.05;
    if (villager.hasTrait('cautious')) probability -= 0.02;
    
    // Activity modifiers
    if (activity === 'socializing') probability += 0.20;
    if (activity === 'working') probability -= 0.05;
    if (activity === 'resting') probability -= 0.03;
    
    // Needs modifiers
    if (villager.social < 30) {
      probability += villager.hasTrait('extroverted') ? 0.15 : 0.05;
    }
    if (villager.mood > 70) probability += 0.05;
    if (villager.mood < 30) probability -= 0.05;
    if (villager.energy < 20) probability -= 0.10;
    
    return Math.max(0, Math.min(0.5, probability)); // Clamp 0-50%
  }

  /**
   * Determine the type of interaction based on context
   */
  determineInteractionType(initiator, target) {
    const relationship = initiator.relationships.get(target.id) || 50;
    const lastMet = initiator.memory.recentEvents.find(
      e => e.type === 'interaction' && e.with === target.id
    );
    
    // First meeting today = greeting
    if (!lastMet) {
      return INTERACTION_TYPE.GREETING;
    }
    
    // Roll for interaction type
    const roll = Math.random();
    
    // High relationship = more likely to help or have deep conversation
    if (relationship > 70) {
      if (roll < 0.15) return INTERACTION_TYPE.HELP;
      if (roll < 0.35) return INTERACTION_TYPE.TRADE;
      return INTERACTION_TYPE.CONVERSATION;
    }
    
    // Medium relationship
    if (relationship > 40) {
      if (roll < 0.1) return INTERACTION_TYPE.TRADE;
      if (roll < 0.3) return INTERACTION_TYPE.GOSSIP;
      return INTERACTION_TYPE.CONVERSATION;
    }
    
    // Low relationship = might argue
    if (roll < 0.1 && relationship < 30) {
      return INTERACTION_TYPE.ARGUMENT;
    }
    
    return INTERACTION_TYPE.CONVERSATION;
  }

  /**
   * Generate interaction content/dialogue
   */
  generateInteractionContent(type, initiator, target, timeOfDay) {
    switch (type) {
      case INTERACTION_TYPE.GREETING:
        return this.generateGreeting(initiator, target, timeOfDay);
      
      case INTERACTION_TYPE.CONVERSATION:
        return this.generateConversation(initiator, target);
      
      case INTERACTION_TYPE.TRADE:
        return this.generateTrade(initiator, target);
      
      case INTERACTION_TYPE.HELP:
        return this.generateHelp(initiator, target);
      
      case INTERACTION_TYPE.GOSSIP:
        return this.generateGossip(initiator, target);
      
      case INTERACTION_TYPE.ARGUMENT:
        return this.generateArgument(initiator, target);
      
      default:
        return { dialogue: '*exchanges a glance*', sentiment: 0 };
    }
  }

  /**
   * Generate a greeting based on relationship and personality
   */
  generateGreeting(initiator, target, timeOfDay) {
    const relationship = initiator.relationships.get(target.id) || 50;
    
    let templateType;
    if (initiator.hasTrait('cheerful')) {
      templateType = 'cheerful';
    } else if (relationship > 70) {
      templateType = 'warm';
    } else if (relationship < 30) {
      templateType = 'cold';
    } else {
      templateType = 'neutral';
    }
    
    const templates = GREETING_TEMPLATES[templateType];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const dialogue = template
      .replace('{name}', target.name.split(' ')[0])
      .replace('{timeOfDay}', timeOfDay);
    
    // Sentiment based on relationship
    const sentiment = (relationship - 50) / 50; // -1 to 1
    
    return { dialogue, sentiment: Math.max(-1, Math.min(1, sentiment)) };
  }

  /**
   * Generate a conversation exchange
   */
  generateConversation(initiator, target) {
    // Pick a starter based on personality
    let starterType = 'neutral';
    if (initiator.hasTrait('curious')) starterType = 'curious';
    else if (initiator.hasTrait('scholarly')) starterType = 'scholarly';
    else if (initiator.hasTrait('cheerful')) starterType = 'cheerful';
    else if (initiator.hasTrait('melancholic')) starterType = 'melancholic';
    else if (initiator.hasTrait('extroverted')) starterType = 'extroverted';
    else if (initiator.hasTrait('introverted')) starterType = 'introverted';
    
    const starters = CONVERSATION_STARTERS[starterType] || CONVERSATION_STARTERS['curious'];
    const starter = starters[Math.floor(Math.random() * starters.length)];
    
    // Pick topic based on roles
    const initiatorTopics = CONVERSATION_TOPICS[initiator.role] || ['life', 'the village'];
    const targetTopics = CONVERSATION_TOPICS[target.role] || ['life', 'the village'];
    const allTopics = [...initiatorTopics, ...targetTopics];
    const topic = allTopics[Math.floor(Math.random() * allTopics.length)];
    
    const dialogue = starter.replace('{topic}', topic);
    
    // Sentiment from mood average
    const avgMood = (initiator.mood + target.mood) / 2;
    const sentiment = (avgMood - 50) / 50;
    
    return { 
      dialogue, 
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      topic 
    };
  }

  /**
   * Generate a trade interaction with actual economic exchange
   */
  generateTrade(initiator, target) {
    const relationship = initiator.relationships.get(target.id) || 50;
    const isFriendly = relationship > 60;
    
    // Get a tradeable item from initiator's actual inventory
    const tradeOffer = initiator.getTradeableItem?.();
    
    if (!tradeOffer) {
      // No items to trade, fallback to dialogue only
      return {
        dialogue: `"I was hoping to trade, but I don't have anything on me right now."`,
        sentiment: 0,
        tradeDetails: { item: null, price: 0, accepted: false, reason: 'no_stock' }
      };
    }
    
    const item = tradeOffer.item;
    const basePrice = tradeOffer.price;
    
    // Calculate price based on relationship
    const price = this.transactionManager.calculatePrice(basePrice, relationship, false);
    
    // Check if target can afford and would accept
    const canAfford = target.canAfford?.(price) ?? true;
    const willAccept = target.wouldAcceptTrade?.({ item, price }, initiator) ?? (Math.random() > 0.4);
    const accepted = canAfford && willAccept;
    
    let dialogue;
    let transactionResult = null;
    
    if (isFriendly) {
      dialogue = `"I have some ${item} - would you like some? Just ${price} coins, friend price."`;
    } else {
      dialogue = `"Looking for ${item}? I can offer you some for ${price} coins."`;
    }
    
    if (accepted) {
      // Execute the actual transaction
      transactionResult = this.transactionManager.executePurchase(
        target, // buyer
        initiator, // seller  
        item,
        1, // quantity
        price
      );
      
      if (transactionResult.success) {
        dialogue += ` ${target.name.split(' ')[0]} hands over ${price} coins and receives the ${item}.`;
        
        // Record trade cooldown
        initiator.recordTrade?.(target.id, Date.now());
        target.recordTrade?.(initiator.id, Date.now());
      } else {
        // Transaction failed despite checks (edge case)
        dialogue += ` *${target.name.split(' ')[0]} checks their purse* "Maybe another time."`;
      }
    } else if (!canAfford) {
      dialogue += ` *${target.name.split(' ')[0]} checks their purse* "I can't afford that right now."`;
    } else {
      dialogue += ` ${target.name.split(' ')[0]} politely declines.`;
    }
    
    return {
      dialogue,
      sentiment: accepted ? 0.4 : (isFriendly ? 0.1 : 0),
      tradeDetails: { 
        item, 
        price, 
        accepted: transactionResult?.success ?? false,
        reason: !canAfford ? 'cannot_afford' : (!willAccept ? 'declined' : 'completed'),
        transaction: transactionResult
      }
    };
  }

  /**
   * Generate a help interaction (may include gifting items)
   */
  generateHelp(initiator, target) {
    const actions = HELP_ACTIONS[initiator.role] || ['offers assistance'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    let dialogue = `${initiator.name.split(' ')[0]} ${action} for ${target.name.split(' ')[0]}.`;
    let giftResult = null;
    
    // 30% chance to include a small gift if action implies giving something
    const givingActions = ['shares', 'offers', 'gives', 'provides'];
    const isGivingAction = givingActions.some(g => action.toLowerCase().includes(g));
    
    if (isGivingAction && Math.random() < 0.3) {
      // Try to give a small item
      const tradeOffer = initiator.getTradeableItem?.();
      if (tradeOffer && initiator.hasItem?.(tradeOffer.item, 1)) {
        giftResult = this.transactionManager.executeGift(
          initiator,
          target,
          tradeOffer.item,
          1,
          0
        );
        
        if (giftResult?.success) {
          dialogue += ` They give ${target.name.split(' ')[0]} a ${tradeOffer.item} as a gift.`;
        }
      }
    }
    
    return {
      dialogue,
      sentiment: 0.5, // Helping is always positive
      helpAction: action,
      giftResult
    };
  }

  /**
   * Generate gossip
   */
  generateGossip(initiator, target) {
    const gossipSubjects = [
      'the weather lately',
      'strange sounds at night',
      'a visitor to the village',
      'someone\'s mysterious behavior',
      'rumors from the market'
    ];
    
    const subject = gossipSubjects[Math.floor(Math.random() * gossipSubjects.length)];
    
    const intros = [
      '"Have you heard about',
      '"Between us, I noticed',
      '"Don\'t tell anyone, but',
      '"Word around the village is'
    ];
    
    const intro = intros[Math.floor(Math.random() * intros.length)];
    const dialogue = `${intro} ${subject}..."`;
    
    return {
      dialogue,
      sentiment: 0.2, // Gossip is mildly positive (bonding)
      gossipSubject: subject
    };
  }

  /**
   * Generate an argument
   */
  generateArgument(initiator, target) {
    const issues = [
      'the boundary between their properties',
      'a past slight',
      'differing opinions',
      'borrowed items never returned',
      'noise complaints'
    ];
    
    const issue = issues[Math.floor(Math.random() * issues.length)];
    
    const dialogue = `A tense exchange about ${issue} between ${initiator.name.split(' ')[0]} and ${target.name.split(' ')[0]}.`;
    
    return {
      dialogue,
      sentiment: -0.5,
      issue
    };
  }

  /**
   * Calculate relationship change from interaction
   */
  calculateRelationshipChange(type, initiator, target) {
    let baseChange = 0;
    
    switch (type) {
      case INTERACTION_TYPE.GREETING:
        baseChange = 1;
        break;
      case INTERACTION_TYPE.CONVERSATION:
        baseChange = 2;
        break;
      case INTERACTION_TYPE.TRADE:
        baseChange = 3;
        break;
      case INTERACTION_TYPE.HELP:
        baseChange = 5;
        break;
      case INTERACTION_TYPE.GOSSIP:
        baseChange = 2;
        break;
      case INTERACTION_TYPE.ARGUMENT:
        baseChange = -5;
        break;
    }
    
    // Personality modifiers
    if (initiator.hasTrait('cheerful') || target.hasTrait('cheerful')) {
      baseChange += 1;
    }
    if (initiator.hasTrait('melancholic') || target.hasTrait('melancholic')) {
      baseChange -= 0.5;
    }
    
    // Add some randomness
    const variance = (Math.random() * 4) - 2;
    
    return baseChange + variance;
  }

  /**
   * Execute a full interaction between two villagers
   * Returns interaction data ready for database logging
   */
  executeInteraction(initiator, target, currentTick, timeOfDay = 'day') {
    const type = this.determineInteractionType(initiator, target);
    const content = this.generateInteractionContent(type, initiator, target, timeOfDay);
    const relationshipChange = this.calculateRelationshipChange(type, initiator, target);
    
    // Update relationships
    const currentRel1 = initiator.relationships.get(target.id) || 50;
    const currentRel2 = target.relationships.get(initiator.id) || 50;
    
    initiator.relationships.set(target.id, 
      Math.max(0, Math.min(100, currentRel1 + relationshipChange)));
    target.relationships.set(initiator.id, 
      Math.max(0, Math.min(100, currentRel2 + relationshipChange * 0.8)));
    
    // Update social needs
    const socialGain = type === INTERACTION_TYPE.ARGUMENT ? -5 : 5;
    if (initiator.hasTrait('extroverted')) {
      initiator.social = Math.min(100, initiator.social + socialGain * 1.5);
    } else if (initiator.hasTrait('introverted')) {
      initiator.social = Math.min(100, initiator.social + socialGain * 0.5);
    } else {
      initiator.social = Math.min(100, initiator.social + socialGain);
    }
    
    // Set cooldown
    this.setCooldown(initiator.id, target.id, currentTick);
    
    // Update stats
    this.stats.total++;
    this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
    
    // Build interaction record for database
    const interactionRecord = {
      villager1_id: initiator.id,
      villager1_name: initiator.name,
      villager2_id: target.id,
      villager2_name: target.name,
      type: type,
      content: content.dialogue,
      location_x: initiator.x,
      location_y: initiator.y,
      sentiment: content.sentiment,
      metadata: {
        initiatorMood: initiator.mood,
        targetMood: target.mood,
        relationshipBefore: currentRel1,
        relationshipAfter: initiator.relationships.get(target.id),
        relationshipChange: relationshipChange,
        ...content
      },
      timestamp: Date.now()
    };
    
    // Add to pending logs
    this.pendingLogs.push(interactionRecord);
    
    // Update villager memories
    initiator.lastInteraction = {
      with: target.id,
      type: type,
      timestamp: Date.now()
    };
    
    initiator.memory.recentEvents.push({
      type: 'interaction',
      interactionType: type,
      with: target.id,
      mood: initiator.mood,
      sentiment: content.sentiment
    });
    
    if (initiator.memory.recentEvents.length > 20) {
      initiator.memory.recentEvents.shift();
    }
    
    return interactionRecord;
  }

  /**
   * Get and clear pending interaction logs (for database sync)
   */
  flushPendingLogs() {
    const logs = [...this.pendingLogs];
    this.pendingLogs = [];
    return logs;
  }

  /**
   * Process all potential interactions for a tick
   * Called by SimulationEngine each tick
   */
  processTick(villagers, currentTick, timeOfDay = 'day') {
    const interactions = [];
    const processed = new Set(); // Avoid double-processing pairs
    
    for (const villager of villagers) {
      // Skip sleeping villagers
      if (villager.activity === 'sleeping') continue;
      
      // Find nearby villagers
      const nearby = this.findNearbyVillagers(villager, villagers);
      
      for (const other of nearby) {
        const pairKey = this.getCooldownKey(villager.id, other.id);
        
        // Skip if already processed this pair this tick
        if (processed.has(pairKey)) continue;
        
        // Skip if on cooldown
        if (!this.canInteract(villager, other, currentTick)) continue;
        
        // Calculate initiation probability
        const prob = this.calculateInitiationProbability(villager, villager.activity);
        
        // Roll for interaction
        if (Math.random() < prob) {
          const interaction = this.executeInteraction(
            villager, other, currentTick, timeOfDay
          );
          interactions.push(interaction);
          processed.add(pairKey);
        }
      }
    }
    
    return interactions;
  }

  /**
   * Get interaction statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Clear old cooldowns (memory management)
   */
  clearOldCooldowns(currentTick, maxAge = INTERACTION_COOLDOWN * 5) {
    for (const [key, tick] of this.cooldowns) {
      if (currentTick - tick > maxAge) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Get pending transaction logs for database sync
   * @returns {Array} Pending transactions
   */
  flushTransactionLogs() {
    return this.transactionManager.flushPendingLogs();
  }

  /**
   * Get transaction statistics
   * @returns {Object} Stats
   */
  getTransactionStats() {
    return this.transactionManager.getStats();
  }

  /**
   * Get the transaction manager instance
   * @returns {TransactionManager}
   */
  getTransactionManager() {
    return this.transactionManager;
  }

  /**
   * Add daily income for a villager
   * @param {Villager} villager - The villager
   * @returns {Object} Income result
   */
  addDailyIncome(villager) {
    return this.transactionManager.addDailyIncome(villager);
  }

  /**
   * Restock a villager's inventory based on role
   * @param {Villager} villager - The villager to restock
   */
  restockInventory(villager) {
    this.transactionManager.restockInventory(villager);
  }
}

/**
 * Factory function for creating an InteractionManager
 * @param {TransactionManager} [transactionManager] - Optional transaction manager
 */
export function createInteractionManager(transactionManager = null) {
  return new InteractionManager(transactionManager);
}

export default InteractionManager;
