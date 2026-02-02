-- Village Simulation Database Schema
-- Run this in Supabase SQL Editor or via migrations

-- World State (for simulation persistence)
CREATE TABLE IF NOT EXISTS world_state (
  key TEXT PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Villagers
CREATE TABLE IF NOT EXISTS villagers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  personality JSONB,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  money INTEGER DEFAULT 0,
  home_x INTEGER,
  home_y INTEGER,
  status TEXT DEFAULT 'idle',
  sprite_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  villager1_id TEXT REFERENCES villagers(id),
  villager2_id TEXT REFERENCES villagers(id),
  type TEXT NOT NULL,
  sentiment REAL DEFAULT 0,
  dialogue TEXT,
  location_x INTEGER,
  location_y INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thoughts
CREATE TABLE IF NOT EXISTS thoughts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  villager_id TEXT REFERENCES villagers(id),
  type TEXT,
  content TEXT,
  mood INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  from_id TEXT,
  to_id TEXT,
  type TEXT NOT NULL,
  item TEXT,
  quantity INTEGER DEFAULT 1,
  price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationships
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  villager_a_id TEXT REFERENCES villagers(id),
  villager_b_id TEXT REFERENCES villagers(id),
  affinity INTEGER DEFAULT 50,
  trust INTEGER DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(villager_a_id, villager_b_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_villager1 ON interactions(villager1_id);
CREATE INDEX IF NOT EXISTS idx_interactions_villager2 ON interactions(villager2_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_villager ON thoughts(villager_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_created ON thoughts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_villagers ON relationships(villager_a_id, villager_b_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to villagers
DROP TRIGGER IF EXISTS update_villagers_updated_at ON villagers;
CREATE TRIGGER update_villagers_updated_at
  BEFORE UPDATE ON villagers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to world_state
DROP TRIGGER IF EXISTS update_world_state_updated_at ON world_state;
CREATE TRIGGER update_world_state_updated_at
  BEFORE UPDATE ON world_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to relationships
DROP TRIGGER IF EXISTS update_relationships_updated_at ON relationships;
CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
