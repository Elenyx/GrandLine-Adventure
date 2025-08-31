// Game constants and configuration

const RACES = {
    HUMAN: 'human',
    FISHMAN: 'fishman',
    MINK: 'mink',
    SKYPIEAN: 'skypiean',
    GIANT: 'giant',
    CYBORG: 'cyborg'
};

const ORIGINS = {
    SHELLS_TOWN: 'shells_town',
    SYRUP_VILLAGE: 'syrup_village',
    OHARA: 'ohara',
    BARATIE: 'baratie',
    LOGUETOWN: 'loguetown',
    SKYPIEA: 'skypiea',
    ELBAF: 'elbaf'
};

const DREAMS = {
    GREATEST_SWORDSMAN: 'greatest_swordsman',
    ALL_BLUE: 'all_blue',
    MAP_WORLD: 'map_world',
    BRAVE_WARRIOR: 'brave_warrior',
    DEVIL_FRUIT_MASTER: 'devil_fruit_master',
    TOPPLE_GOVERNMENT: 'topple_government',
    PIRATE_KING: 'pirate_king'
};

const FACTIONS = {
    PIRATE: 'pirate',
    MARINE: 'marine',
    REVOLUTIONARY: 'revolutionary',
    NEUTRAL: 'neutral'
};

const CREW_ROLES = {
    CAPTAIN: 'captain',
    FIRST_MATE: 'first_mate',
    COOK: 'cook',
    NAVIGATOR: 'navigator',
    DOCTOR: 'doctor',
    SHIPWRIGHT: 'shipwright',
    MUSICIAN: 'musician',
    FIGHTER: 'fighter'
};

const SHIP_TYPES = {
    SMALL_BOAT: 'small_boat',
    CARAVEL: 'caravel',
    BRIGANTINE: 'brigantine',
    GALLEON: 'galleon',
    LEGENDARY: 'legendary'
};

const QUEST_STATUS = {
    AVAILABLE: 'available',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

const COMBAT_STATS = {
    STRENGTH: 'strength',
    AGILITY: 'agility',
    DURABILITY: 'durability',
    INTELLIGENCE: 'intelligence'
};

const COLORS = {
    PRIMARY: 0x0099FF,
    SUCCESS: 0x00FF00,
    WARNING: 0xFFFF00,
    ERROR: 0xFF0000,
    INFO: 0x00FFFF,
    GOLD: 0xFFD700,
    NAVY: 0x000080,
    RED: 0xFF0000
};

const LIMITS = {
    MAX_CREW_SIZE: 20,
    MAX_ACTIVE_QUESTS: 5,
    MAX_ALLIES: 3,
    MAX_SHIP_UPGRADES: 10,
    DAILY_QUEST_LIMIT: 10,
    CHARACTER_NAME_MAX_LENGTH: 32,
    CREW_NAME_MAX_LENGTH: 50
};

const XP_REQUIREMENTS = {
    BASE_XP: 100,
    MULTIPLIER: 1.5,
    MAX_LEVEL: 100
};

module.exports = {
    RACES,
    ORIGINS,
    DREAMS,
    FACTIONS,
    CREW_ROLES,
    SHIP_TYPES,
    QUEST_STATUS,
    COMBAT_STATS,
    COLORS,
    LIMITS,
    XP_REQUIREMENTS
};
