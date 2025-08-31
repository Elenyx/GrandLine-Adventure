const { query } = require('../../config/database');

class Ally {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.rarity = data.rarity;
        this.buffs = data.buffs;
        this.unlock_condition = data.unlock_condition;
        this.image_url = data.image_url;
        this.faction = data.faction;
        this.origin_arc = data.origin_arc;
        this.created_at = data.created_at;
    }

    static async create(allyData) {
        const result = await query(`
            INSERT INTO allies (
                name, description, rarity, buffs, unlock_condition,
                image_url, faction, origin_arc
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            allyData.name,
            allyData.description,
            allyData.rarity,
            JSON.stringify(allyData.buffs || {}),
            JSON.stringify(allyData.unlock_condition || {}),
            allyData.image_url,
            allyData.faction,
            allyData.origin_arc
        ]);

        const ally = new Ally(result.rows[0]);
        ally.buffs = typeof ally.buffs === 'string' ? JSON.parse(ally.buffs) : ally.buffs;
        ally.unlock_condition = typeof ally.unlock_condition === 'string' 
            ? JSON.parse(ally.unlock_condition) 
            : ally.unlock_condition;
        
        return ally;
    }

    static async findById(id) {
        const result = await query('SELECT * FROM allies WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        
        const ally = new Ally(result.rows[0]);
        ally.buffs = typeof ally.buffs === 'string' ? JSON.parse(ally.buffs) : ally.buffs;
        ally.unlock_condition = typeof ally.unlock_condition === 'string' 
            ? JSON.parse(ally.unlock_condition) 
            : ally.unlock_condition;
        
        return ally;
    }

    static async findByName(name) {
        const result = await query('SELECT * FROM allies WHERE name ILIKE $1', [`%${name}%`]);
        return result.rows.map(row => {
            const ally = new Ally(row);
            ally.buffs = typeof ally.buffs === 'string' ? JSON.parse(ally.buffs) : ally.buffs;
            ally.unlock_condition = typeof ally.unlock_condition === 'string' 
                ? JSON.parse(ally.unlock_condition) 
                : ally.unlock_condition;
            return ally;
        });
    }

    static async getAvailableAllies(player) {
        const result = await query(`
            SELECT a.* FROM allies a
            LEFT JOIN player_allies pa ON a.id = pa.ally_id AND pa.player_id = $1
            WHERE pa.id IS NULL
            ORDER BY a.rarity, a.name
        `, [player.id]);

        return result.rows.map(row => {
            const ally = new Ally(row);
            ally.buffs = typeof ally.buffs === 'string' ? JSON.parse(ally.buffs) : ally.buffs;
            ally.unlock_condition = typeof ally.unlock_condition === 'string' 
                ? JSON.parse(ally.unlock_condition) 
                : ally.unlock_condition;
            return ally;
        }).filter(ally => ally.canPlayerUnlock(player));
    }

    canPlayerUnlock(player) {
        const condition = this.unlock_condition;
        
        // Check level requirement
        if (condition.min_level && player.level < condition.min_level) return false;
        
        // Check faction requirement
        if (condition.required_faction && player.faction !== condition.required_faction) return false;
        
        // Check origin requirement
        if (condition.required_origin && player.origin !== condition.required_origin) return false;
        
        // Check completed quest requirement
        if (condition.required_quest) {
            // This would need to check if player has completed the required quest
            // Implementation depends on how quest completion is tracked
        }
        
        // Check bounty requirement
        if (condition.min_bounty && player.bounty < condition.min_bounty) return false;
        
        return true;
    }

    async recruitForPlayer(playerId, bondLevel = 1) {
        const result = await query(`
            INSERT INTO player_allies (player_id, ally_id, bond_level, recruited_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *
        `, [playerId, this.id, bondLevel]);

        return result.rows[0];
    }

    async getPlayerAllies(playerId) {
        const result = await query(`
            SELECT pa.*, a.name, a.description, a.rarity, a.buffs, a.image_url
            FROM player_allies pa
            JOIN allies a ON pa.ally_id = a.id
            WHERE pa.player_id = $1
            ORDER BY pa.is_active DESC, a.rarity DESC, pa.bond_level DESC
        `, [playerId]);

        return result.rows.map(row => ({
            ...row,
            buffs: typeof row.buffs === 'string' ? JSON.parse(row.buffs) : row.buffs
        }));
    }

    async setActiveForPlayer(playerId, isActive = true) {
        // First, deactivate all other allies if setting this one active
        if (isActive) {
            await query(`
                UPDATE player_allies 
                SET is_active = false 
                WHERE player_id = $1
            `, [playerId]);
        }

        const result = await query(`
            UPDATE player_allies 
            SET is_active = $3
            WHERE player_id = $1 AND ally_id = $2
            RETURNING *
        `, [playerId, this.id, isActive]);

        return result.rows[0];
    }

    async increaseBondLevel(playerId, amount = 1) {
        const result = await query(`
            UPDATE player_allies 
            SET bond_level = bond_level + $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE player_id = $1 AND ally_id = $2
            RETURNING *
        `, [playerId, this.id, amount]);

        return result.rows[0];
    }

    static async getActiveAlly(playerId) {
        const result = await query(`
            SELECT pa.*, a.name, a.description, a.rarity, a.buffs, a.image_url
            FROM player_allies pa
            JOIN allies a ON pa.ally_id = a.id
            WHERE pa.player_id = $1 AND pa.is_active = true
        `, [playerId]);

        if (result.rows.length === 0) return null;
        
        const row = result.rows[0];
        return {
            ...row,
            buffs: typeof row.buffs === 'string' ? JSON.parse(row.buffs) : row.buffs
        };
    }

    getBuffValue(buffType) {
        return this.buffs[buffType] || 0;
    }

    getTotalBuff(bondLevel = 1) {
        const multiplier = 1 + (bondLevel - 1) * 0.1; // 10% increase per bond level
        const totalBuff = {};
        
        for (const [key, value] of Object.entries(this.buffs)) {
            totalBuff[key] = Math.floor(value * multiplier);
        }
        
        return totalBuff;
    }
}

module.exports = Ally;
