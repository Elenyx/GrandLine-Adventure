const RomanceDawnQuest = require('./RomanceDawn/RomanceDawn');
const OrangeTownQuest = require('./OrangeTown/OrangeTown');

// Quest registry mapping quest IDs to their implementations
const questRegistry = new Map();

// Register quest implementations
function registerQuest(questId, questClass) {
    questRegistry.set(questId, questClass);
}

// Get quest implementation by ID
function getQuestImplementation(questId) {
    return questRegistry.get(questId);
}

// Initialize all quest implementations
function initializeQuestRegistry() {
    // Register Romance Dawn quests (IDs 1-3 from database)
    registerQuest(1, RomanceDawnQuest); // "The First Step"
    registerQuest(2, RomanceDawnQuest); // "Defeat Captain Morgan"
    registerQuest(3, RomanceDawnQuest); // "Find a Ship"
    
    // Register Orange Town quests (IDs 4-5 from database)
    registerQuest(4, OrangeTownQuest); // "Orange Town Arrival"
    registerQuest(5, OrangeTownQuest); // "Buggy the Clown"
    
    console.log('[QUESTS] Registered quest implementations');
}

// Create a quest instance
async function createQuestInstance(questId, questData) {
    const QuestClass = getQuestImplementation(questId);
    
    if (!QuestClass) {
        // Fallback to base quest if no specific implementation
        const BaseQuest = require('./BaseQuest');
        return new BaseQuest(questData);
    }
    
    return new QuestClass(questData);
}

// Get all registered quest IDs
function getRegisteredQuestIds() {
    return Array.from(questRegistry.keys());
}

// Check if a quest has a custom implementation
function hasCustomImplementation(questId) {
    return questRegistry.has(questId);
}

// Quest difficulty levels
const DIFFICULTY_LEVELS = {
    EASY: 1,
    NORMAL: 2,
    HARD: 3,
    VERY_HARD: 4,
    EXTREME: 5
};

// Quest types
const QUEST_TYPES = {
    MAIN_STORY: 'main_story',
    SIDE_QUEST: 'side_quest',
    DAILY: 'daily',
    EVENT: 'event',
    CREW: 'crew'
};

// Arc definitions
const STORY_ARCS = {
    ROMANCE_DAWN: 'Romance Dawn',
    ORANGE_TOWN: 'Orange Town',
    SYRUP_VILLAGE: 'Syrup Village',
    BARATIE: 'Baratie',
    ARLONG_PARK: 'Arlong Park',
    LOGUETOWN: 'Loguetown',
    REVERSE_MOUNTAIN: 'Reverse Mountain',
    WHISKEY_PEAK: 'Whiskey Peak',
    LITTLE_GARDEN: 'Little Garden',
    DRUM_ISLAND: 'Drum Island',
    ALABASTA: 'Alabasta'
};

// Helper function to validate quest data
function validateQuestData(questData) {
    const required = ['id', 'name', 'description', 'arc'];
    const missing = required.filter(field => !questData[field]);
    
    if (missing.length > 0) {
        throw new Error(`Quest data missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
}

// Helper function to calculate quest rewards based on difficulty
function calculateRewards(difficulty, playerLevel) {
    const baseXP = 50;
    const baseGold = 100;
    
    return {
        experience: Math.floor(baseXP * difficulty * (1 + playerLevel * 0.1)),
        gold: Math.floor(baseGold * difficulty * (1 + playerLevel * 0.05)),
        bounty: difficulty >= 3 ? Math.floor(1000000 * difficulty) : 0
    };
}

// Export everything
module.exports = {
    // Core functions
    registerQuest,
    getQuestImplementation,
    initializeQuestRegistry,
    createQuestInstance,
    getRegisteredQuestIds,
    hasCustomImplementation,
    
    // Validation and helpers
    validateQuestData,
    calculateRewards,
    
    // Constants
    DIFFICULTY_LEVELS,
    QUEST_TYPES,
    STORY_ARCS,
    
    // Quest classes for direct import
    RomanceDawnQuest,
    OrangeTownQuest
};
