const { COLORS, XP_REQUIREMENTS } = require('../config/constants');

// Capitalize first letter of each word
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

// Format numbers with commas
function formatNumber(num) {
    return num.toLocaleString();
}

// Format large numbers with K, M, B suffixes
function formatLargeNumber(num) {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
}

// Calculate XP required for a specific level
function calculateRequiredXP(level) {
    return Math.floor(XP_REQUIREMENTS.BASE_XP * Math.pow(XP_REQUIREMENTS.MULTIPLIER, level - 1));
}

// Calculate total XP from level 1 to specified level
function calculateTotalXP(level) {
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += calculateRequiredXP(i);
    }
    return total;
}

// Get progress bar string
function getProgressBar(current, max, length = 10) {
    const progress = Math.min(current / max, 1);
    const filled = Math.floor(progress * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// Get percentage with one decimal place
function getPercentage(current, max) {
    return Math.min((current / max) * 100, 100).toFixed(1);
}

// Generate random number between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random element from array
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Get time difference in human readable format
function getTimeDifference(date) {
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

// Format duration in milliseconds to human readable
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Get race emoji
function getRaceEmoji(race) {
    const emojis = {
        human: '👤',
        fishman: '🐟',
        mink: '🐺',
        skypiean: '☁️',
        giant: '🏔️',
        cyborg: '🤖'
    };
    return emojis[race] || '👤';
}

// Get faction emoji
function getFactionEmoji(faction) {
    const emojis = {
        pirate: '🏴‍☠️',
        marine: '⚓',
        revolutionary: '✊',
        neutral: '🤝'
    };
    return emojis[faction] || '🤝';
}

// Get dream emoji
function getDreamEmoji(dream) {
    const emojis = {
        greatest_swordsman: '⚔️',
        all_blue: '🌊',
        map_world: '🗺️',
        brave_warrior: '⚔️',
        devil_fruit_master: '🍎',
        topple_government: '✊',
        pirate_king: '👑'
    };
    return emojis[dream] || '🌟';
}

// Get crew role emoji
function getRoleEmoji(role) {
    const emojis = {
        captain: '👑',
        first_mate: '🥇',
        cook: '👨‍🍳',
        navigator: '🧭',
        doctor: '⚕️',
        shipwright: '🔨',
        musician: '🎵',
        fighter: '⚔️'
    };
    return emojis[role] || '⚔️';
}

// Get rarity color
function getRarityColor(rarity) {
    const colors = {
        common: 0x808080,
        uncommon: 0x00FF00,
        rare: 0x0080FF,
        epic: 0x8000FF,
        legendary: 0xFF8000
    };
    return colors[rarity] || COLORS.PRIMARY;
}

// Calculate combat power based on stats
function calculateCombatPower(player) {
    const statTotal = player.strength + player.agility + player.durability + player.intelligence;
    const levelMultiplier = 1 + (player.level - 1) * 0.1;
    return Math.floor(statTotal * levelMultiplier);
}

// Generate unique ID
function generateUniqueId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// Deep clone object
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

// Check if object is empty
function isEmpty(obj) {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    if (typeof obj === 'string') return obj.trim().length === 0;
    return false;
}

// Clamp number between min and max
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

// Linear interpolation
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// Retry async function with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
}

// Sleep for specified milliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Debounce function
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Parse mention from Discord message
function parseMention(mention, type = 'user') {
    const matches = {
        user: mention.match(/^<@!?(\d+)>$/),
        role: mention.match(/^<@&(\d+)>$/),
        channel: mention.match(/^<#(\d+)>$/)
    };
    
    return matches[type]?.[1] || null;
}

// Escape Discord markdown
function escapeMarkdown(text) {
    const unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1');
    const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1');
    return escaped;
}

// Truncate string with ellipsis
function truncate(str, length, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
}

// Check if string is valid URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Format quest rewards into readable string
function formatRewards(rewards) {
    const parts = [];
    if (rewards.experience) parts.push(`🌟 ${rewards.experience} XP`);
    if (rewards.gold) parts.push(`🪙 ${formatNumber(rewards.gold)}`);
    if (rewards.bounty) parts.push(`₿ ${formatLargeNumber(rewards.bounty)}`);
    if (rewards.ship) parts.push(`🚢 ${capitalizeFirst(rewards.ship)}`);
    if (rewards.ally) parts.push(`👥 ${rewards.ally}`);
    return parts.join(', ') || 'Various rewards';
}

// Get quest difficulty stars
function getDifficultyStars(difficulty) {
    return '⭐'.repeat(Math.max(1, Math.min(5, difficulty)));
}

module.exports = {
    capitalizeFirst,
    formatNumber,
    formatLargeNumber,
    calculateRequiredXP,
    calculateTotalXP,
    getProgressBar,
    getPercentage,
    randomInt,
    randomElement,
    shuffleArray,
    getTimeDifference,
    formatDuration,
    getRaceEmoji,
    getFactionEmoji,
    getDreamEmoji,
    getRoleEmoji,
    getRarityColor,
    calculateCombatPower,
    generateUniqueId,
    deepClone,
    isEmpty,
    clamp,
    lerp,
    retryWithBackoff,
    sleep,
    debounce,
    throttle,
    parseMention,
    escapeMarkdown,
    truncate,
    isValidUrl,
    getOrdinalSuffix,
    formatRewards,
    getDifficultyStars
};
