const { query } = require('../../config/database');
const { QUEST_STATUS } = require('../../config/constants');

class Quest {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.arc = data.arc;
        this.requirements = data.requirements;
        this.rewards = data.rewards;
        this.difficulty = data.difficulty;
        this.max_level = data.max_level;
        this.min_level = data.min_level;
        this.location = data.location;
        this.faction_requirement = data.faction_requirement;
        this.race_requirement = data.race_requirement;
        this.origin_requirement = data.origin_requirement;
        this.is_daily = data.is_daily || false;
        this.is_main_story = data.is_main_story || false;
        this.created_at = data.created_at;
    }

    static async create(questData) {
        const result = await query(`
            INSERT INTO quests (
                name, description, arc, requirements, rewards, difficulty,
                max_level, min_level, location, faction_requirement,
                race_requirement, origin_requirement, is_daily, is_main_story
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [
            questData.name,
            questData.description,
            questData.arc,
            JSON.stringify(questData.requirements || {}),
            JSON.stringify(questData.rewards || {}),
            questData.difficulty,
            questData.max_level,
            questData.min_level,
            questData.location,
            questData.faction_requirement,
            questData.race_requirement,
            questData.origin_requirement,
            questData.is_daily || false,
            questData.is_main_story || false
        ]);

        return new Quest(result.rows[0]);
    }

    static async findById(id) {
        const result = await query('SELECT * FROM quests WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        
        const quest = new Quest(result.rows[0]);
        quest.requirements = typeof quest.requirements === 'string' 
            ? JSON.parse(quest.requirements) 
            : quest.requirements;
        quest.rewards = typeof quest.rewards === 'string' 
            ? JSON.parse(quest.rewards) 
            : quest.rewards;
        
        return quest;
    }

    static async findByArc(arc) {
        const result = await query('SELECT * FROM quests WHERE arc = $1 ORDER BY id', [arc]);
        return result.rows.map(row => {
            const quest = new Quest(row);
            quest.requirements = typeof quest.requirements === 'string' 
                ? JSON.parse(quest.requirements) 
                : quest.requirements;
            quest.rewards = typeof quest.rewards === 'string' 
                ? JSON.parse(quest.rewards) 
                : quest.rewards;
            return quest;
        });
    }

    static async getAvailableQuests(player) {
        const result = await query(`
            SELECT q.* FROM quests q
            LEFT JOIN player_quests pq ON q.id = pq.quest_id AND pq.player_id = $1
            WHERE pq.id IS NULL
            AND (q.min_level <= $2 OR q.min_level IS NULL)
            AND (q.max_level >= $2 OR q.max_level IS NULL)
            AND (q.location = $3 OR q.location IS NULL)
            AND (q.faction_requirement = $4 OR q.faction_requirement IS NULL)
            AND (q.race_requirement = $5 OR q.race_requirement IS NULL)
            AND (q.origin_requirement = $6 OR q.origin_requirement IS NULL)
            ORDER BY q.difficulty, q.min_level
        `, [
            player.id,
            player.level,
            player.location,
            player.faction,
            player.race,
            player.origin
        ]);

        return result.rows.map(row => {
            const quest = new Quest(row);
            quest.requirements = typeof quest.requirements === 'string' 
                ? JSON.parse(quest.requirements) 
                : quest.requirements;
            quest.rewards = typeof quest.rewards === 'string' 
                ? JSON.parse(quest.rewards) 
                : quest.rewards;
            return quest;
        });
    }

    static async getDailyQuests(player) {
        const result = await query(`
            SELECT q.* FROM quests q
            LEFT JOIN player_quests pq ON q.id = pq.quest_id 
                AND pq.player_id = $1 
                AND DATE(pq.started_at) = CURRENT_DATE
            WHERE q.is_daily = true
            AND pq.id IS NULL
            AND (q.min_level <= $2 OR q.min_level IS NULL)
            AND (q.max_level >= $2 OR q.max_level IS NULL)
            ORDER BY RANDOM()
            LIMIT 3
        `, [player.id, player.level]);

        return result.rows.map(row => {
            const quest = new Quest(row);
            quest.requirements = typeof quest.requirements === 'string' 
                ? JSON.parse(quest.requirements) 
                : quest.requirements;
            quest.rewards = typeof quest.rewards === 'string' 
                ? JSON.parse(quest.rewards) 
                : quest.rewards;
            return quest;
        });
    }

    canPlayerAccept(player) {
        // Check level requirements
        if (this.min_level && player.level < this.min_level) return false;
        if (this.max_level && player.level > this.max_level) return false;
        
        // Check location requirement
        if (this.location && player.location !== this.location) return false;
        
        // Check faction requirement
        if (this.faction_requirement && player.faction !== this.faction_requirement) return false;
        
        // Check race requirement
        if (this.race_requirement && player.race !== this.race_requirement) return false;
        
        // Check origin requirement
        if (this.origin_requirement && player.origin !== this.origin_requirement) return false;
        
        return true;
    }

    async startForPlayer(playerId) {
        const result = await query(`
            INSERT INTO player_quests (player_id, quest_id, status, started_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *
        `, [playerId, this.id, QUEST_STATUS.IN_PROGRESS]);

        return result.rows[0];
    }

    async completeForPlayer(playerId) {
        const result = await query(`
            UPDATE player_quests 
            SET status = $3, completed_at = CURRENT_TIMESTAMP
            WHERE player_id = $1 AND quest_id = $2
            RETURNING *
        `, [playerId, this.id, QUEST_STATUS.COMPLETED]);

        return result.rows[0];
    }

    async getPlayerProgress(playerId) {
        const result = await query(`
            SELECT * FROM player_quests
            WHERE player_id = $1 AND quest_id = $2
        `, [playerId, this.id]);

        return result.rows[0] || null;
    }
}

module.exports = Quest;
