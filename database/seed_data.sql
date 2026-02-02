-- Village Simulation Seed Data
-- 7 Unique Villagers for a Japanese Pokemon-style village

-- ============================================
-- VILLAGERS
-- Each has a distinct role, personality, and starting position
-- ============================================

INSERT INTO villagers (name, role, personality, position_x, position_y, money, home_x, home_y, sprite_key, status) VALUES

-- HANA - The Farmer
-- Cheerful and nurturing, she tends to the village gardens
('Hana', 'Farmer', 
'Gentle and nurturing soul who speaks to her plants. Optimistic to a fault, she believes every problem can be solved with the right harvest. Tends to hum while working and has an encyclopedic knowledge of crops and seasons. Gets flustered when complimented.',
45, 120, 150, 40, 115, 'farmer', 'idle'),

-- KENJI - The Blacksmith
-- Gruff exterior but kind heart, makes tools and repairs
('Kenji', 'Blacksmith',
'Strong and stoic, speaks in short sentences. Underneath his gruff exterior lies a surprisingly gentle soul who carves tiny wooden animals in secret. Takes immense pride in his craft. Respects hard work above all else. Has a soft spot for children.',
180, 80, 200, 185, 75, 'blacksmith', 'idle'),

-- YUKI - The Baker  
-- Warm and motherly, the heart of village social life
('Yuki', 'Baker',
'Warm and motherly, her bakery is the heart of village gossip. She knows everyone''s business but keeps secrets well. Wakes before dawn and considers feeding people her life''s purpose. Fiercely protective of the village. Makes the best melon bread in the region.',
100, 150, 180, 95, 145, 'baker', 'idle'),

-- TAKESHI - The Traveling Merchant
-- Adventurous storyteller, brings goods and tales from afar
('Takeshi', 'Merchant',
'Charismatic wanderer with a tale for every occasion (most of them exaggerated). Deals in rare goods and rarer information. Loves haggling but always gives fair prices to friends. Has a mysterious past he hints at but never fully reveals. Collects interesting stones.',
200, 200, 500, 205, 195, 'merchant', 'idle'),

-- SORA - The Village Elder
-- Wise keeper of village traditions and wisdom
('Sora', 'Elder',
'Ancient and wise, she remembers when the village was just three houses. Guides the village with a gentle but firm hand. Speaks in proverbs and riddles that somehow always make sense later. Has a mischievous streak that surprises newcomers.',
128, 60, 1000, 125, 55, 'elder', 'idle'),

-- REN - The Banker
-- Quiet philosopher who manages village finances
('Ren', 'Banker',
'Patient and philosophical, finds meaning in careful accounting. Speaks rarely but when he does, people listen. Best friends with silence. Knows the village finances better than anyone. Secretly writes poetry he''s too shy to share.',
30, 200, 120, 25, 205, 'banker', 'idle'),

-- MIKA - The Traveler
-- Energetic wanderer, brings news and stories from afar
('Mika', 'Traveler',
'Boundless energy wrapped in wanderlust. Dreams of adventure and has seen many places. Asks endless questions about everywhere she hasn''t been yet. Trips over things frequently. Has befriended animals in every village she''s visited.',
128, 128, 50, 130, 130, 'traveler', 'idle');

-- ============================================
-- INITIAL WORLD STATE
-- ============================================

INSERT INTO world_state (key, value, description) VALUES

('simulation_tick', '{"tick": 0, "started_at": null}', 
'Current simulation tick counter'),

('time_of_day', '{"hour": 8, "minute": 0, "period": "morning"}', 
'Current in-game time (24-hour cycle over real minutes)'),

('weather', '{"current": "sunny", "temperature": 22, "forecast": ["sunny", "cloudy", "sunny"]}', 
'Current weather conditions and 3-day forecast'),

('season', '{"current": "spring", "day_of_season": 1, "total_days": 30}', 
'Current season (spring/summer/autumn/winter)'),

('village_mood', '{"happiness": 75, "prosperity": 60, "safety": 90}', 
'Overall village metrics'),

('events', '{"active": [], "upcoming": [], "history": []}', 
'Village events (festivals, emergencies, visitors)'),

('economy', '{"total_transactions_today": 0, "busiest_shop": null, "inflation_rate": 1.0}', 
'Economic indicators'),

('simulation_config', '{"speed_multiplier": 1, "ai_enabled": true, "max_thoughts_per_tick": 3}', 
'Simulation configuration');

-- ============================================
-- INITIAL RELATIONSHIPS
-- Starting relationship values between all villagers
-- ============================================

-- Get villager IDs for relationship setup (using a CTE)
WITH villager_ids AS (
    SELECT id, name FROM villagers
)
INSERT INTO relationships (villager_a_id, villager_b_id, affinity, trust, interaction_count)
SELECT 
    a.id, b.id,
    CASE 
        -- Pre-existing friendships and relationships
        WHEN a.name = 'Yuki' AND b.name = 'Hana' THEN 75  -- neighbors, share recipes
        WHEN a.name = 'Kenji' AND b.name = 'Ren' THEN 70  -- old fishing buddies
        WHEN a.name = 'Sora' AND b.name = 'Yuki' THEN 80  -- elder respects the baker
        WHEN a.name = 'Mika' AND b.name = 'Takeshi' THEN 65 -- Mika loves his stories
        WHEN a.name = 'Mika' AND b.name = 'Kenji' THEN 60 -- apprentice relationship
        WHEN a.name = 'Hana' AND b.name = 'Ren' THEN 55   -- she buys flowers, he's shy
        WHEN a.name = 'Takeshi' AND b.name = 'Sora' THEN 50 -- merchant respects elder, some tension over prices
        ELSE 50 -- neutral starting point
    END as affinity,
    CASE
        WHEN a.name = 'Sora' THEN 70  -- everyone trusts the elder more
        WHEN b.name = 'Sora' THEN 70
        WHEN a.name = 'Yuki' THEN 65  -- baker is trustworthy
        WHEN b.name = 'Yuki' THEN 65
        WHEN a.name = 'Takeshi' OR b.name = 'Takeshi' THEN 45 -- merchant is charming but...
        ELSE 50
    END as trust,
    0 as interaction_count
FROM villager_ids a
CROSS JOIN villager_ids b
WHERE a.name < b.name; -- only one direction, alphabetically ordered

-- ============================================
-- INITIAL INVENTORY
-- Starting items for each villager based on their role
-- ============================================

-- Hana's inventory (Florist)
INSERT INTO inventory (villager_id, item_name, quantity, item_type)
SELECT id, item_name, quantity, item_type
FROM villagers, (VALUES 
    ('sunflower seeds', 20, 'material'),
    ('rose bouquet', 5, 'goods'),
    ('watering can', 1, 'tool'),
    ('flower pot', 10, 'material')
) AS items(item_name, quantity, item_type)
WHERE villagers.name = 'Hana';

-- Kenji's inventory (Blacksmith)
INSERT INTO inventory (villager_id, item_name, quantity, item_type)
SELECT id, item_name, quantity, item_type
FROM villagers, (VALUES 
    ('iron ingot', 15, 'material'),
    ('coal', 30, 'material'),
    ('hammer', 2, 'tool'),
    ('horseshoe', 8, 'goods')
) AS items(item_name, quantity, item_type)
WHERE villagers.name = 'Kenji';

-- Yuki's inventory (Baker)
INSERT INTO inventory (villager_id, item_name, quantity, item_type)
SELECT id, item_name, quantity, item_type
FROM villagers, (VALUES 
    ('flour', 50, 'material'),
    ('sugar', 20, 'material'),
    ('melon bread', 12, 'food'),
    ('red bean bun', 8, 'food')
) AS items(item_name, quantity, item_type)
WHERE villagers.name = 'Yuki';

-- Takeshi's inventory (Merchant)
INSERT INTO inventory (villager_id, item_name, quantity, item_type)
SELECT id, item_name, quantity, item_type
FROM villagers, (VALUES 
    ('exotic spices', 5, 'goods'),
    ('silk cloth', 3, 'goods'),
    ('interesting stone', 12, 'curiosity'),
    ('travel map', 1, 'tool'),
    ('merchant ledger', 1, 'tool')
) AS items(item_name, quantity, item_type)
WHERE villagers.name = 'Takeshi';

-- Sora's inventory (Banker/Elder)
INSERT INTO inventory (villager_id, item_name, quantity, item_type)
SELECT id, item_name, quantity, item_type
FROM villagers, (VALUES 
    ('village ledger', 1, 'tool'),
    ('reading glasses', 1, 'tool'),
    ('herbal tea', 10, 'food'),
    ('old photograph', 1, 'keepsake')
) AS items(item_name, quantity, item_type)
WHERE villagers.name = 'Sora';

-- Ren's inventory (Fisher)
INSERT INTO inventory (villager_id, item_name, quantity, item_type)
SELECT id, item_name, quantity, item_type
FROM villagers, (VALUES 
    ('fishing rod', 2, 'tool'),
    ('fresh fish', 6, 'food'),
    ('bait', 25, 'material'),
    ('poetry notebook', 1, 'keepsake')
) AS items(item_name, quantity, item_type)
WHERE villagers.name = 'Ren';

-- Mika's inventory (Apprentice)
INSERT INTO inventory (villager_id, item_name, quantity, item_type)
SELECT id, item_name, quantity, item_type
FROM villagers, (VALUES 
    ('worn notebook', 1, 'tool'),
    ('apple', 3, 'food'),
    ('lucky charm', 1, 'keepsake'),
    ('odd jobs list', 1, 'tool')
) AS items(item_name, quantity, item_type)
WHERE villagers.name = 'Mika';

-- ============================================
-- INITIAL THOUGHTS
-- Each villager starts with one thought
-- ============================================

INSERT INTO thoughts (villager_id, content, thought_type, importance)
SELECT id, thought, 'reflection', importance
FROM villagers
JOIN (VALUES 
    ('Hana', 'The morning glories are blooming beautifully today. I should gather some seeds to share.', 6),
    ('Kenji', 'The forge needs more coal. Perhaps I should ask Takeshi about his next supply run.', 5),
    ('Yuki', 'I wonder what everyone would like for the spring festival. Maybe a special pastry...', 7),
    ('Takeshi', 'This village grows on you. Maybe I''ll stay a bit longer this time.', 6),
    ('Sora', 'The young ones seem restless. Spring always brings change to the village.', 8),
    ('Ren', 'The fish are moving deeper. Rain is coming within three days.', 7),
    ('Mika', 'Today I''ll help Kenji at the forge! Or maybe Yuki needs help? Or both!', 5)
) AS thoughts(villager_name, thought, importance)
ON villagers.name = thoughts.villager_name;
