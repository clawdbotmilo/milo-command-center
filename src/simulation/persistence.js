/**
 * Village Simulation Persistence Layer
 * Handles state persistence to Supabase for the simulation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cickewgwucqnorzkcyhw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpY2tld2d3dWNxbm9yemtjeWh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NzgwNiwiZXhwIjoyMDg1NTUzODA2fQ.DA1OHr8lzWu4RV3szgPA--UgLzTbRKpf2fKGOkyD4Ak';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// State key for the village simulation
const STATE_KEY = 'village_simulation_v1';

/**
 * Persistence Manager for Village Simulation
 */
export class SimulationPersistence {
  constructor(options = {}) {
    this.saveIntervalMs = options.saveIntervalMs || 30000; // Save every 30 seconds
    this.lastSave = 0;
    this.pendingInteractions = [];
    this.pendingThoughts = [];
    this.pendingTransactions = [];
    this.saveInProgress = false;
    this.enabled = options.enabled !== false;
  }

  /**
   * Save full simulation state to database
   */
  async saveState(engine) {
    if (!this.enabled || this.saveInProgress) return;
    
    const now = Date.now();
    if (now - this.lastSave < this.saveIntervalMs) return;
    
    this.saveInProgress = true;
    this.lastSave = now;
    
    try {
      const state = engine.getFullState();
      const memoryState = engine.getMemoryState ? engine.getMemoryState() : null;
      
      // Upsert world state
      const { error: stateError } = await supabase
        .from('world_state')
        .upsert({
          key: STATE_KEY,
          state: {
            tick: state.tick,
            day: state.day,
            speed: state.speed,
            savedAt: new Date().toISOString(),
            villagers: state.villagers,
            memoryState
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });
      
      if (stateError) {
        console.error('[Persistence] Error saving world state:', stateError.message);
      } else {
        console.log(`[Persistence] Saved state: Day ${state.day}, Tick ${state.tick}`);
      }
      
      // Flush pending interactions to database
      await this.flushInteractions(engine);
      await this.flushThoughts(engine);
      await this.flushTransactions(engine);
      
      // Update villager positions in database
      await this.updateVillagerPositions(engine);
      
    } catch (err) {
      console.error('[Persistence] Save error:', err.message);
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Force an immediate save (e.g., on shutdown)
   */
  async forceSave(engine) {
    this.lastSave = 0;
    await this.saveState(engine);
  }

  /**
   * Load simulation state from database
   */
  async loadState() {
    if (!this.enabled) return null;
    
    try {
      const { data, error } = await supabase
        .from('world_state')
        .select('*')
        .eq('key', STATE_KEY)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No state found - first run
          console.log('[Persistence] No saved state found, starting fresh');
          return null;
        }
        console.error('[Persistence] Error loading state:', error.message);
        return null;
      }
      
      if (data && data.state) {
        console.log(`[Persistence] Loaded state: Day ${data.state.day}, Tick ${data.state.tick}`);
        return data.state;
      }
      
      return null;
    } catch (err) {
      console.error('[Persistence] Load error:', err.message);
      return null;
    }
  }

  /**
   * Update villager positions in database
   */
  async updateVillagerPositions(engine) {
    const villagers = engine.getAllVillagers();
    const updates = villagers.map(v => ({
      id: v.id,
      name: v.name,
      role: v.role,
      position_x: v.x,
      position_y: v.y,
      status: v.activity,
      money: v.coins,
      home_x: null,
      home_y: null,
      personality: JSON.stringify(v.personality),
      sprite_key: v.role
    }));
    
    try {
      const { error } = await supabase
        .from('villagers')
        .upsert(updates, { onConflict: 'id' });
      
      if (error && error.code !== '23505') {
        console.error('[Persistence] Error updating villagers:', error.message);
      }
    } catch (err) {
      console.error('[Persistence] Villager update error:', err.message);
    }
  }

  /**
   * Flush pending interactions to database
   */
  async flushInteractions(engine) {
    const interactions = engine.flushInteractionLogs ? engine.flushInteractionLogs() : [];
    if (interactions.length === 0) return;
    
    const records = interactions.map(i => ({
      id: i.id || `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      villager1_id: i.villager1_id,
      villager2_id: i.villager2_id,
      type: i.type,
      sentiment: i.sentiment || 0,
      dialogue: i.dialogue,
      location_x: i.location?.x || 0,
      location_y: i.location?.y || 0,
      created_at: new Date().toISOString()
    }));
    
    try {
      const { error } = await supabase
        .from('interactions')
        .insert(records);
      
      if (error) {
        console.error('[Persistence] Error saving interactions:', error.message);
      } else {
        console.log(`[Persistence] Saved ${records.length} interactions`);
      }
    } catch (err) {
      console.error('[Persistence] Interaction flush error:', err.message);
    }
  }

  /**
   * Flush pending thoughts to database
   */
  async flushThoughts(engine) {
    const thoughts = engine.flushThoughtLogs ? engine.flushThoughtLogs() : [];
    if (thoughts.length === 0) return;
    
    const records = thoughts.map(t => ({
      id: t.id || `tht_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      villager_id: t.villagerId,
      type: t.type,
      content: t.content,
      mood: t.mood || 50,
      created_at: new Date().toISOString()
    }));
    
    try {
      const { error } = await supabase
        .from('thoughts')
        .insert(records);
      
      if (error) {
        console.error('[Persistence] Error saving thoughts:', error.message);
      } else {
        console.log(`[Persistence] Saved ${records.length} thoughts`);
      }
    } catch (err) {
      console.error('[Persistence] Thought flush error:', err.message);
    }
  }

  /**
   * Flush pending transactions to database
   */
  async flushTransactions(engine) {
    const transactions = engine.flushTransactionLogs ? engine.flushTransactionLogs() : [];
    if (transactions.length === 0) return;
    
    const records = transactions.map(t => ({
      id: t.id || `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      from_id: t.fromId || t.sellerId,
      to_id: t.toId || t.buyerId,
      type: t.type,
      item: t.item,
      quantity: t.quantity || 1,
      price: t.price || t.amount || 0,
      created_at: new Date().toISOString()
    }));
    
    try {
      const { error } = await supabase
        .from('transactions')
        .insert(records);
      
      if (error) {
        console.error('[Persistence] Error saving transactions:', error.message);
      } else {
        console.log(`[Persistence] Saved ${records.length} transactions`);
      }
    } catch (err) {
      console.error('[Persistence] Transaction flush error:', err.message);
    }
  }

  /**
   * Get run statistics from database
   */
  async getStats() {
    try {
      const [villagersResult, interactionsResult, thoughtsResult, transactionsResult] = await Promise.all([
        supabase.from('villagers').select('id', { count: 'exact' }),
        supabase.from('interactions').select('id', { count: 'exact' }),
        supabase.from('thoughts').select('id', { count: 'exact' }),
        supabase.from('transactions').select('id', { count: 'exact' })
      ]);
      
      return {
        villagers: villagersResult.count || 0,
        interactions: interactionsResult.count || 0,
        thoughts: thoughtsResult.count || 0,
        transactions: transactionsResult.count || 0
      };
    } catch (err) {
      console.error('[Persistence] Stats error:', err.message);
      return null;
    }
  }
}

/**
 * Create persistence manager
 */
export function createPersistence(options = {}) {
  return new SimulationPersistence(options);
}

export default SimulationPersistence;
