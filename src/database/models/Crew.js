const { query, transaction } = require('../../config/database');
const { CREW_ROLES } = require('../../config/constants');

class Crew {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.captain_id = data.captain_id;
        this.motto = data.motto;
        this.flag = data.flag;
        this.bounty = data.bounty || 0;
        this.reputation = data.reputation || 0;
        this.ship_id = data.ship_id;
        this.location = data.location;
        this.member_count = data.member_count || 1;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async create(crewData) {
        return await transaction(async (client) => {
            // Create crew
            const crewResult = await client.query(`
                INSERT INTO crews (name, captain_id, motto, flag, location)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [
                crewData.name,
                crewData.captain_id,
                crewData.motto,
                crewData.flag || 'default',
                crewData.location || 'shells_town'
            ]);

            const crew = new Crew(crewResult.rows[0]);

            // Add captain as member
            await client.query(`
                INSERT INTO crew_members (crew_id, player_id, role, joined_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `, [crew.id, crewData.captain_id, CREW_ROLES.CAPTAIN]);

            // Update player's crew_id
            await client.query(`
                UPDATE players SET crew_id = $1 WHERE id = $2
            `, [crew.id, crewData.captain_id]);

            return crew;
        });
    }

    static async findById(id) {
        const result = await query('SELECT * FROM crews WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return new Crew(result.rows[0]);
    }

    static async findByCaptain(captainId) {
        const result = await query('SELECT * FROM crews WHERE captain_id = $1', [captainId]);
        if (result.rows.length === 0) return null;
        return new Crew(result.rows[0]);
    }

    static async findByName(name, guildId) {
        const result = await query(`
            SELECT c.* FROM crews c
            JOIN players p ON c.captain_id = p.id
            WHERE c.name = $1 AND p.guild_id = $2
        `, [name, guildId]);
        if (result.rows.length === 0) return null;
        return new Crew(result.rows[0]);
    }

    async getMembers() {
        const result = await query(`
            SELECT cm.*, p.character_name, p.level, p.bounty, p.race, p.faction
            FROM crew_members cm
            JOIN players p ON cm.player_id = p.id
            WHERE cm.crew_id = $1
            ORDER BY 
                CASE cm.role
                    WHEN 'captain' THEN 1
                    WHEN 'first_mate' THEN 2
                    ELSE 3
                END,
                cm.joined_at
        `, [this.id]);

        return result.rows;
    }

    async getMember(playerId) {
        const result = await query(`
            SELECT cm.*, p.character_name, p.level, p.bounty
            FROM crew_members cm
            JOIN players p ON cm.player_id = p.id
            WHERE cm.crew_id = $1 AND cm.player_id = $2
        `, [this.id, playerId]);

        return result.rows[0] || null;
    }

    async addMember(playerId, role = CREW_ROLES.FIGHTER) {
        return await transaction(async (client) => {
            // Check if crew is full (max 20 members)
            const countResult = await client.query(
                'SELECT COUNT(*) FROM crew_members WHERE crew_id = $1',
                [this.id]
            );
            
            if (parseInt(countResult.rows[0].count) >= 20) {
                throw new Error('Crew is at maximum capacity (20 members)');
            }

            // Add member
            const result = await client.query(`
                INSERT INTO crew_members (crew_id, player_id, role, joined_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                RETURNING *
            `, [this.id, playerId, role]);

            // Update player's crew_id
            await client.query(`
                UPDATE players SET crew_id = $1 WHERE id = $2
            `, [this.id, playerId]);

            // Update crew member count
            await client.query(`
                UPDATE crews SET 
                    member_count = (SELECT COUNT(*) FROM crew_members WHERE crew_id = $1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [this.id]);

            return result.rows[0];
        });
    }

    async removeMember(playerId) {
        return await transaction(async (client) => {
            // Check if member exists and is not captain
            const member = await this.getMember(playerId);
            if (!member) {
                throw new Error('Player is not a member of this crew');
            }
            if (member.role === CREW_ROLES.CAPTAIN) {
                throw new Error('Captain cannot be removed from crew');
            }

            // Remove member
            await client.query(`
                DELETE FROM crew_members 
                WHERE crew_id = $1 AND player_id = $2
            `, [this.id, playerId]);

            // Update player's crew_id
            await client.query(`
                UPDATE players SET crew_id = NULL WHERE id = $1
            `, [playerId]);

            // Update crew member count
            await client.query(`
                UPDATE crews SET 
                    member_count = (SELECT COUNT(*) FROM crew_members WHERE crew_id = $1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [this.id]);
        });
    }

    async updateMemberRole(playerId, newRole) {
        // Validate role
        if (!Object.values(CREW_ROLES).includes(newRole)) {
            throw new Error('Invalid crew role');
        }

        // Cannot change captain role
        if (newRole === CREW_ROLES.CAPTAIN) {
            throw new Error('Cannot assign captain role through this method');
        }

        const result = await query(`
            UPDATE crew_members 
            SET role = $3, updated_at = CURRENT_TIMESTAMP
            WHERE crew_id = $1 AND player_id = $2
            RETURNING *
        `, [this.id, playerId, newRole]);

        return result.rows[0];
    }

    async save() {
        const result = await query(`
            UPDATE crews SET
                name = $2,
                motto = $3,
                flag = $4,
                bounty = $5,
                reputation = $6,
                ship_id = $7,
                location = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [
            this.id,
            this.name,
            this.motto,
            this.flag,
            this.bounty,
            this.reputation,
            this.ship_id,
            this.location
        ]);

        Object.assign(this, result.rows[0]);
        return this;
    }

    async addBounty(amount) {
        this.bounty += amount;
        await this.save();
    }

    async getShip() {
        if (!this.ship_id) return null;
        
        const result = await query('SELECT * FROM ships WHERE id = $1', [this.ship_id]);
        return result.rows[0] || null;
    }

    static async getTopCrews(guildId, limit = 10) {
        const result = await query(`
            SELECT c.name, c.bounty, c.reputation, c.member_count,
                   p.character_name as captain_name
            FROM crews c
            JOIN players p ON c.captain_id = p.id
            WHERE p.guild_id = $1
            ORDER BY c.bounty DESC, c.reputation DESC
            LIMIT $2
        `, [guildId, limit]);

        return result.rows;
    }

    async delete() {
        return await transaction(async (client) => {
            // Remove all members
            await client.query(`
                UPDATE players SET crew_id = NULL 
                WHERE crew_id = $1
            `, [this.id]);

            // Delete crew members records
            await client.query(`
                DELETE FROM crew_members WHERE crew_id = $1
            `, [this.id]);

            // Delete crew
            await client.query(`
                DELETE FROM crews WHERE id = $1
            `, [this.id]);
        });
    }
}

module.exports = Crew;
