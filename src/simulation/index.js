/**
 * Village Simulation - Main Exports
 */

export { SimulationEngine, createSimulation, TICKS_PER_HOUR, HOURS_PER_DAY, TICKS_PER_DAY } from './engine.js';
export { World, createDefaultVillage, GRID_SIZE, TILE_TYPES, BUILDING_TYPES } from './world.js';
export { Villager, ACTIVITY, TRAITS } from './villager.js';
export { 
  InteractionManager, 
  createInteractionManager, 
  INTERACTION_TYPE, 
  INTERACTION_RANGE, 
  INTERACTION_COOLDOWN 
} from './interactions.js';
export {
  ThoughtSystem,
  MemorySystem,
  createThoughtSystem,
  createMemorySystem,
  THOUGHT_TYPE,
  RELATIONSHIP_LEVEL,
  getRelationshipLevel
} from './thoughts.js';
export {
  TransactionManager,
  createTransactionManager,
  Inventory,
  TRANSACTION_TYPE,
  ITEM_TYPE,
  ROLE_ITEMS,
  DEFAULT_INVENTORY,
  DEFAULT_COINS
} from './transactions.js';
export {
  SimulationPersistence,
  createPersistence
} from './persistence.js';

// Convenience default export
export { SimulationEngine as default } from './engine.js';
