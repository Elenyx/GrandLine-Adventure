const Player = require('../database/models/Player');
const Crew = require('../database/models/Crew');
const Ally = require('../database/models/Ally');
const { query } = require('../config/database');
const { COLORS, XP_REQUIREMENTS } = require('../config/constants');

class PlayerManager {
    constructor() {
        this.playerCache = new Map(); // Cache frequently accessed players
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
    }

    // Get player with caching
    async getPlayer(userId, guildId, useCache = true) {
        const cacheKey = `${userId}_${guildId}`;
        
        if (useCache) {
            const cached = this.playerCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.player;
            }
        }

        const player = await Player.findByUserId(userId, guildId);
        
        if (player && useCache) {
            this.playerCache.set(cacheKey, {
                player,
                timestamp: Date.now()
            });
        }

        return player;
    }

    // Create new player
    async createPlayer(playerData) {
        try {
            const player = await Player.create(playerData);
            
            // Cache the new player
            const cacheKey = `${playerData.user_id}_${playerData.guild_id}`;
            this.playerCache.set(cacheKey, {
                player,
                timestamp: Date.now()
            });

            return player;
        } catch (error) {
            console.error('Error creating player:', error);
            throw error;
        }
    }

    // Update player stats
    async updatePlayerStats(playerId, statsUpdate) {
        try {
            const player = await Player.findById(playerId);
            if (!player) {
                throw new Error('Player not found');
            }

            // Apply stat updates
            Object.assign(player, statsUpdate);
            await player.save();

            // Update cache
            this.invalidatePlayerCache(player.user_id, player.guild_id);
            
            return player;
        } catch (error) {
            console.error('Error updating player stats:', error);
            throw error;
        }
    }

    // Add experience with level calculation
    async addExperience(playerId, amount, reason = 'Unknown') {
        try {
            const player = await Player.findById(playerId);
            if (!player) {
                throw new Error('Player not found');
            }

            const initialLevel = player.level;
            const leveledUp = await player.addExperience(amount);

            // Log experience gain
            console.log(`[PLAYER] ${player.character_name} gained ${amount} XP (${reason})`);

            if (leveledUp) {
                console.log(`[PLAYER] ${player.character_name} leveled up to ${player.level}!`);
                
                // Invalidate cache
                this.invalidatePlayerCache(player.user_id, player.guild_id);
            }

            return {
                leveledUp,
                previousLevel: initialLevel,
                newLevel: player.level,
                totalExperience: player.experience
            };
        } catch (error) {
            console.error('Error adding experience:', error);
            throw error;
        }
    }

    // Get player's combat power
    calculateCombatPower(player) {
        const basePower = player.strength + player.agility + player.durability + player.intelligence;
        const levelBonus = player.level * 2;
        const equipmentBonus = 0; // TODO: Implement equipment system
        
        return basePower + levelBonus + equipmentBonus;
    }

    // Get player's total wealth
    calculateTotalWealth(player) {
        return player.gold + (player.bounty * 0.1); // Bounty contributes 10% to wealth
    }

    // Get player rank in guild
    async getPlayerRank(playerId, guildId) {
        try {
            const result = await query(`
                WITH ranked_players AS (
                    SELECT id, character_name, level, experience, bounty,
                           ROW_NUMBER() OVER (ORDER BY level DESC, experience DESC, bounty DESC) as rank
                    FROM players 
                    WHERE guild_id = $1
                )
                SELECT rank FROM ranked_players WHERE id = $2
            `, [guildId, playerId]);

            return result.rows.length > 0 ? parseInt(result.rows[0].rank) : null;
        } catch (error) {
            console.error('Error getting player rank:', error);
            return null;
        }
    }

    // Get players by faction in guild
    async getPlayersByFaction(guildId, faction) {
        try {
            const result = await query(`
                SELECT * FROM players 
                WHERE guild_id = $1 AND faction = $2
                ORDER BY level DESC, experience DESC
            `, [guildId, faction]);

            return result.rows.map(row => new Player(row));
        } catch (error) {
            console.error('Error getting players by faction:', error);
            return [];
        }
    }

    // Get top players by criteria
    async getTopPlayers(guildId, criteria = 'level', limit = 10) {
        try {
            let orderBy;
            switch (criteria) {
                case 'bounty':
                    orderBy = 'bounty DESC, level DESC';
                    break;
                case 'gold':
                    orderBy = 'gold DESC, level DESC';
                    break;
                case 'level':
                default:
                    orderBy = 'level DESC, experience DESC, bounty DESC';
                    break;
            }

            const result = await query(`
                SELECT * FROM players 
                WHERE guild_id = $1
                ORDER BY ${orderBy}
                LIMIT $2
            `, [guildId, limit]);

            return result.rows.map(row => new Player(row));
        } catch (error) {
            console.error('Error getting top players:', error);
            return [];
        }
    }

    // Check if player can afford something
    canPlayerAfford(player, cost, type = 'gold') {
        switch (type) {
            case 'gold':
                return player.gold >= cost;
            case 'experience':
                return player.experience >= cost;
            default:
                return false;
        }
    }

    // Deduct cost from player
    async deductCost(playerId, cost, type = 'gold') {
        try {
            const player = await Player.findById(playerId);
            if (!player) {
                throw new Error('Player not found');
            }

            if (!this.canPlayerAfford(player, cost, type)) {
                throw new Error(`Insufficient ${type}`);
            }

            switch (type) {
                case 'gold':
                    player.gold -= cost;
                    break;
                case 'experience':
                    player.experience -= cost;
                    break;
                default:
                    throw new Error('Invalid cost type');
            }

            await player.save();
            this.invalidatePlayerCache(player.user_id, player.guild_id);
            
            return true;
        } catch (error) {
            console.error('Error deducting cost:', error);
            throw error;
        }
    }

    // Get player activity summary
    async getPlayerActivity(playerId, days = 7) {
        try {
            const result = await query(`
                SELECT 
                    COUNT(CASE WHEN pq.status = 'completed' AND pq.completed_at > NOW() - INTERVAL '${days} days' THEN 1 END) as quests_completed,
                    COUNT(CASE WHEN pq.started_at > NOW() - INTERVAL '${days} days' THEN 1 END) as quests_started,
                    (SELECT COUNT(*) FROM player_allies WHERE player_id = $1) as total_allies
                FROM player_quests pq
                WHERE pq.player_id = $1
            `, [playerId]);

            return result.rows[0] || {
                quests_completed: 0,
                quests_started: 0,
                total_allies: 0
            };
        } catch (error) {
            console.error('Error getting player activity:', error);
            return {
                quests_completed: 0,
                quests_started: 0,
                total_allies: 0
            };
        }
    }

    // Get guild statistics
    async getGuildStatistics(guildId) {
        try {
            const result = await query(`
                SELECT 
                    COUNT(*) as total_players,
                    AVG(level) as average_level,
                    MAX(level) as highest_level,
                    SUM(bounty) as total_bounty,
                    COUNT(CASE WHEN faction = 'pirate' THEN 1 END) as pirates,
                    COUNT(CASE WHEN faction = 'marine' THEN 1 END) as marines,
                    COUNT(CASE WHEN faction = 'revolutionary' THEN 1 END) as revolutionaries,
                    COUNT(CASE WHEN faction = 'neutral' THEN 1 END) as neutrals
                FROM players 
                WHERE guild_id = $1
            `, [guildId]);

            return result.rows[0] || {
                total_players: 0,
                average_level: 0,
                highest_level: 0,
                total_bounty: 0,
                pirates: 0,
                marines: 0,
                revolutionaries: 0,
                neutrals: 0
            };
        } catch (error) {
            console.error('Error getting guild statistics:', error);
            return {
                total_players: 0,
                average_level: 0,
                highest_level: 0,
                total_bounty: 0,
                pirates: 0,
                marines: 0,
                revolutionaries: 0,
                neutrals: 0
            };
        }
    }

    // Calculate experience needed for next level
    getExperienceToNextLevel(player) {
        const requiredXP = Math.floor(XP_REQUIREMENTS.BASE_XP * Math.pow(XP_REQUIREMENTS.MULTIPLIER, player.level - 1));
        return Math.max(0, requiredXP - player.experience);
    }

    // Get recommended quests for player
    async getRecommendedQuests(playerId) {
        try {
            const player = await Player.findById(playerId);
            if (!player) {
                return [];
            }

            // Get quests that match player's level and haven't been completed
            const result = await query(`
                SELECT q.* FROM quests q
                LEFT JOIN player_quests pq ON q.id = pq.quest_id AND pq.player_id = $1
                WHERE pq.id IS NULL
                AND (q.min_level IS NULL OR q.min_level <= $2)
                AND (q.max_level IS NULL OR q.max_level >= $2)
                AND (q.faction_requirement IS NULL OR q.faction_requirement = $3)
                AND (q.location IS NULL OR q.location = $4)
                ORDER BY 
                    CASE WHEN q.is_main_story THEN 0 ELSE 1 END,
                    q.difficulty,
                    q.min_level
                LIMIT 5
            `, [playerId, player.level, player.faction, player.location]);

            return result.rows;
        } catch (error) {
            console.error('Error getting recommended quests:', error);
            return [];
        }
    }

    // Invalidate player cache
    invalidatePlayerCache(userId, guildId) {
        const cacheKey = `${userId}_${guildId}`;
        this.playerCache.delete(cacheKey);
    }

    // Clear all cache
    clearCache() {
        this.playerCache.clear();
    }

    // Clean up expired cache entries
    cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, cached] of this.playerCache) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.playerCache.delete(key);
            }
        }
    }

    // Start periodic cache cleanup
    startPeriodicCleanup() {
        // Clean up every 10 minutes
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 10 * 60 * 1000);

        console.log('[PLAYER] Started periodic cache cleanup');
    }

    // Get cache statistics
    getCacheStatistics() {
        return {
            cachedPlayers: this.playerCache.size,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Export singleton instance
module.exports = new PlayerManager();
