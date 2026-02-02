/**
 * Thought & Memory System
 * Generates personality-driven internal monologue and tracks memories of interactions
 */

import { ACTIVITY, TRAITS } from './villager.js';
import { INTERACTION_TYPE } from './interactions.js';

// Thought types matching database schema
export const THOUGHT_TYPE = {
  REFLECTION: 'reflection',   // Thinking about self/life
  PLAN: 'plan',               // Future intentions
  OBSERVATION: 'observation', // Noticing things in the world
  MEMORY: 'memory',           // Recalling past events
  DESIRE: 'desire'            // Wants and needs
};

// Thought templates by personality trait
const THOUGHT_TEMPLATES = {
  // Extroverted thoughts
  extroverted: {
    reflection: [
      "I wonder who else is out and about today...",
      "The village feels so alive when everyone's together.",
      "I should organize a gathering soon!",
      "Being alone too long makes me restless."
    ],
    desire: [
      "I really want to catch up with {villager}.",
      "A lively conversation would lift my spirits.",
      "I hope I run into someone interesting today.",
      "Perhaps the tavern has some good company."
    ],
    observation: [
      "Everyone seems so busy today!",
      "{villager} looks like they could use some company.",
      "The village square is surprisingly quiet...",
      "I notice more people heading toward the market."
    ]
  },
  
  // Introverted thoughts
  introverted: {
    reflection: [
      "Some quiet time would be nice right now.",
      "I've been around people a lot lately... I need space.",
      "My own company is perfectly fine.",
      "There's peace in solitude."
    ],
    desire: [
      "I hope I can find a quiet spot to think.",
      "Maybe I'll just stay in today.",
      "A good book sounds better than conversation.",
      "I need to recharge."
    ],
    observation: [
      "It's getting crowded here... better find somewhere else.",
      "Everyone seems so loud today.",
      "{villager} seems to understand the value of quiet.",
      "The forest path looks peaceful."
    ]
  },
  
  // Hardworking thoughts
  hardworking: {
    reflection: [
      "There's always more work to be done.",
      "Idle hands serve no purpose.",
      "I take pride in what I accomplish.",
      "Every task completed is a small victory."
    ],
    plan: [
      "I should finish the {task} before midday.",
      "Tomorrow I need to start on the new project.",
      "If I work through lunch, I can get ahead.",
      "The workshop needs organizing."
    ],
    observation: [
      "Some people don't seem to understand the value of work.",
      "{villager} is as industrious as ever.",
      "There's so much that needs doing around here.",
      "The morning light is perfect for starting early."
    ]
  },
  
  // Lazy thoughts
  lazy: {
    reflection: [
      "Why rush? There's always tomorrow.",
      "Rest is underrated, truly.",
      "I deserve a break after... existing.",
      "Working too hard is bad for the soul."
    ],
    desire: [
      "I could really go for a nap right now.",
      "Maybe I'll just watch the clouds for a while.",
      "Someone else can handle that task.",
      "The hammock is calling my name."
    ],
    plan: [
      "I'll think about work... later.",
      "Perhaps I'll start that task... eventually.",
      "Tomorrow seems like a better day for effort.",
      "Planning is basically work, right? I should rest."
    ]
  },
  
  // Curious thoughts
  curious: {
    reflection: [
      "I wonder what's beyond the next hill...",
      "There's so much I don't know yet!",
      "Every person has a story worth hearing.",
      "Questions lead to the best discoveries."
    ],
    observation: [
      "That's strange... I've never noticed that before.",
      "{villager} seems to know something interesting.",
      "What's happening over there?",
      "I should investigate that peculiar sound."
    ],
    desire: [
      "I want to learn something new today.",
      "Maybe {villager} can teach me about their craft.",
      "The library must have books I haven't read.",
      "Adventure awaits somewhere!"
    ]
  },
  
  // Cautious thoughts
  cautious: {
    reflection: [
      "Better safe than sorry, always.",
      "One can never be too careful.",
      "I should think this through properly.",
      "Rushing leads to mistakes."
    ],
    observation: [
      "Something feels different today...",
      "{villager} is acting strangely.",
      "I should stay alert.",
      "That path doesn't look safe."
    ],
    plan: [
      "I need to prepare for any possibilities.",
      "Best to have a backup plan.",
      "I'll wait and see how things develop.",
      "Caution has kept me safe thus far."
    ]
  },
  
  // Cheerful thoughts
  cheerful: {
    reflection: [
      "What a wonderful day to be alive!",
      "Life is full of small joys.",
      "I'm grateful for this village.",
      "Happiness is a choice, and I choose it!"
    ],
    observation: [
      "{villager} has such a nice smile today!",
      "The flowers are particularly beautiful.",
      "Everyone seems to be in good spirits!",
      "The sun makes everything better."
    ],
    desire: [
      "I want to spread some cheer today!",
      "Maybe I can make someone smile.",
      "A song might brighten the mood!",
      "Sharing joy makes it grow."
    ]
  },
  
  // Melancholic thoughts
  melancholic: {
    reflection: [
      "Things used to be different...",
      "There's a weight to existence sometimes.",
      "I feel the passage of time so keenly.",
      "Memories can be both comfort and sorrow."
    ],
    observation: [
      "Even {villager} seems troubled today.",
      "The village has changed so much.",
      "Autumn always makes me thoughtful.",
      "There's beauty in sadness too."
    ],
    memory: [
      "I remember when things were simpler...",
      "That conversation with {villager} stays with me.",
      "Some moments never fade.",
      "The past echoes in everything I see."
    ]
  },
  
  // Devout thoughts
  devout: {
    reflection: [
      "There is meaning in all things.",
      "Faith guides my steps.",
      "I am grateful for this day.",
      "The divine is present everywhere."
    ],
    plan: [
      "I must remember my morning prayers.",
      "The temple needs visiting soon.",
      "Perhaps I can help those in need today.",
      "Service to others is service to the divine."
    ],
    observation: [
      "{villager} could use some spiritual guidance.",
      "The chapel bell sounds especially clear today.",
      "Nature reveals so much wisdom.",
      "There are signs everywhere, if you look."
    ]
  },
  
  // Scholarly thoughts
  scholarly: {
    reflection: [
      "Knowledge is the greatest treasure.",
      "There's always more to learn.",
      "Books are the best companions.",
      "Understanding requires patience and study."
    ],
    observation: [
      "Interesting... that contradicts what I read.",
      "{villager}'s methods are fascinating to study.",
      "I should document this observation.",
      "The natural world follows such precise patterns."
    ],
    desire: [
      "I need to finish that treatise.",
      "The library has new acquisitions, I hope.",
      "Perhaps I can find a rare manuscript.",
      "A quiet study session would be perfect."
    ]
  },
  
  // Adventurous thoughts
  adventurous: {
    reflection: [
      "The horizon always calls to me.",
      "Comfort is the enemy of growth.",
      "Every day should bring something new!",
      "Life is too short for staying in one place."
    ],
    desire: [
      "I want to explore beyond the village today.",
      "What lies down that unexplored path?",
      "Maybe I'll discover something incredible!",
      "Adventure awaits those who seek it."
    ],
    plan: [
      "I should plan an expedition soon.",
      "The old ruins might be worth revisiting.",
      "Tomorrow, I venture somewhere new.",
      "I need to pack for a journey."
    ]
  },
  
  // Homebody thoughts
  homebody: {
    reflection: [
      "There's no place like home.",
      "Everything I need is right here.",
      "Why wander when I have this?",
      "Familiarity is its own comfort."
    ],
    desire: [
      "I just want to get back home.",
      "My own bed sounds wonderful right now.",
      "Maybe I'll stay in tomorrow.",
      "Home cooking beats everything else."
    ],
    observation: [
      "{villager} travels so much... exhausting.",
      "My corner of the village is perfect.",
      "The same view never gets old.",
      "Change isn't always necessary."
    ]
  }
};

// Activity-based thoughts (any personality)
const ACTIVITY_THOUGHTS = {
  [ACTIVITY.SLEEPING]: [
    "*dreams of {dream}*",
    "*mumbles in sleep*",
    "*peaceful slumber*"
  ],
  [ACTIVITY.WAKING]: [
    "Another day begins...",
    "*yawns* Time to start the day.",
    "What will today bring?",
    "The morning light creeps in."
  ],
  [ACTIVITY.WORKING]: [
    "Focus on the task at hand.",
    "This work matters.",
    "Almost done with this part...",
    "Steady hands, steady progress."
  ],
  [ACTIVITY.EATING]: [
    "This bread is quite good today.",
    "I should eat more slowly.",
    "Food nourishes the spirit too.",
    "A meal shared is better, but this will do."
  ],
  [ACTIVITY.SOCIALIZING]: [
    "Good company makes time fly.",
    "I should share that story...",
    "Conversations are the heart of community.",
    "What a pleasant exchange."
  ],
  [ACTIVITY.WANDERING]: [
    "Where shall my feet take me?",
    "No destination, just the journey.",
    "The village has many corners to explore.",
    "Walking clears the mind."
  ],
  [ACTIVITY.TRAVELING]: [
    "Must keep moving.",
    "Almost there...",
    "The path stretches on.",
    "One step at a time."
  ],
  [ACTIVITY.RESTING]: [
    "Rest is well-earned.",
    "A moment of peace.",
    "My body thanks me.",
    "Sometimes stopping is the right choice."
  ],
  [ACTIVITY.PRAYING]: [
    "May guidance come.",
    "In stillness, clarity.",
    "Gratitude fills my heart.",
    "The divine listens."
  ],
  [ACTIVITY.SHOPPING]: [
    "Do I really need this?",
    "The market has interesting things today.",
    "I should watch my coins.",
    "Quality over quantity."
  ]
};

// Mood-based thoughts
const MOOD_THOUGHTS = {
  high: [ // mood > 80
    "Life is wonderful!",
    "I feel so energized!",
    "Everything seems possible today.",
    "Joy bubbles up within me."
  ],
  good: [ // mood 60-80
    "Things are going well.",
    "No complaints today.",
    "I feel content.",
    "A good day overall."
  ],
  neutral: [ // mood 40-60
    "Just another day...",
    "Nothing remarkable, nothing terrible.",
    "I suppose this is fine.",
    "Time passes as it does."
  ],
  low: [ // mood 20-40
    "Something feels off...",
    "I could use a lift.",
    "Not my best day.",
    "I hope tomorrow is better."
  ],
  bad: [ // mood < 20
    "Everything feels heavy.",
    "Why does nothing go right?",
    "I need something to change.",
    "This weight won't lift."
  ]
};

// Dream subjects for sleeping
const DREAMS = [
  "distant lands",
  "old friends",
  "flying over the village",
  "a mysterious forest",
  "childhood memories",
  "tomorrow's work",
  "a feast",
  "strange symbols",
  "running through fields",
  "a familiar face"
];

// Time-of-day specific thoughts
const TIME_OF_DAY_THOUGHTS = {
  morning: [
    "The morning dew is beautiful today.",
    "A fresh start to the day.",
    "The sun rises with new possibilities.",
    "I should make the most of these early hours.",
    "The village is waking up around me."
  ],
  afternoon: [
    "The day is half spent already.",
    "The afternoon warmth is pleasant.",
    "Time moves steadily onward.",
    "Perhaps a brief rest is in order.",
    "The busiest part of the day."
  ],
  evening: [
    "The day's work is nearly done.",
    "Evening light paints everything golden.",
    "Time to wind down.",
    "The tavern will be lively tonight.",
    "A peaceful end to the day approaches."
  ],
  night: [
    "The stars are out tonight.",
    "The village grows quiet.",
    "Night brings its own kind of peace.",
    "Soon it will be time to rest.",
    "The darkness holds many secrets."
  ]
};

// Relationship level descriptors
export const RELATIONSHIP_LEVEL = {
  BEST_FRIEND: 'best_friend',   // affinity >= 90
  FRIEND: 'friend',             // affinity >= 70
  ACQUAINTANCE: 'acquaintance', // affinity >= 50
  NEUTRAL: 'neutral',           // affinity >= 30
  DISLIKE: 'dislike',           // affinity >= 15
  ENEMY: 'enemy'                // affinity < 15
};

/**
 * Get relationship level from affinity value
 */
export function getRelationshipLevel(affinity) {
  if (affinity >= 90) return RELATIONSHIP_LEVEL.BEST_FRIEND;
  if (affinity >= 70) return RELATIONSHIP_LEVEL.FRIEND;
  if (affinity >= 50) return RELATIONSHIP_LEVEL.ACQUAINTANCE;
  if (affinity >= 30) return RELATIONSHIP_LEVEL.NEUTRAL;
  if (affinity >= 15) return RELATIONSHIP_LEVEL.DISLIKE;
  return RELATIONSHIP_LEVEL.ENEMY;
}

/**
 * ThoughtSystem - Generates personality-driven internal monologue
 */
export class ThoughtSystem {
  constructor() {
    // Track last thought per villager to avoid repetition
    this.lastThoughts = new Map(); // villagerId -> { content, timestamp, type }
    
    // Pending thoughts for database
    this.pendingThoughts = [];
    
    // Minimum time between significant thoughts (in ticks)
    this.thoughtCooldown = 60; // ~1 minute
  }

  /**
   * Generate a thought for a villager based on their state
   * @param {Villager} villager - The thinking villager
   * @param {Object} context - Additional context (nearby villagers, recent events, etc.)
   * @returns {Object|null} Thought object or null if no thought generated
   */
  generateThought(villager, context = {}) {
    const { 
      nearbyVillagers = [],
      recentInteractions = [],
      currentTick = 0,
      timeOfDay = 12
    } = context;

    // Check cooldown
    const lastThought = this.lastThoughts.get(villager.id);
    if (lastThought && (currentTick - lastThought.tick) < this.thoughtCooldown) {
      // Not enough time has passed, but allow quick observations
      if (Math.random() > 0.1) return null;
    }

    // Determine thought type based on context
    const thoughtType = this.determineThoughtType(villager, context);
    
    // Generate thought content
    const thought = this.generateThoughtContent(villager, thoughtType, context);
    
    if (!thought) return null;

    // Track this thought
    this.lastThoughts.set(villager.id, {
      content: thought.content,
      type: thoughtType,
      tick: currentTick
    });

    // Determine importance (1-10)
    const importance = this.calculateImportance(villager, thoughtType, thought);

    // Build thought record for database
    const thoughtRecord = {
      villager_id: villager.id,
      villager_name: villager.name,
      content: thought.content,
      thought_type: thoughtType,
      importance: importance,
      related_villager_id: thought.relatedVillagerId || null,
      metadata: {
        activity: villager.activity,
        mood: villager.mood,
        traits: villager.traits,
        location: { x: villager.x, y: villager.y }
      },
      created_at: Date.now()
    };

    this.pendingThoughts.push(thoughtRecord);

    return thoughtRecord;
  }

  /**
   * Determine what type of thought to generate
   */
  determineThoughtType(villager, context) {
    const { nearbyVillagers = [], recentInteractions = [] } = context;
    
    // Recent interaction? Memory thought
    if (recentInteractions.length > 0 && Math.random() < 0.3) {
      return THOUGHT_TYPE.MEMORY;
    }

    // Nearby villagers? Observation
    if (nearbyVillagers.length > 0 && Math.random() < 0.4) {
      return THOUGHT_TYPE.OBSERVATION;
    }

    // Low needs? Desire
    if ((villager.hunger > 70 || villager.energy < 30 || villager.social < 30) && Math.random() < 0.5) {
      return THOUGHT_TYPE.DESIRE;
    }

    // Working or busy? Plan
    if ([ACTIVITY.WORKING, ACTIVITY.TRAVELING].includes(villager.activity) && Math.random() < 0.3) {
      return THOUGHT_TYPE.PLAN;
    }

    // Default: reflection
    return THOUGHT_TYPE.REFLECTION;
  }

  /**
   * Generate thought content based on type and personality
   */
  generateThoughtContent(villager, thoughtType, context) {
    const { nearbyVillagers = [], recentInteractions = [], timeOfDay = 12 } = context;
    
    let content = null;
    let relatedVillagerId = null;

    // First, try personality-based thoughts
    const trait = this.getDominantTrait(villager);
    if (trait && THOUGHT_TEMPLATES[trait] && THOUGHT_TEMPLATES[trait][thoughtType]) {
      const templates = THOUGHT_TEMPLATES[trait][thoughtType];
      content = templates[Math.floor(Math.random() * templates.length)];
    }

    // Try time-of-day thoughts (20% chance if no personality thought)
    if (!content && Math.random() < 0.2) {
      const period = this.getTimePeriod(timeOfDay);
      if (TIME_OF_DAY_THOUGHTS[period]) {
        const templates = TIME_OF_DAY_THOUGHTS[period];
        content = templates[Math.floor(Math.random() * templates.length)];
      }
    }

    // Fall back to activity-based thoughts
    if (!content && ACTIVITY_THOUGHTS[villager.activity]) {
      const templates = ACTIVITY_THOUGHTS[villager.activity];
      content = templates[Math.floor(Math.random() * templates.length)];
    }

    // Fall back to mood-based thoughts
    if (!content) {
      const moodCategory = this.getMoodCategory(villager.mood);
      const templates = MOOD_THOUGHTS[moodCategory];
      content = templates[Math.floor(Math.random() * templates.length)];
    }

    // Replace placeholders
    if (content) {
      // {villager} placeholder - pick from nearby or memory
      if (content.includes('{villager}')) {
        let targetVillager = null;
        if (nearbyVillagers.length > 0) {
          targetVillager = nearbyVillagers[Math.floor(Math.random() * nearbyVillagers.length)];
        } else if (recentInteractions.length > 0) {
          const recentId = recentInteractions[0].villager2_id === villager.id 
            ? recentInteractions[0].villager1_id 
            : recentInteractions[0].villager2_id;
          targetVillager = { id: recentId, name: recentInteractions[0].villager2_name || 'someone' };
        }
        
        if (targetVillager) {
          content = content.replace('{villager}', targetVillager.name.split(' ')[0]);
          relatedVillagerId = targetVillager.id;
        } else {
          content = content.replace('{villager}', 'someone');
        }
      }

      // {task} placeholder
      if (content.includes('{task}')) {
        const tasks = ['repairs', 'order', 'project', 'delivery', 'chores'];
        content = content.replace('{task}', tasks[Math.floor(Math.random() * tasks.length)]);
      }

      // {dream} placeholder
      if (content.includes('{dream}')) {
        content = content.replace('{dream}', DREAMS[Math.floor(Math.random() * DREAMS.length)]);
      }
    }

    return content ? { content, relatedVillagerId } : null;
  }

  /**
   * Get the most relevant personality trait for thought generation
   */
  getDominantTrait(villager) {
    if (!villager.traits || villager.traits.length === 0) return null;
    
    // Weight certain traits based on current state
    const traitWeights = {};
    for (const trait of villager.traits) {
      traitWeights[trait] = 1;
    }

    // Increase weight based on context
    if (villager.social < 30 && villager.traits.includes(TRAITS.EXTROVERTED)) {
      traitWeights[TRAITS.EXTROVERTED] += 2;
    }
    if (villager.social > 80 && villager.traits.includes(TRAITS.INTROVERTED)) {
      traitWeights[TRAITS.INTROVERTED] += 2;
    }
    if (villager.activity === ACTIVITY.WORKING && villager.traits.includes(TRAITS.HARDWORKING)) {
      traitWeights[TRAITS.HARDWORKING] += 2;
    }
    if (villager.mood > 70 && villager.traits.includes(TRAITS.CHEERFUL)) {
      traitWeights[TRAITS.CHEERFUL] += 2;
    }
    if (villager.mood < 40 && villager.traits.includes(TRAITS.MELANCHOLIC)) {
      traitWeights[TRAITS.MELANCHOLIC] += 2;
    }

    // Find highest weighted trait
    let maxWeight = 0;
    let dominantTrait = villager.traits[0];
    for (const [trait, weight] of Object.entries(traitWeights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantTrait = trait;
      }
    }

    return dominantTrait;
  }

  /**
   * Get mood category string
   */
  getMoodCategory(mood) {
    if (mood > 80) return 'high';
    if (mood > 60) return 'good';
    if (mood > 40) return 'neutral';
    if (mood > 20) return 'low';
    return 'bad';
  }

  /**
   * Get time period from hour
   */
  getTimePeriod(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Get current thought bubble for UI display
   * Returns the most recent thought or generates a quick one
   * @param {Villager} villager - The villager
   * @param {Object} context - Context for generation
   * @returns {Object} Thought bubble data for frontend
   */
  getCurrentThoughtBubble(villager, context = {}) {
    const lastThought = this.lastThoughts.get(villager.id);
    
    // If we have a recent thought (within last 30 seconds / ~30 ticks), use it
    if (lastThought && context.currentTick && (context.currentTick - lastThought.tick) < 30) {
      return {
        villagerId: villager.id,
        villagerName: villager.name,
        content: lastThought.content,
        type: lastThought.type,
        isRecent: true
      };
    }

    // Generate a quick ambient thought for display
    const ambientThought = this.generateAmbientThought(villager, context);
    
    return {
      villagerId: villager.id,
      villagerName: villager.name,
      content: ambientThought,
      type: 'ambient',
      isRecent: false
    };
  }

  /**
   * Generate a quick ambient thought for UI (doesn't record to database)
   */
  generateAmbientThought(villager, context = {}) {
    const { timeOfDay = 12 } = context;
    
    // Simple activity-based thoughts for ambient display
    const ambientThoughts = {
      [ACTIVITY.SLEEPING]: '💤',
      [ACTIVITY.WAKING]: '*stretches*',
      [ACTIVITY.WORKING]: '*focused on work*',
      [ACTIVITY.EATING]: '*enjoying a meal*',
      [ACTIVITY.SOCIALIZING]: '*chatting*',
      [ACTIVITY.WANDERING]: '*taking a stroll*',
      [ACTIVITY.TRAVELING]: '*on the way*',
      [ACTIVITY.RESTING]: '*relaxing*',
      [ACTIVITY.PRAYING]: '*in contemplation*',
      [ACTIVITY.SHOPPING]: '*browsing*'
    };

    return ambientThoughts[villager.activity] || '*thinking...*';
  }

  /**
   * Get all current thought bubbles for all villagers (for UI)
   * @param {Villager[]} villagers - All villagers
   * @param {Object} context - Context for generation
   * @returns {Object} Map of villagerId -> thought bubble
   */
  getAllThoughtBubbles(villagers, context = {}) {
    const bubbles = {};
    for (const villager of villagers) {
      bubbles[villager.id] = this.getCurrentThoughtBubble(villager, context);
    }
    return bubbles;
  }

  /**
   * Calculate thought importance (1-10)
   */
  calculateImportance(villager, thoughtType, thought) {
    let importance = 5; // Base importance

    // Type-based modifiers
    if (thoughtType === THOUGHT_TYPE.MEMORY) importance += 2;
    if (thoughtType === THOUGHT_TYPE.PLAN) importance += 1;
    if (thoughtType === THOUGHT_TYPE.DESIRE && (villager.hunger > 80 || villager.energy < 20)) {
      importance += 2;
    }

    // Related to another villager increases importance
    if (thought.relatedVillagerId) importance += 1;

    // Extreme moods increase importance
    if (villager.mood > 85 || villager.mood < 20) importance += 1;

    return Math.min(10, Math.max(1, importance));
  }

  /**
   * Generate a thought about a recent interaction
   */
  generateInteractionThought(villager, interaction) {
    const { type, villager1_name, villager2_name, sentiment, content } = interaction;
    const otherName = villager1_name === villager.name 
      ? villager2_name.split(' ')[0] 
      : villager1_name.split(' ')[0];
    
    let thoughtContent;
    
    if (sentiment > 0.3) {
      const positiveTemplates = [
        `That was a nice exchange with ${otherName}.`,
        `${otherName} is good company.`,
        `I enjoyed talking with ${otherName}.`,
        `${otherName} always brightens my day.`
      ];
      thoughtContent = positiveTemplates[Math.floor(Math.random() * positiveTemplates.length)];
    } else if (sentiment < -0.3) {
      const negativeTemplates = [
        `That conversation with ${otherName} left me unsettled.`,
        `I'm not sure I agree with ${otherName}...`,
        `${otherName} and I don't see eye to eye.`,
        `I should probably avoid ${otherName} for a while.`
      ];
      thoughtContent = negativeTemplates[Math.floor(Math.random() * negativeTemplates.length)];
    } else {
      const neutralTemplates = [
        `I wonder what ${otherName} is really thinking.`,
        `${otherName} seemed distracted today.`,
        `Just a brief word with ${otherName}.`,
        `${otherName}... I'm still not sure about them.`
      ];
      thoughtContent = neutralTemplates[Math.floor(Math.random() * neutralTemplates.length)];
    }

    return {
      villager_id: villager.id,
      villager_name: villager.name,
      content: thoughtContent,
      thought_type: THOUGHT_TYPE.MEMORY,
      importance: Math.abs(sentiment) > 0.5 ? 7 : 5,
      related_villager_id: interaction.villager1_id === villager.id 
        ? interaction.villager2_id 
        : interaction.villager1_id,
      metadata: {
        interaction_type: type,
        sentiment: sentiment
      },
      created_at: Date.now()
    };
  }

  /**
   * Get and clear pending thoughts for database
   */
  flushPendingThoughts() {
    const thoughts = [...this.pendingThoughts];
    this.pendingThoughts = [];
    return thoughts;
  }

  /**
   * Process thoughts for all villagers in a tick
   */
  processTick(villagers, context = {}) {
    const { currentTick = 0, interactions = [] } = context;
    const thoughts = [];

    // Build lookup for recent interactions
    const recentByVillager = new Map();
    for (const interaction of interactions.slice(-20)) {
      if (!recentByVillager.has(interaction.villager1_id)) {
        recentByVillager.set(interaction.villager1_id, []);
      }
      if (!recentByVillager.has(interaction.villager2_id)) {
        recentByVillager.set(interaction.villager2_id, []);
      }
      recentByVillager.get(interaction.villager1_id).push(interaction);
      recentByVillager.get(interaction.villager2_id).push(interaction);
    }

    for (const villager of villagers) {
      // Skip sleeping villagers (unless dreaming)
      if (villager.activity === ACTIVITY.SLEEPING && Math.random() > 0.05) {
        continue;
      }

      // Find nearby villagers for context
      const nearbyVillagers = villagers.filter(v => 
        v.id !== villager.id && 
        Math.abs(v.x - villager.x) + Math.abs(v.y - villager.y) <= 5
      );

      // Generate thought with probability
      if (Math.random() < 0.15) { // 15% chance per tick
        const thought = this.generateThought(villager, {
          nearbyVillagers,
          recentInteractions: recentByVillager.get(villager.id) || [],
          currentTick,
          timeOfDay: context.timeOfDay
        });

        if (thought) {
          thoughts.push(thought);
        }
      }
    }

    return thoughts;
  }
}

/**
 * MemorySystem - Tracks and manages villager memories of interactions
 */
export class MemorySystem {
  constructor() {
    // Short-term memory per villager (in-memory cache)
    this.shortTermMemory = new Map(); // villagerId -> Memory[]
    
    // Memory capacity
    this.maxShortTermMemories = 20;
    this.maxInteractionMemories = 50;
    this.maxLocationMemories = 30;
  }

  /**
   * Initialize memory for a villager if needed
   */
  initializeMemory(villagerId) {
    if (!this.shortTermMemory.has(villagerId)) {
      this.shortTermMemory.set(villagerId, {
        interactions: [],
        significantEvents: [],
        villagerImpressions: new Map(),
        visitedLocations: [],
        favoriteLocations: new Map() // locationId -> visit count
      });
    }
    return this.shortTermMemory.get(villagerId);
  }

  /**
   * Record an interaction in a villager's memory
   */
  recordInteraction(villagerId, interaction) {
    const memory = this.initializeMemory(villagerId);
    
    // Add to interaction history
    memory.interactions.push({
      ...interaction,
      rememberedAt: Date.now()
    });

    // Trim if too many
    if (memory.interactions.length > this.maxInteractionMemories) {
      memory.interactions = memory.interactions.slice(-this.maxInteractionMemories);
    }

    // Update impression of other villager
    const otherId = interaction.villager1_id === villagerId 
      ? interaction.villager2_id 
      : interaction.villager1_id;
    
    this.updateImpression(villagerId, otherId, interaction);
  }

  /**
   * Record a visited location
   * @param {string} villagerId - The villager's ID
   * @param {string} locationId - Building or location ID
   * @param {string} locationName - Human-readable location name
   * @param {Object} position - {x, y} coordinates
   */
  recordLocationVisit(villagerId, locationId, locationName, position = {}) {
    const memory = this.initializeMemory(villagerId);
    
    // Add to visited locations
    memory.visitedLocations.push({
      locationId,
      locationName,
      position,
      visitedAt: Date.now()
    });

    // Trim if too many
    if (memory.visitedLocations.length > this.maxLocationMemories) {
      memory.visitedLocations = memory.visitedLocations.slice(-this.maxLocationMemories);
    }

    // Update favorite locations (track visit frequency)
    const currentCount = memory.favoriteLocations.get(locationId) || 0;
    memory.favoriteLocations.set(locationId, currentCount + 1);
  }

  /**
   * Get recently visited locations for a villager
   * @param {string} villagerId - The villager's ID
   * @param {number} limit - Max locations to return
   * @returns {Array} Recent locations with names and times
   */
  getRecentLocations(villagerId, limit = 10) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return [];
    
    return memory.visitedLocations.slice(-limit).reverse();
  }

  /**
   * Get favorite locations (most visited)
   * @param {string} villagerId - The villager's ID
   * @param {number} limit - Max locations to return
   * @returns {Array} Locations sorted by visit count
   */
  getFavoriteLocations(villagerId, limit = 5) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return [];
    
    return Array.from(memory.favoriteLocations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([locationId, count]) => ({ locationId, visitCount: count }));
  }

  /**
   * Update impression of another villager based on interaction
   */
  updateImpression(villagerId, otherId, interaction) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return;

    const currentImpression = memory.villagerImpressions.get(otherId) || {
      totalInteractions: 0,
      averageSentiment: 0,
      affinity: 50,  // Start neutral (0-100)
      lastInteraction: null,
      relationshipTrend: 'neutral',
      interactionTypes: {}
    };

    // Update running average sentiment
    const newTotal = currentImpression.totalInteractions + 1;
    const newAvgSentiment = (
      (currentImpression.averageSentiment * currentImpression.totalInteractions) + 
      (interaction.sentiment || 0)
    ) / newTotal;

    // Update affinity based on interaction sentiment
    // Positive interactions increase affinity, negative decrease it
    const affinityChange = (interaction.sentiment || 0) * 5;
    const newAffinity = Math.max(0, Math.min(100, 
      currentImpression.affinity + affinityChange
    ));

    // Determine trend
    let trend = 'neutral';
    if (newAvgSentiment > 0.3) trend = 'positive';
    else if (newAvgSentiment < -0.3) trend = 'negative';

    // Track interaction types for context
    const interactionTypes = { ...currentImpression.interactionTypes };
    interactionTypes[interaction.type] = (interactionTypes[interaction.type] || 0) + 1;

    // Get relationship level
    const relationshipLevel = getRelationshipLevel(newAffinity);

    memory.villagerImpressions.set(otherId, {
      totalInteractions: newTotal,
      averageSentiment: newAvgSentiment,
      affinity: newAffinity,
      relationshipLevel: relationshipLevel,
      lastInteraction: interaction.type,
      lastInteractionTime: Date.now(),
      relationshipTrend: trend,
      interactionTypes: interactionTypes,
      // Like/dislike convenience flags
      isLiked: newAffinity >= 60,
      isDisliked: newAffinity < 40
    });
  }

  /**
   * Get villagers that this villager likes (affinity >= 60)
   * @param {string} villagerId - The villager's ID
   * @returns {Array} Array of {otherId, affinity, relationshipLevel}
   */
  getLikedVillagers(villagerId) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return [];
    
    return Array.from(memory.villagerImpressions.entries())
      .filter(([_, imp]) => imp.affinity >= 60)
      .sort((a, b) => b[1].affinity - a[1].affinity)
      .map(([otherId, imp]) => ({
        otherId,
        affinity: imp.affinity,
        relationshipLevel: imp.relationshipLevel || getRelationshipLevel(imp.affinity)
      }));
  }

  /**
   * Get villagers that this villager dislikes (affinity < 40)
   * @param {string} villagerId - The villager's ID
   * @returns {Array} Array of {otherId, affinity, relationshipLevel}
   */
  getDislikedVillagers(villagerId) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return [];
    
    return Array.from(memory.villagerImpressions.entries())
      .filter(([_, imp]) => imp.affinity < 40)
      .sort((a, b) => a[1].affinity - b[1].affinity)
      .map(([otherId, imp]) => ({
        otherId,
        affinity: imp.affinity,
        relationshipLevel: imp.relationshipLevel || getRelationshipLevel(imp.affinity)
      }));
  }

  /**
   * Get full relationship summary for a villager
   * @param {string} villagerId - The villager's ID
   * @returns {Object} Categorized relationships
   */
  getRelationshipSummary(villagerId) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return { liked: [], neutral: [], disliked: [] };
    
    const liked = [];
    const neutral = [];
    const disliked = [];
    
    for (const [otherId, imp] of memory.villagerImpressions) {
      const entry = {
        otherId,
        affinity: imp.affinity,
        relationshipLevel: imp.relationshipLevel || getRelationshipLevel(imp.affinity),
        totalInteractions: imp.totalInteractions,
        trend: imp.relationshipTrend
      };
      
      if (imp.affinity >= 60) liked.push(entry);
      else if (imp.affinity < 40) disliked.push(entry);
      else neutral.push(entry);
    }
    
    return {
      liked: liked.sort((a, b) => b.affinity - a.affinity),
      neutral: neutral.sort((a, b) => b.affinity - a.affinity),
      disliked: disliked.sort((a, b) => a.affinity - b.affinity)
    };
  }

  /**
   * Get a villager's memory of interactions with another villager
   */
  getInteractionMemory(villagerId, otherId) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return null;

    const interactions = memory.interactions.filter(i => 
      i.villager1_id === otherId || i.villager2_id === otherId
    );

    const impression = memory.villagerImpressions.get(otherId);

    return {
      interactions: interactions.slice(-10), // Last 10
      impression: impression || null,
      timesMetToday: interactions.filter(i => 
        Date.now() - i.rememberedAt < 24 * 60 * 60 * 1000
      ).length
    };
  }

  /**
   * Get all memories for a villager
   */
  getMemories(villagerId) {
    return this.shortTermMemory.get(villagerId) || {
      interactions: [],
      significantEvents: [],
      villagerImpressions: new Map()
    };
  }

  /**
   * Record a significant event
   */
  recordSignificantEvent(villagerId, event) {
    if (!this.shortTermMemory.has(villagerId)) {
      this.shortTermMemory.set(villagerId, {
        interactions: [],
        significantEvents: [],
        villagerImpressions: new Map()
      });
    }

    const memory = this.shortTermMemory.get(villagerId);
    memory.significantEvents.push({
      ...event,
      rememberedAt: Date.now()
    });

    // Keep only recent significant events
    if (memory.significantEvents.length > this.maxShortTermMemories) {
      memory.significantEvents = memory.significantEvents.slice(-this.maxShortTermMemories);
    }
  }

  /**
   * Clear old memories (daily reset or memory decay)
   */
  clearOldMemories(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    
    for (const [villagerId, memory] of this.shortTermMemory) {
      // Filter out old interactions
      memory.interactions = memory.interactions.filter(i => 
        now - i.rememberedAt < maxAge
      );
      
      // Clear old significant events
      memory.significantEvents = memory.significantEvents.filter(e => 
        now - e.rememberedAt < maxAge
      );
    }
  }

  /**
   * Get recent interactions for context in thought generation
   */
  getRecentInteractions(villagerId, limit = 5) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return [];
    
    return memory.interactions.slice(-limit);
  }

  /**
   * Serialize memory for persistence
   */
  toJSON() {
    const data = {};
    for (const [villagerId, memory] of this.shortTermMemory) {
      data[villagerId] = {
        interactions: memory.interactions.slice(-20),
        significantEvents: memory.significantEvents,
        villagerImpressions: Array.from(memory.villagerImpressions.entries()),
        visitedLocations: (memory.visitedLocations || []).slice(-20),
        favoriteLocations: Array.from((memory.favoriteLocations || new Map()).entries())
      };
    }
    return data;
  }

  /**
   * Load from serialized data
   */
  fromJSON(data) {
    this.shortTermMemory.clear();
    for (const [villagerId, memory] of Object.entries(data)) {
      this.shortTermMemory.set(villagerId, {
        interactions: memory.interactions || [],
        significantEvents: memory.significantEvents || [],
        villagerImpressions: new Map(memory.villagerImpressions || []),
        visitedLocations: memory.visitedLocations || [],
        favoriteLocations: new Map(memory.favoriteLocations || [])
      });
    }
  }

  /**
   * Get memory data formatted for database storage
   * Matches the database schema (thoughts, relationships tables)
   * @param {string} villagerId - The villager's ID
   * @returns {Object} Data ready for database insert
   */
  getForDatabase(villagerId) {
    const memory = this.shortTermMemory.get(villagerId);
    if (!memory) return { relationships: [], recentInteractions: [] };
    
    // Format relationships for database
    const relationships = Array.from(memory.villagerImpressions.entries()).map(([otherId, imp]) => ({
      villager_a_id: villagerId,
      villager_b_id: otherId,
      affinity: Math.round(imp.affinity),
      trust: Math.round(imp.affinity), // Could be separate metric later
      interaction_count: imp.totalInteractions,
      last_interaction_at: imp.lastInteractionTime ? new Date(imp.lastInteractionTime).toISOString() : null
    }));
    
    // Format recent interactions
    const recentInteractions = memory.interactions.slice(-10).map(i => ({
      villager1_id: i.villager1_id,
      villager2_id: i.villager2_id,
      type: i.type,
      content: i.content,
      location_x: i.location_x,
      location_y: i.location_y,
      sentiment: i.sentiment,
      created_at: i.rememberedAt ? new Date(i.rememberedAt).toISOString() : new Date().toISOString()
    }));
    
    return { relationships, recentInteractions };
  }

  /**
   * Get all data for database sync (all villagers)
   * @returns {Object} { relationships: [], interactions: [] }
   */
  getAllForDatabase() {
    const allRelationships = [];
    const allInteractions = [];
    const seenInteractions = new Set();
    
    for (const [villagerId] of this.shortTermMemory) {
      const data = this.getForDatabase(villagerId);
      allRelationships.push(...data.relationships);
      
      // Deduplicate interactions
      for (const interaction of data.recentInteractions) {
        const key = `${interaction.villager1_id}-${interaction.villager2_id}-${interaction.created_at}`;
        if (!seenInteractions.has(key)) {
          seenInteractions.add(key);
          allInteractions.push(interaction);
        }
      }
    }
    
    return { relationships: allRelationships, interactions: allInteractions };
  }
}

/**
 * Factory functions
 */
export function createThoughtSystem() {
  return new ThoughtSystem();
}

export function createMemorySystem() {
  return new MemorySystem();
}

export default { ThoughtSystem, MemorySystem, THOUGHT_TYPE };
