-- Village Simulation Seed Data
-- 7 Unique Villagers with sprite keys matching available sprites

INSERT INTO villagers (id, name, role, personality, position_x, position_y, money, home_x, home_y, sprite_key, status) VALUES
('hana', 'Hana', 'Farmer', '{"traits": ["nurturing", "optimistic", "gentle"], "description": "Tends to the village gardens with love"}', 45, 120, 150, 40, 115, 'farmer', 'idle'),
('kenji', 'Kenji', 'Blacksmith', '{"traits": ["stoic", "hardworking", "kind"], "description": "Gruff exterior but kind heart"}', 180, 80, 200, 185, 75, 'blacksmith', 'idle'),
('yuki', 'Yuki', 'Baker', '{"traits": ["warm", "motherly", "protective"], "description": "Heart of village social life"}', 100, 150, 180, 95, 145, 'baker', 'idle'),
('takeshi', 'Takeshi', 'Merchant', '{"traits": ["charismatic", "adventurous", "fair"], "description": "Traveling storyteller with tales from afar"}', 200, 200, 500, 205, 195, 'merchant', 'idle'),
('sora', 'Sora', 'Elder', '{"traits": ["wise", "mischievous", "patient"], "description": "Ancient keeper of village traditions"}', 128, 60, 1000, 125, 55, 'elder', 'idle'),
('ren', 'Ren', 'Banker', '{"traits": ["quiet", "philosophical", "observant"], "description": "Manages village finances with care"}', 30, 200, 120, 25, 205, 'banker', 'idle'),
('mika', 'Mika', 'Traveler', '{"traits": ["energetic", "curious", "friendly"], "description": "Wanderer who brings news from afar"}', 128, 128, 50, 130, 130, 'traveler', 'idle')
ON CONFLICT (id) DO UPDATE SET
  sprite_key = EXCLUDED.sprite_key,
  role = EXCLUDED.role;
