#!/usr/bin/env node
/**
 * Health Check Script for Village Simulation
 * 
 * Checks if the simulation service is running and healthy.
 * Exit code 0 = healthy, non-zero = unhealthy
 * 
 * Usage:
 *   node scripts/check-simulation.js
 *   node scripts/check-simulation.js --verbose
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cickewgwucqnorzkcyhw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpY2tld2d3dWNxbm9yemtjeWh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NzgwNiwiZXhwIjoyMDg1NTUzODA2fQ.DA1OHr8lzWu4RV3szgPA--UgLzTbRKpf2fKGOkyD4Ak';

const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkHealth() {
  const now = new Date();
  
  try {
    // Check world state
    const { data: state, error: stateError } = await supabase
      .from('world_state')
      .select('*')
      .eq('key', 'village_simulation_v1')
      .single();
    
    if (stateError) {
      if (stateError.code === 'PGRST116') {
        console.log('❌ No simulation state found - service may not be running');
        process.exit(1);
      }
      throw stateError;
    }
    
    // Check if state is recent (updated in last 2 minutes)
    const lastUpdate = new Date(state.updated_at);
    const ageMs = now - lastUpdate;
    const ageMinutes = ageMs / 1000 / 60;
    
    if (ageMinutes > 2) {
      console.log(`❌ State is stale (${ageMinutes.toFixed(1)} minutes old)`);
      console.log(`   Last update: ${lastUpdate.toISOString()}`);
      process.exit(1);
    }
    
    // Get counts
    const [villagersRes, interactionsRes, thoughtsRes, txnRes] = await Promise.all([
      supabase.from('villagers').select('id', { count: 'exact' }),
      supabase.from('interactions').select('id', { count: 'exact' }),
      supabase.from('thoughts').select('id', { count: 'exact' }),
      supabase.from('transactions').select('id', { count: 'exact' })
    ]);
    
    // Output
    console.log('✅ Simulation is healthy');
    console.log(`   Day: ${state.state?.day || 'N/A'}`);
    console.log(`   Tick: ${state.state?.tick || 'N/A'}`);
    console.log(`   Last save: ${ageMinutes.toFixed(1)} minutes ago`);
    
    if (verbose) {
      console.log('\n📊 Database Stats:');
      console.log(`   Villagers: ${villagersRes.count || 0}`);
      console.log(`   Interactions: ${interactionsRes.count || 0}`);
      console.log(`   Thoughts: ${thoughtsRes.count || 0}`);
      console.log(`   Transactions: ${txnRes.count || 0}`);
      
      // Show recent interactions
      const { data: recentInt } = await supabase
        .from('interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (recentInt && recentInt.length > 0) {
        console.log('\n🤝 Recent Interactions:');
        for (const int of recentInt) {
          console.log(`   ${int.villager1_id} <-> ${int.villager2_id}: ${int.type}`);
        }
      }
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Health check failed:', err.message);
    process.exit(1);
  }
}

checkHealth();
