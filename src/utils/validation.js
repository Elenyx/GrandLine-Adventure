const { RACES, ORIGINS, DREAMS, FACTIONS, CREW_ROLES, LIMITS } = require('../config/constants');

// Validate character creation data
function validateCharacterData(data) {
    const errors = [];

    // Required fields
    if (!data.character_name) {
        errors.push('Character name is required');
    } else {
        // Character name validation
        if (data.character_name.length < 2) {
            errors.push('Character name must be at least 2 characters long');
        }
        if (data.character_name.length > LIMITS.CHARACTER_NAME_MAX_LENGTH) {
            errors.push(`Character name must be no more than ${LIMITS.CHARACTER_NAME_MAX_LENGTH} characters long`);
        }
        if (!/^[a-zA-Z0-9\s\-']+$/.test(data.character_name)) {
            errors.push('Character name contains invalid characters (only letters, numbers, spaces, hyphens, and apostrophes allowed)');
        }
    }

    if (!data.race) {
        errors.push('Race is required');
    } else if (!Object.values(RACES).includes(data.race)) {
        errors.push('Invalid race selected');
    }

    if (!data.origin) {
        errors.push('Origin is required');
    } else if (!Object.values(ORIGINS).includes(data.origin)) {
        errors.push('Invalid origin selected');
    }

    if (!data.dream) {
        errors.push('Dream is required');
    } else if (!Object.values(DREAMS).includes(data.dream)) {
        errors.push('Invalid dream selected');
    }

    if (!data.user_id) {
        errors.push('User ID is required');
    }

    if (!data.guild_id) {
        errors.push('Guild ID is required');
    }

    // Optional faction validation
    if (data.faction && !Object.values(FACTIONS).includes(data.faction)) {
        errors.push('Invalid faction selected');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate crew creation data
function validateCrewData(data) {
    const errors = [];

    // Required fields
    if (!data.name) {
        errors.push('Crew name is required');
    } else {
        // Crew name validation
        if (data.name.length < 2) {
            errors.push('Crew name must be at least 2 characters long');
        }
        if (data.name.length > LIMITS.CREW_NAME_MAX_LENGTH) {
            errors.push(`Crew name must be no more than ${LIMITS.CREW_NAME_MAX_LENGTH} characters long`);
        }
        if (!/^[a-zA-Z0-9\s\-'!.]+$/.test(data.name)) {
            errors.push('Crew name contains invalid characters');
        }
    }

    if (!data.captain_id) {
        errors.push('Captain ID is required');
    }

    // Optional motto validation
    if (data.motto && data.motto.length > 200) {
        errors.push('Crew motto must be no more than 200 characters long');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate crew role
function validateCrewRole(role) {
    return Object.values(CREW_ROLES).includes(role);
}

// Validate quest data
function validateQuestData(data) {
    const errors = [];

    if (!data.name) {
        errors.push('Quest name is required');
    } else if (data.name.length > 100) {
        errors.push('Quest name must be no more than 100 characters long');
    }

    if (!data.description) {
        errors.push('Quest description is required');
    } else if (data.description.length > 1000) {
        errors.push('Quest description must be no more than 1000 characters long');
    }

    if (!data.arc) {
        errors.push('Quest arc is required');
    }

    if (data.difficulty && (data.difficulty < 1 || data.difficulty > 5)) {
        errors.push('Quest difficulty must be between 1 and 5');
    }

    if (data.min_level && data.min_level < 1) {
        errors.push('Minimum level must be at least 1');
    }

    if (data.max_level && data.max_level > 100) {
        errors.push('Maximum level cannot exceed 100');
    }

    if (data.min_level && data.max_level && data.min_level > data.max_level) {
        errors.push('Minimum level cannot be greater than maximum level');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate user permissions
function validateUserPermissions(member, requiredPermissions) {
    if (!member || !member.permissions) {
        return {
            isValid: false,
            errors: ['Invalid member or permissions']
        };
    }

    const missingPermissions = requiredPermissions.filter(
        permission => !member.permissions.has(permission)
    );

    return {
        isValid: missingPermissions.length === 0,
        errors: missingPermissions.length > 0 
            ? [`Missing permissions: ${missingPermissions.join(', ')}`]
            : []
    };
}

// Validate player level requirements
function validateLevelRequirement(playerLevel, requirements) {
    const errors = [];

    if (requirements.min_level && playerLevel < requirements.min_level) {
        errors.push(`Minimum level ${requirements.min_level} required (you are level ${playerLevel})`);
    }

    if (requirements.max_level && playerLevel > requirements.max_level) {
        errors.push(`Maximum level ${requirements.max_level} exceeded (you are level ${playerLevel})`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate resource costs
function validateResourceCost(player, cost) {
    const errors = [];

    if (cost.gold && player.gold < cost.gold) {
        errors.push(`Insufficient gold (need ${cost.gold}, have ${player.gold})`);
    }

    if (cost.experience && player.experience < cost.experience) {
        errors.push(`Insufficient experience (need ${cost.experience}, have ${player.experience})`);
    }

    if (cost.bounty && player.bounty < cost.bounty) {
        errors.push(`Insufficient bounty (need ${cost.bounty}, have ${player.bounty})`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate input length
function validateInputLength(input, fieldName, minLength = 0, maxLength = 2000) {
    const errors = [];

    if (typeof input !== 'string') {
        errors.push(`${fieldName} must be a string`);
        return { isValid: false, errors };
    }

    if (input.length < minLength) {
        errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }

    if (input.length > maxLength) {
        errors.push(`${fieldName} must be no more than ${maxLength} characters long`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate Discord user ID
function validateDiscordId(id) {
    const errors = [];

    if (!id) {
        errors.push('ID is required');
    } else if (!/^\d{17,19}$/.test(id)) {
        errors.push('Invalid Discord ID format');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate email format (if needed for future features)
function validateEmail(email) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && !emailRegex.test(email)) {
        errors.push('Invalid email format');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate number range
function validateNumberRange(value, fieldName, min, max) {
    const errors = [];

    if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${fieldName} must be a valid number`);
        return { isValid: false, errors };
    }

    if (value < min) {
        errors.push(`${fieldName} must be at least ${min}`);
    }

    if (value > max) {
        errors.push(`${fieldName} must be no more than ${max}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate array length
function validateArrayLength(array, fieldName, minLength = 0, maxLength = 100) {
    const errors = [];

    if (!Array.isArray(array)) {
        errors.push(`${fieldName} must be an array`);
        return { isValid: false, errors };
    }

    if (array.length < minLength) {
        errors.push(`${fieldName} must have at least ${minLength} items`);
    }

    if (array.length > maxLength) {
        errors.push(`${fieldName} must have no more than ${maxLength} items`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Sanitize input text
function sanitizeText(text) {
    if (typeof text !== 'string') {
        return '';
    }

    // Remove or escape potentially harmful characters
    return text
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}

// Validate and sanitize user input
function validateAndSanitizeInput(input, rules = {}) {
    let sanitized = sanitizeText(input);
    const validation = validateInputLength(
        sanitized, 
        rules.fieldName || 'Input',
        rules.minLength || 0,
        rules.maxLength || 2000
    );

    return {
        sanitized,
        ...validation
    };
}

module.exports = {
    validateCharacterData,
    validateCrewData,
    validateCrewRole,
    validateQuestData,
    validateUserPermissions,
    validateLevelRequirement,
    validateResourceCost,
    validateInputLength,
    validateDiscordId,
    validateEmail,
    validateNumberRange,
    validateArrayLength,
    sanitizeText,
    validateAndSanitizeInput
};
