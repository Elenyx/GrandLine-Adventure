-- Drop tables if they exist (for fresh setup)
DROP TABLE IF EXISTS player_allies CASCADE;
DROP TABLE IF EXISTS player_quests CASCADE;
DROP TABLE IF EXISTS crew_members CASCADE;
DROP TABLE IF EXISTS ships CASCADE;
DROP TABLE IF EXISTS crews CASCADE;
DROP TABLE IF EXISTS allies CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- Create enum types
CREATE TYPE race_type AS ENUM ('human', 'fishman', 'mink', 'skypiean', 'giant', 'cyborg');
CREATE TYPE origin_type AS ENUM ('shells_town', 'syrup_village', 'ohara', 'baratie', 'loguetown', 'skypiea', 'elbaf');
CREATE TYPE dream_type AS ENUM ('greatest_swordsman', 'all_blue', 'map_world', 'brave_warrior', 'devil_fruit_master', 'topple_government', 'pirate_king');
CREATE TYPE faction_type AS ENUM ('pirate', 'marine', 'revolutionary', 'neutral');
CREATE TYPE crew_role_type AS ENUM ('captain', 'first_mate', 'cook', 'navigator', 'doctor', 'shipwright', 'musician', 'fighter');
CREATE TYPE quest_status_type AS ENUM ('available', 'in_progress', 'completed', 'failed');
CREATE TYPE ship_type AS ENUM ('small_boat', 'caravel', 'brigantine', 'galleon', 'legendary');
CREATE TYPE ally_rarity_type AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- Players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    guild_id VARCHAR(20) NOT NULL,
    character_name VARCHAR(32) NOT NULL,
    race race_type NOT NULL,
    origin origin_type NOT NULL,
    dream dream_type NOT NULL,
    faction faction_type NOT NULL DEFAULT 'neutral',
    level INTEGER NOT NULL DEFAULT 1,
    experience INTEGER NOT NULL DEFAULT 0,
    strength INTEGER NOT NULL DEFAULT 1,
    agility INTEGER NOT NULL DEFAULT 1,
    durability INTEGER NOT NULL DEFAULT 1,
    intelligence INTEGER NOT NULL DEFAULT 1,
    gold INTEGER NOT NULL DEFAULT 1000,
    bounty BIGINT NOT NULL DEFAULT 0,
    crew_id INTEGER,
    ship_id INTEGER,
    location VARCHAR(50) NOT NULL DEFAULT 'shells_town',
    active_quest_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, guild_id)
);

-- Crews table
CREATE TABLE crews (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    captain_id INTEGER NOT NULL,
    motto TEXT,
    flag VARCHAR(50) DEFAULT 'default',
    bounty BIGINT NOT NULL DEFAULT 0,
    reputation INTEGER NOT NULL DEFAULT 0,
    ship_id INTEGER,
    location VARCHAR(50) DEFAULT 'shells_town',
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crew members table
CREATE TABLE crew_members (
    id SERIAL PRIMARY KEY,
    crew_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    role crew_role_type NOT NULL DEFAULT 'fighter',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(crew_id, player_id)
);

-- Ships table
CREATE TABLE ships (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ship_type NOT NULL,
    crew_id INTEGER NOT NULL,
    durability INTEGER NOT NULL DEFAULT 100,
    speed INTEGER NOT NULL DEFAULT 10,
    cargo_space INTEGER NOT NULL DEFAULT 50,
    firepower INTEGER NOT NULL DEFAULT 0,
    upgrades JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quests table
CREATE TABLE quests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    arc VARCHAR(50) NOT NULL,
    requirements JSONB DEFAULT '{}',
    rewards JSONB DEFAULT '{}',
    difficulty INTEGER NOT NULL DEFAULT 1,
    max_level INTEGER,
    min_level INTEGER,
    location VARCHAR(50),
    faction_requirement faction_type,
    race_requirement race_type,
    origin_requirement origin_type,
    is_daily BOOLEAN DEFAULT FALSE,
    is_main_story BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player quests table (for tracking quest progress)
CREATE TABLE player_quests (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    quest_id INTEGER NOT NULL,
    status quest_status_type NOT NULL DEFAULT 'in_progress',
    progress JSONB DEFAULT '{}',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(player_id, quest_id)
);

-- Allies table
CREATE TABLE allies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    rarity ally_rarity_type NOT NULL,
    buffs JSONB NOT NULL DEFAULT '{}',
    unlock_condition JSONB DEFAULT '{}',
    image_url TEXT,
    faction faction_type,
    origin_arc VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player allies table
CREATE TABLE player_allies (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    ally_id INTEGER NOT NULL,
    bond_level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT FALSE,
    recruited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, ally_id)
);

-- Add foreign key constraints
ALTER TABLE players ADD CONSTRAINT fk_players_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE SET NULL;
ALTER TABLE players ADD CONSTRAINT fk_players_ship FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE SET NULL;
ALTER TABLE players ADD CONSTRAINT fk_players_quest FOREIGN KEY (active_quest_id) REFERENCES quests(id) ON DELETE SET NULL;

ALTER TABLE crews ADD CONSTRAINT fk_crews_captain FOREIGN KEY (captain_id) REFERENCES players(id) ON DELETE CASCADE;
ALTER TABLE crews ADD CONSTRAINT fk_crews_ship FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE SET NULL;

ALTER TABLE crew_members ADD CONSTRAINT fk_crew_members_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE;
ALTER TABLE crew_members ADD CONSTRAINT fk_crew_members_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE ships ADD CONSTRAINT fk_ships_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE;

ALTER TABLE player_quests ADD CONSTRAINT fk_player_quests_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
ALTER TABLE player_quests ADD CONSTRAINT fk_player_quests_quest FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE;

ALTER TABLE player_allies ADD CONSTRAINT fk_player_allies_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
ALTER TABLE player_allies ADD CONSTRAINT fk_player_allies_ally FOREIGN KEY (ally_id) REFERENCES allies(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_players_user_guild ON players(user_id, guild_id);
CREATE INDEX idx_players_level ON players(level);
CREATE INDEX idx_players_bounty ON players(bounty);
CREATE INDEX idx_players_crew ON players(crew_id);
CREATE INDEX idx_crews_captain ON crews(captain_id);
CREATE INDEX idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX idx_crew_members_player ON crew_members(player_id);
CREATE INDEX idx_player_quests_player ON player_quests(player_id);
CREATE INDEX idx_player_quests_status ON player_quests(status);
CREATE INDEX idx_player_allies_player ON player_allies(player_id);
CREATE INDEX idx_player_allies_active ON player_allies(is_active);

-- Insert some initial quest data
INSERT INTO quests (name, description, arc, requirements, rewards, difficulty, min_level, location, is_main_story) VALUES
('The First Step', 'Begin your journey as a pirate by choosing your path and meeting your first ally.', 'Romance Dawn', '{}', '{"experience": 100, "gold": 500}', 1, 1, 'shells_town', true),
('Defeat Captain Morgan', 'Face the corrupt Marine Captain Morgan and free the town from his tyranny.', 'Romance Dawn', '{"defeat_enemies": 1}', '{"experience": 200, "gold": 1000, "bounty": 5000000}', 2, 2, 'shells_town', true),
('Find a Ship', 'Acquire your first vessel to sail the Grand Line.', 'Romance Dawn', '{"complete_tasks": 3}', '{"experience": 150, "ship": "small_boat"}', 1, 3, 'shells_town', true),
('Orange Town Arrival', 'Arrive at Orange Town and investigate the strange happenings.', 'Orange Town', '{}', '{"experience": 100, "gold": 300}', 1, 4, 'orange_town', true),
('Buggy the Clown', 'Confront the notorious pirate Buggy and his crew terrorizing Orange Town.', 'Orange Town', '{"defeat_enemies": 3}', '{"experience": 300, "gold": 2000, "bounty": 10000000}', 3, 5, 'orange_town', true);

-- Insert some initial ally data
INSERT INTO allies (name, description, rarity, buffs, unlock_condition, faction, origin_arc) VALUES
('Roronoa Zoro', 'A skilled swordsman seeking to become the world''s greatest.', 'epic', '{"strength": 15, "sword_damage": 20}', '{"min_level": 2, "required_quest": "Defeat Captain Morgan"}', 'pirate', 'Romance Dawn'),
('Nami', 'A talented navigator and skilled thief with a love for treasure.', 'rare', '{"intelligence": 10, "gold_bonus": 15}', '{"min_level": 3}', 'pirate', 'Orange Town'),
('Usopp', 'A brave sniper with incredible marksmanship skills.', 'uncommon', '{"agility": 8, "ranged_damage": 12}', '{"min_level": 4}', 'pirate', 'Syrup Village'),
('Monkey D. Luffy', 'The future Pirate King with the power of the Gum-Gum Fruit.', 'legendary', '{"strength": 25, "durability": 20, "leadership": 30}', '{"min_level": 10, "min_bounty": 50000000}', 'pirate', 'Romance Dawn'),
('Sanji', 'A master chef and powerful fighter who never wastes food.', 'epic', '{"agility": 12, "cooking": 25, "kick_damage": 18}', '{"min_level": 8}', 'pirate', 'Baratie');
