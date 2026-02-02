-- Village Simulation Database Schema
-- Supabase-compatible PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- VILLAGERS TABLE
-- Core entity: the 7 villagers of our village
-- ============================================
CREATE TABLE villagers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    personality TEXT NOT NULL,
    position_x INTEGER NOT NULL DEFAULT 128 CHECK (position_x >= 0 AND position_x <= 255),
    position_y INTEGER NOT NULL DEFAULT 128 CHECK (position_y >= 0 AND position_y <= 255),
    money INTEGER NOT NULL DEFAULT 100 CHECK (money >= 0),
    home_x INTEGER CHECK (home_x >= 0 AND home_x <= 255),
    home_y INTEGER CHECK (home_y >= 0 AND home_y <= 255),
    sprite_key VARCHAR(50),
    status VARCHAR(20) DEFAULT 'idle',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for spatial queries
CREATE INDEX idx_villagers_position ON villagers (position_x, position_y);

-- ============================================
-- INTERACTIONS TABLE
-- Records all social interactions between villagers
-- ============================================
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    villager1_id UUID NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
    villager2_id UUID NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'greeting', 'trade', 'gossip', 'argument', 'help', etc.
    content TEXT,
    location_x INTEGER,
    location_y INTEGER,
    sentiment DECIMAL(3,2) CHECK (sentiment >= -1 AND sentiment <= 1), -- -1 negative, +1 positive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT different_villagers CHECK (villager1_id != villager2_id)
);

-- Indexes for querying interactions
CREATE INDEX idx_interactions_villager1 ON interactions (villager1_id);
CREATE INDEX idx_interactions_villager2 ON interactions (villager2_id);
CREATE INDEX idx_interactions_created ON interactions (created_at DESC);
CREATE INDEX idx_interactions_type ON interactions (type);

-- ============================================
-- TRANSACTIONS TABLE
-- Economic exchanges: money, items, services
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_villager_id UUID REFERENCES villagers(id) ON DELETE SET NULL,
    to_villager_id UUID REFERENCES villagers(id) ON DELETE SET NULL,
    amount INTEGER DEFAULT 0 CHECK (amount >= 0),
    item VARCHAR(100),
    item_quantity INTEGER DEFAULT 1,
    transaction_type VARCHAR(30) NOT NULL, -- 'purchase', 'gift', 'payment', 'loan', 'repayment'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transaction queries
CREATE INDEX idx_transactions_from ON transactions (from_villager_id);
CREATE INDEX idx_transactions_to ON transactions (to_villager_id);
CREATE INDEX idx_transactions_created ON transactions (created_at DESC);

-- ============================================
-- THOUGHTS TABLE
-- Internal monologue / AI reasoning for each villager
-- ============================================
CREATE TABLE thoughts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    villager_id UUID NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    thought_type VARCHAR(30) DEFAULT 'reflection', -- 'reflection', 'plan', 'observation', 'memory', 'desire'
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    related_villager_id UUID REFERENCES villagers(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- for short-term thoughts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for thought queries
CREATE INDEX idx_thoughts_villager ON thoughts (villager_id);
CREATE INDEX idx_thoughts_created ON thoughts (created_at DESC);
CREATE INDEX idx_thoughts_type ON thoughts (thought_type);
CREATE INDEX idx_thoughts_importance ON thoughts (importance DESC);

-- ============================================
-- WORLD_STATE TABLE
-- Global simulation state (time, weather, events)
-- ============================================
CREATE TABLE world_state (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RELATIONSHIPS TABLE (bonus)
-- Track relationship quality between villagers
-- ============================================
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    villager_a_id UUID NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
    villager_b_id UUID NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
    affinity INTEGER DEFAULT 50 CHECK (affinity >= 0 AND affinity <= 100), -- 0 = enemies, 100 = best friends
    trust INTEGER DEFAULT 50 CHECK (trust >= 0 AND trust <= 100),
    interaction_count INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT different_villagers_rel CHECK (villager_a_id != villager_b_id),
    CONSTRAINT unique_relationship UNIQUE (villager_a_id, villager_b_id)
);

CREATE INDEX idx_relationships_villager_a ON relationships (villager_a_id);
CREATE INDEX idx_relationships_villager_b ON relationships (villager_b_id);

-- ============================================
-- INVENTORY TABLE (bonus)
-- Track what each villager owns
-- ============================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    villager_id UUID NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    item_type VARCHAR(50), -- 'food', 'tool', 'material', 'decoration', 'currency'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_villager_item UNIQUE (villager_id, item_name)
);

CREATE INDEX idx_inventory_villager ON inventory (villager_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER villagers_updated_at
    BEFORE UPDATE ON villagers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER world_state_updated_at
    BEFORE UPDATE ON world_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER relationships_updated_at
    BEFORE UPDATE ON relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE villagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Public read access for simulation display
CREATE POLICY "Public read access" ON villagers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON interactions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON thoughts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON world_state FOR SELECT USING (true);
CREATE POLICY "Public read access" ON relationships FOR SELECT USING (true);
CREATE POLICY "Public read access" ON inventory FOR SELECT USING (true);

-- Service role has full access (for the simulation engine)
CREATE POLICY "Service full access" ON villagers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON interactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON thoughts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON world_state FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON relationships FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON inventory FOR ALL USING (auth.role() = 'service_role');
