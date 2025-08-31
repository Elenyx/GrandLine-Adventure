const { query, transaction } = require('../../config/database');
const { QUEST_STATUS } = require('../../config/constants');

class Player {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.guild_id = data.guild_id;
        this.character_name = data.character_name;
        this.race = data.race;
        this.origin = data.origin;
        this.dream = data.dream;
        this.faction = data.faction;
        this.level = data.level || 1;
        this.experience = data.experience || 0;
        this.strength = data.strength || 1;
        this.agility = data.agility || 1;
        this.durability = data.durability || 1;
        this.intelligence = data.intelligence || 1;
        this.gold = data.gold || 1000;
        this.bounty = data.bounty || 0;
        this.crew_id = data.crew_id;
        this.ship_id = data.ship_id;
        this.location = data.location || 'shells_town';
        this.active_quest_id = data.active_quest_id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async create(playerData) {
        const result = await query(`
            INSERT INTO players (
                user_id, guild_id, character_name, race, origin, dream, faction,
                level, experience, strength, agility, durability, intelligence,
                gold, bounty, location
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [
            playerData.user_id,
            playerData.guild_id,
            playerData.character_name,
            playerData.race,
            playerData.origin,
            playerData.dream,
            playerData.faction,
            playerData.level || 1,
            playerData.experience || 0,
            playerData.strength || 1,
            playerData.agility || 1,
            playerData.durability || 1,
            playerData.intelligence || 1,
            playerData.gold || 1000,
            playerData.bounty || 0,
            playerData.location || 'shells_town'
        ]);

        return new Player(result.rows[0]);
    }

    static async findByUserId(userId, guildId) {
        const result = await query(
            'SELECT * FROM players WHERE user_id = $1 AND guild_id = $2',
            [userId, guildId]
        );

        if (result.rows.length === 0) return null;
        return new Player(result.rows[0]);
    }

    static async findById(id) {
        const result = await query('SELECT * FROM players WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return new Player(result.rows[0]);
    }

    async save() {
        const result = await query(`
            UPDATE players SET
                character_name = $2,
                race = $3,
                origin = $4,
                dream = $5,
                faction = $6,
                level = $7,
                experience = $8,
                strength = $9,
                agility = $10,
                durability = $11,
                intelligence = $12,
                gold = $13,
                bounty = $14,
                crew_id = $15,
                ship_id = $16,
                location = $17,
                active_quest_id = $18,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [
            this.id,
            this.character_name,
            this.race,
            this.origin,
            this.dream,
            this.faction,
            this.level,
            this.experience,
            this.strength,
            this.agility,
            this.durability,
            this.intelligence,
            this.gold,
            this.bounty,
            this.crew_id,
            this.ship_id,
            this.location,
            this.active_quest_id
        ]);

        const updatedData = result.rows[0];
        Object.assign(this, updatedData);
        return this;
    }

    async addExperience(amount) {
        this.experience += amount;
        
        // Check for level up
        const requiredXP = this.getRequiredXP();
        if (this.experience >= requiredXP && this.level < 100) {
            this.level++;
            this.experience -= requiredXP;
            
            // Stat increases on level up
            this.strength += Math.floor(Math.random() * 2) + 1;
            this.agility += Math.floor(Math.random() * 2) + 1;
            this.durability += Math.floor(Math.random() * 2) + 1;
            this.intelligence += Math.floor(Math.random() * 2) + 1;
            
            await this.save();
            return true; // Level up occurred
        }
        
        await this.save();
        return false; // No level up
    }

    getRequiredXP() {
        return Math.floor(100 * Math.pow(1.5, this.level - 1));
    }

    getTotalStats() {
        return this.strength + this.agility + this.durability + this.intelligence;
    }

    async getActiveQuests() {
        const result = await query(`
            SELECT * FROM player_quests pq
            JOIN quests q ON pq.quest_id = q.id
            WHERE pq.player_id = $1 AND pq.status = $2
        `, [this.id, QUEST_STATUS.IN_PROGRESS]);

        return result.rows;
    }

    async getAllies() {
        const result = await query(`
            SELECT pa.*, a.name, a.description, a.rarity, a.buffs
            FROM player_allies pa
            JOIN allies a ON pa.ally_id = a.id
            WHERE pa.player_id = $1
        `, [this.id]);

        return result.rows;
    }

    static async getLeaderboard(guildId, limit = 10) {
        const result = await query(`
            SELECT character_name, level, experience, bounty, faction
            FROM players
            WHERE guild_id = $1
            ORDER BY level DESC, experience DESC
            LIMIT $2
        `, [guildId, limit]);

        return result.rows;
    }

    async delete() {
        await query('DELETE FROM players WHERE id = $1', [this.id]);
    }
}

module.exports = Player;
