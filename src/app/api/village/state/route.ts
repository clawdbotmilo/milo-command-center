/**
 * Village State Polling Endpoint
 * 
 * GET /api/village/state
 * GET /api/village/state?since=123
 * 
 * Fallback for environments that don't support SSE (Vercel serverless).
 * Supports two modes:
 * 
 * 1. Full state: Returns complete village state
 * 2. Delta updates: With ?since=<sequence>, returns only events since that sequence
 * 
 * Response includes current sequence number for subsequent polling.
 */

import { NextResponse } from 'next/server'
import { 
  getVillageEmitter, 
  getEventsSince, 
  getCurrentSequence,
  getConnectionCount,
  type VillageState 
} from '@/lib/village-events'
import { createClient } from '@supabase/supabase-js'

// Allow Edge runtime for faster cold starts on Vercel
export const runtime = 'edge'

/**
 * Fetch current state from Supabase
 */
async function fetchCurrentState(): Promise<VillageState | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    // Return mock state if Supabase not configured
    return getMockState()
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch villagers
    const { data: villagers, error: villagersError } = await supabase
      .from('villagers')
      .select('*')
    
    if (villagersError) throw villagersError
    
    // Fetch world state
    const { data: worldStateRows, error: worldError } = await supabase
      .from('world_state')
      .select('*')
    
    if (worldError) throw worldError
    
    // Convert world state rows to object
    const worldState: Record<string, unknown> = {}
    for (const row of worldStateRows || []) {
      worldState[row.key] = row.value
    }
    
    return {
      villagers: villagers || [],
      worldState,
      tick: (worldState.tick as number) || 0,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error('[village-state] Supabase fetch error:', error)
    return getMockState()
  }
}

/**
 * Mock state for development/testing
 */
function getMockState(): VillageState {
  return {
    villagers: [
      {
        id: 'mock-1',
        name: 'Elder Sage',
        role: 'village_elder',
        personality: 'Wise and contemplative',
        position_x: 128,
        position_y: 128,
        money: 500,
        home_x: 50,
        home_y: 50,
        status: 'idle'
      },
      {
        id: 'mock-2',
        name: 'Swift Hands',
        role: 'blacksmith',
        personality: 'Industrious and gruff',
        position_x: 180,
        position_y: 100,
        money: 300,
        home_x: 180,
        home_y: 80,
        status: 'working'
      },
      {
        id: 'mock-3',
        name: 'Green Thumb',
        role: 'farmer',
        personality: 'Patient and nurturing',
        position_x: 80,
        position_y: 200,
        money: 150,
        home_x: 60,
        home_y: 180,
        status: 'farming'
      }
    ],
    worldState: {
      time_of_day: 'morning',
      weather: 'sunny',
      season: 'spring',
      tick: 0
    },
    tick: 0,
    lastUpdate: new Date().toISOString()
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const sinceParam = searchParams.get('since')
  
  // If 'since' provided, return delta updates
  if (sinceParam !== null) {
    const sinceSequence = parseInt(sinceParam, 10) || 0
    const { events, currentSequence } = getEventsSince(sinceSequence)
    
    return NextResponse.json({
      mode: 'delta',
      events,
      sequence: currentSequence,
      connectionCount: getConnectionCount(),
      timestamp: new Date().toISOString()
    })
  }
  
  // Otherwise, return full state
  const state = await fetchCurrentState()
  const emitter = getVillageEmitter()
  
  // Cache state in emitter for SSE clients
  if (state) {
    emitter.setFullState(state)
  }
  
  return NextResponse.json({
    mode: 'full',
    state: state || emitter.getCurrentState(),
    sequence: getCurrentSequence(),
    connectionCount: getConnectionCount(),
    timestamp: new Date().toISOString()
  })
}
