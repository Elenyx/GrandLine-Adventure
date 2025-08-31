const Player = require('../database/models/Player');
const { COMBAT_STATS, COLORS } = require('../config/constants');

class CombatManager {
    constructor() {
        this.activeCombats = new Map(); // Store active combat sessions
        this.combatTimeouts = new Map(); // Store combat timeouts
    }

    // Initialize a combat session
    initializeCombat(combatId, participants, type = 'pve') {
        const combat = {
            id: combatId,
            participants,
            type, // 'pve', 'pvp', 'crew_vs_crew'
            currentTurn: 0,
            round: 1,
            status: 'active',
            startedAt: new Date(),
            actions: [],
            environment: {
                weather: 'clear',
                terrain: 'normal'
            }
        };

        this.activeCombats.set(combatId, combat);

        // Set combat timeout (10 minutes)
        const timeout = setTimeout(() => {
            this.endCombat(combatId, 'timeout');
        }, 10 * 60 * 1000);

        this.combatTimeouts.set(combatId, timeout);

        return combat;
    }

    // Get combat session
    getCombat(combatId) {
        return this.activeCombats.get(combatId);
    }

    // Calculate combat stats for a player
    calculateCombatStats(player) {
        const stats = {
            attack: player.strength + Math.floor(player.agility * 0.5),
            defense: player.durability + Math.floor(player.strength * 0.3),
            speed: player.agility + Math.floor(player.intelligence * 0.2),
            accuracy: player.intelligence + Math.floor(player.agility * 0.4),
            health: player.durability * 10 + player.level * 5,
            maxHealth: player.durability * 10 + player.level * 5
        };

        // Apply racial bonuses
        switch (player.race) {
            case 'human':
                stats.attack += 2;
                stats.defense += 2;
                stats.speed += 2;
                stats.accuracy += 2;
                break;
            case 'fishman':
                stats.attack += 5;
                stats.defense += 3;
                stats.health += 20;
                stats.maxHealth += 20;
                break;
            case 'mink':
                stats.speed += 5;
                stats.accuracy += 3;
                stats.attack += 2; // Electro bonus
                break;
            case 'skypiean':
                stats.accuracy += 5;
                stats.speed += 3;
                break;
            case 'giant':
                stats.attack += 8;
                stats.defense += 6;
                stats.health += 50;
                stats.maxHealth += 50;
                stats.speed -= 3;
                break;
        }

        return stats;
    }

    // Execute a combat action
    async executeCombatAction(combatId, participantId, action) {
        const combat = this.getCombat(combatId);
        if (!combat || combat.status !== 'active') {
            throw new Error('Combat not active');
        }

        const participant = combat.participants.find(p => p.id === participantId);
        if (!participant) {
            throw new Error('Participant not found in combat');
        }

        const result = await this.processAction(combat, participant, action);
        
        // Record the action
        combat.actions.push({
            participantId,
            action,
            result,
            round: combat.round,
            timestamp: new Date()
        });

        // Check for combat end conditions
        const endResult = this.checkCombatEnd(combat);
        if (endResult) {
            return await this.endCombat(combatId, endResult.type, endResult.winner);
        }

        // Advance turn
        this.advanceTurn(combat);

        return {
            success: true,
            result,
            combat,
            ended: false
        };
    }

    // Process a specific combat action
    async processAction(combat, actor, action) {
        const actorStats = this.calculateCombatStats(actor);
        
        switch (action.type) {
            case 'attack':
                return await this.processAttack(combat, actor, actorStats, action);
            case 'defend':
                return await this.processDefend(combat, actor, actorStats, action);
            case 'special':
                return await this.processSpecialAction(combat, actor, actorStats, action);
            case 'item':
                return await this.processItemUse(combat, actor, actorStats, action);
            default:
                throw new Error('Invalid action type');
        }
    }

    // Process attack action
    async processAttack(combat, attacker, attackerStats, action) {
        const target = this.getTarget(combat, action.targetId);
        if (!target) {
            throw new Error('Target not found');
        }

        const targetStats = this.calculateCombatStats(target);
        
        // Calculate hit chance
        const hitChance = Math.min(95, Math.max(5, 
            70 + (attackerStats.accuracy - targetStats.speed) * 2
        ));

        const hit = Math.random() * 100 < hitChance;

        if (!hit) {
            return {
                type: 'attack',
                hit: false,
                message: `${attacker.character_name} misses ${target.character_name}!`
            };
        }

        // Calculate damage
        let damage = Math.max(1, attackerStats.attack - Math.floor(targetStats.defense * 0.5));
        
        // Add randomness
        damage = Math.floor(damage * (0.8 + Math.random() * 0.4));

        // Apply damage
        target.currentHealth = Math.max(0, target.currentHealth - damage);

        // Check for critical hit
        const critChance = 5 + Math.floor(attackerStats.speed / 10);
        const critical = Math.random() * 100 < critChance;
        
        if (critical) {
            damage = Math.floor(damage * 1.5);
            target.currentHealth = Math.max(0, target.currentHealth - Math.floor(damage * 0.5));
        }

        return {
            type: 'attack',
            hit: true,
            critical,
            damage,
            targetHealth: target.currentHealth,
            message: `${attacker.character_name} ${critical ? 'critically ' : ''}attacks ${target.character_name} for ${damage} damage!`
        };
    }

    // Process defend action
    async processDefend(combat, defender, defenderStats, action) {
        // Defending reduces incoming damage and builds up defense
        defender.defending = true;
        defender.defenseBonus = Math.floor(defenderStats.defense * 0.3);

        return {
            type: 'defend',
            message: `${defender.character_name} takes a defensive stance!`,
            defenseBonus: defender.defenseBonus
        };
    }

    // Process special action (racial abilities, etc.)
    async processSpecialAction(combat, actor, actorStats, action) {
        switch (actor.race) {
            case 'mink':
                return await this.processElectroAttack(combat, actor, actorStats, action);
            case 'fishman':
                return await this.processFishmanKarate(combat, actor, actorStats, action);
            case 'giant':
                return await this.processGiantSmash(combat, actor, actorStats, action);
            default:
                return await this.processGenericSpecial(combat, actor, actorStats, action);
        }
    }

    // Mink Electro attack
    async processElectroAttack(combat, attacker, attackerStats, action) {
        const target = this.getTarget(combat, action.targetId);
        if (!target) {
            throw new Error('Target not found');
        }

        const targetStats = this.calculateCombatStats(target);
        const damage = Math.floor(attackerStats.attack * 1.2) - Math.floor(targetStats.defense * 0.3);
        const finalDamage = Math.max(1, damage);

        target.currentHealth = Math.max(0, target.currentHealth - finalDamage);

        // Electro has stun chance
        const stunChance = 25;
        const stunned = Math.random() * 100 < stunChance;
        
        if (stunned) {
            target.stunned = true;
        }

        return {
            type: 'special',
            subtype: 'electro',
            damage: finalDamage,
            stunned,
            targetHealth: target.currentHealth,
            message: `${attacker.character_name} unleashes Electro on ${target.character_name}! ${stunned ? 'The target is stunned!' : ''}`
        };
    }

    // Get target by ID
    getTarget(combat, targetId) {
        return combat.participants.find(p => p.id === targetId);
    }

    // Check if combat should end
    checkCombatEnd(combat) {
        const alivePlayers = combat.participants.filter(p => p.currentHealth > 0);
        
        if (alivePlayers.length <= 1) {
            return {
                type: 'defeat',
                winner: alivePlayers[0] || null
            };
        }

        // Check for surrender
        const surrendered = combat.participants.find(p => p.surrendered);
        if (surrendered) {
            return {
                type: 'surrender',
                winner: combat.participants.find(p => p !== surrendered)
            };
        }

        // Check turn limit
        if (combat.round > 50) {
            return {
                type: 'draw',
                winner: null
            };
        }

        return null;
    }

    // End combat session
    async endCombat(combatId, endType, winner = null) {
        const combat = this.getCombat(combatId);
        if (!combat) {
            return null;
        }

        combat.status = 'ended';
        combat.endedAt = new Date();
        combat.endType = endType;
        combat.winner = winner;

        // Clear timeout
        const timeout = this.combatTimeouts.get(combatId);
        if (timeout) {
            clearTimeout(timeout);
            this.combatTimeouts.delete(combatId);
        }

        // Process rewards and penalties
        await this.processCombatRewards(combat);

        // Clean up after 5 minutes
        setTimeout(() => {
            this.activeCombats.delete(combatId);
        }, 5 * 60 * 1000);

        return {
            ended: true,
            combat,
            endType,
            winner
        };
    }

    // Process combat rewards
    async processCombatRewards(combat) {
        try {
            const winner = combat.winner;
            const participants = combat.participants;

            for (const participant of participants) {
                if (participant === winner) {
                    // Winner rewards
                    const xpGain = 25 + (combat.round * 2);
                    const goldGain = 100 + (combat.round * 5);
                    
                    const player = await Player.findById(participant.id);
                    if (player) {
                        await player.addExperience(xpGain);
                        player.gold += goldGain;
                        await player.save();
                    }
                } else {
                    // Participation rewards (smaller)
                    const xpGain = 10;
                    const goldGain = 25;
                    
                    const player = await Player.findById(participant.id);
                    if (player) {
                        await player.addExperience(xpGain);
                        player.gold += goldGain;
                        await player.save();
                    }
                }
            }
        } catch (error) {
            console.error('Error processing combat rewards:', error);
        }
    }

    // Advance combat turn
    advanceTurn(combat) {
        combat.currentTurn++;
        
        if (combat.currentTurn >= combat.participants.length) {
            combat.currentTurn = 0;
            combat.round++;
            
            // Reset temporary effects
            for (const participant of combat.participants) {
                participant.defending = false;
                participant.defenseBonus = 0;
                if (participant.stunned) {
                    participant.stunned = false;
                }
            }
        }
    }

    // Get current turn participant
    getCurrentTurnParticipant(combat) {
        return combat.participants[combat.currentTurn];
    }

    // Get combat statistics
    getCombatStatistics() {
        return {
            activeCombats: this.activeCombats.size,
            activeTimeouts: this.combatTimeouts.size
        };
    }

    // Clean up expired combats
    cleanupExpiredCombats() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes

        for (const [combatId, combat] of this.activeCombats) {
            if (now - combat.startedAt.getTime() > maxAge) {
                console.log(`[COMBAT] Cleaning up expired combat: ${combatId}`);
                this.endCombat(combatId, 'expired');
            }
        }
    }

    // Start periodic cleanup
    startPeriodicCleanup() {
        // Clean up every 15 minutes
        setInterval(() => {
            this.cleanupExpiredCombats();
        }, 15 * 60 * 1000);

        console.log('[COMBAT] Started periodic combat cleanup');
    }
}

// Export singleton instance
module.exports = new CombatManager();
