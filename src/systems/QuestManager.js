const Quest = require('../database/models/Quest');
const Player = require('../database/models/Player');
const { createQuestInstance, initializeQuestRegistry } = require('../quests');
const { query } = require('../config/database');
const { QUEST_STATUS } = require('../config/constants');

class QuestManager {
    constructor() {
        this.activeQuestSessions = new Map(); // Store active quest sessions
        this.questInstances = new Map(); // Cache quest instances
        
        // Initialize quest registry on startup
        initializeQuestRegistry();
    }

    // Initialize a quest for a player
    async initializeQuest(playerId, questId) {
        try {
            // Get quest data from database
            const quest = await Quest.findById(questId);
            if (!quest) {
                throw new Error('Quest not found');
            }

            // Create quest instance
            const questInstance = await createQuestInstance(questId, quest);
            
            // Initialize quest progress
            const progress = await questInstance.initialize(playerId);
            
            // Store quest instance and progress
            const sessionKey = `${playerId}_${questId}`;
            this.activeQuestSessions.set(sessionKey, {
                questInstance,
                progress,
                playerId,
                questId,
                startedAt: new Date()
            });

            // Update database with initial progress
            await this.saveQuestProgress(playerId, questId, progress);

            return questInstance;
        } catch (error) {
            console.error('Error initializing quest:', error);
            throw error;
        }
    }

    // Continue a quest for a player
    async continueQuest(playerId, questId, interaction) {
        try {
            const sessionKey = `${playerId}_${questId}`;
            let session = this.activeQuestSessions.get(sessionKey);

            // If no active session, try to load from database
            if (!session) {
                const quest = await Quest.findById(questId);
                if (!quest) {
                    throw new Error('Quest not found');
                }

                const questInstance = await createQuestInstance(questId, quest);
                await questInstance.loadProgress(playerId);

                session = {
                    questInstance,
                    progress: questInstance.getProgressData(),
                    playerId,
                    questId,
                    startedAt: new Date()
                };
                
                this.activeQuestSessions.set(sessionKey, session);
            }

            // Continue the quest
            const result = await session.questInstance.continue(playerId, interaction);
            
            // Update progress
            session.progress = session.questInstance.getProgressData();
            
            // Save progress to database
            await this.saveQuestProgress(playerId, questId, session.progress);

            // If quest completed, clean up session
            if (result.completed) {
                this.activeQuestSessions.delete(sessionKey);
            }

            return result;
        } catch (error) {
            console.error('Error continuing quest:', error);
            throw error;
        }
    }

    // Get active quest session
    getActiveQuestSession(playerId, questId) {
        const sessionKey = `${playerId}_${questId}`;
        return this.activeQuestSessions.get(sessionKey);
    }

    // Save quest progress to database
    async saveQuestProgress(playerId, questId, progress) {
        try {
            await query(`
                UPDATE player_quests 
                SET progress = $3, updated_at = CURRENT_TIMESTAMP
                WHERE player_id = $1 AND quest_id = $2
            `, [playerId, questId, JSON.stringify(progress)]);
        } catch (error) {
            console.error('Error saving quest progress:', error);
            throw error;
        }
    }

    // Load quest progress from database
    async loadQuestProgress(playerId, questId) {
        try {
            const result = await query(`
                SELECT progress FROM player_quests
                WHERE player_id = $1 AND quest_id = $2 AND status = $3
            `, [playerId, questId, QUEST_STATUS.IN_PROGRESS]);

            if (result.rows.length > 0) {
                return JSON.parse(result.rows[0].progress || '{}');
            }

            return null;
        } catch (error) {
            console.error('Error loading quest progress:', error);
            return null;
        }
    }

    // Complete a quest
    async completeQuest(playerId, questId) {
        try {
            const sessionKey = `${playerId}_${questId}`;
            
            // Mark quest as completed in database
            await query(`
                UPDATE player_quests 
                SET status = $3, completed_at = CURRENT_TIMESTAMP
                WHERE player_id = $1 AND quest_id = $2
            `, [playerId, questId, QUEST_STATUS.COMPLETED]);

            // Remove active session
            this.activeQuestSessions.delete(sessionKey);

            return true;
        } catch (error) {
            console.error('Error completing quest:', error);
            throw error;
        }
    }

    // Abandon a quest
    async abandonQuest(playerId, questId) {
        try {
            const sessionKey = `${playerId}_${questId}`;
            
            // Remove quest from database
            await query(`
                DELETE FROM player_quests 
                WHERE player_id = $1 AND quest_id = $2
            `, [playerId, questId]);

            // Remove active session
            this.activeQuestSessions.delete(sessionKey);

            return true;
        } catch (error) {
            console.error('Error abandoning quest:', error);
            throw error;
        }
    }

    // Get player's active quests with progress
    async getPlayerActiveQuests(playerId) {
        try {
            const result = await query(`
                SELECT pq.*, q.name, q.description, q.arc, q.difficulty
                FROM player_quests pq
                JOIN quests q ON pq.quest_id = q.id
                WHERE pq.player_id = $1 AND pq.status = $2
                ORDER BY pq.started_at DESC
            `, [playerId, QUEST_STATUS.IN_PROGRESS]);

            return result.rows.map(row => ({
                ...row,
                progress: typeof row.progress === 'string' ? JSON.parse(row.progress) : row.progress
            }));
        } catch (error) {
            console.error('Error getting player active quests:', error);
            return [];
        }
    }

    // Get player's completed quests
    async getPlayerCompletedQuests(playerId) {
        try {
            const result = await query(`
                SELECT pq.*, q.name, q.description, q.arc, q.difficulty
                FROM player_quests pq
                JOIN quests q ON pq.quest_id = q.id
                WHERE pq.player_id = $1 AND pq.status = $2
                ORDER BY pq.completed_at DESC
            `, [playerId, QUEST_STATUS.COMPLETED]);

            return result.rows;
        } catch (error) {
            console.error('Error getting player completed quests:', error);
            return [];
        }
    }

    // Check if player has completed a specific quest
    async hasPlayerCompletedQuest(playerId, questId) {
        try {
            const result = await query(`
                SELECT id FROM player_quests
                WHERE player_id = $1 AND quest_id = $2 AND status = $3
            `, [playerId, questId, QUEST_STATUS.COMPLETED]);

            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking quest completion:', error);
            return false;
        }
    }

    // Get available quests for a player based on requirements
    async getAvailableQuestsForPlayer(playerId) {
        try {
            const player = await Player.findById(playerId);
            if (!player) {
                return [];
            }

            return await Quest.getAvailableQuests(player);
        } catch (error) {
            console.error('Error getting available quests:', error);
            return [];
        }
    }

    // Clean up expired quest sessions (call periodically)
    cleanupExpiredSessions() {
        const now = new Date();
        const expiredTime = 30 * 60 * 1000; // 30 minutes

        for (const [sessionKey, session] of this.activeQuestSessions) {
            if (now - session.startedAt > expiredTime) {
                console.log(`[QUEST] Cleaning up expired session: ${sessionKey}`);
                this.activeQuestSessions.delete(sessionKey);
            }
        }
    }

    // Start periodic cleanup
    startPeriodicCleanup() {
        // Clean up every 10 minutes
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 10 * 60 * 1000);

        console.log('[QUEST] Started periodic session cleanup');
    }

    // Get quest statistics
    async getQuestStatistics(guildId) {
        try {
            const result = await query(`
                SELECT 
                    COUNT(CASE WHEN pq.status = 'in_progress' THEN 1 END) as active_quests,
                    COUNT(CASE WHEN pq.status = 'completed' THEN 1 END) as completed_quests,
                    COUNT(DISTINCT pq.player_id) as active_players,
                    COUNT(DISTINCT q.arc) as active_arcs
                FROM player_quests pq
                JOIN quests q ON pq.quest_id = q.id
                JOIN players p ON pq.player_id = p.id
                WHERE p.guild_id = $1
            `, [guildId]);

            return result.rows[0] || {
                active_quests: 0,
                completed_quests: 0,
                active_players: 0,
                active_arcs: 0
            };
        } catch (error) {
            console.error('Error getting quest statistics:', error);
            return {
                active_quests: 0,
                completed_quests: 0,
                active_players: 0,
                active_arcs: 0
            };
        }
    }
}

// Export singleton instance
module.exports = new QuestManager();
