class BaseQuest {
    constructor(questData) {
        this.id = questData.id;
        this.name = questData.name;
        this.description = questData.description;
        this.arc = questData.arc;
        this.requirements = questData.requirements || {};
        this.rewards = questData.rewards || {};
        this.difficulty = questData.difficulty || 1;
        this.steps = questData.steps || [];
        this.currentStep = 0;
    }

    // Initialize quest for a player
    async initialize(playerId) {
        this.currentStep = 0;
        this.progress = {
            step: 0,
            data: {},
            started_at: new Date().toISOString()
        };
        return this.progress;
    }

    // Continue quest progression
    async continue(playerId, interaction) {
        const currentQuestStep = this.steps[this.currentStep];
        
        if (!currentQuestStep) {
            return {
                completed: true,
                message: 'Quest completed successfully!'
            };
        }

        // Execute the current step
        const stepResult = await this.executeStep(currentQuestStep, playerId, interaction);
        
        if (stepResult.success) {
            this.currentStep++;
            
            // Check if quest is completed
            if (this.currentStep >= this.steps.length) {
                return {
                    completed: true,
                    message: stepResult.message || 'Quest completed successfully!',
                    finalStep: true
                };
            } else {
                return {
                    completed: false,
                    message: stepResult.message || 'Step completed! Continue your quest...',
                    nextStep: this.steps[this.currentStep]
                };
            }
        } else {
            return {
                completed: false,
                message: stepResult.message || 'Quest step failed. Try again.',
                retry: true
            };
        }
    }

    // Execute a specific quest step
    async executeStep(step, playerId, interaction) {
        switch (step.type) {
            case 'dialogue':
                return this.handleDialogue(step, playerId, interaction);
            case 'combat':
                return this.handleCombat(step, playerId, interaction);
            case 'choice':
                return this.handleChoice(step, playerId, interaction);
            case 'exploration':
                return this.handleExploration(step, playerId, interaction);
            case 'collection':
                return this.handleCollection(step, playerId, interaction);
            default:
                return {
                    success: true,
                    message: step.description || 'Unknown quest step completed.'
                };
        }
    }

    // Handle dialogue steps
    async handleDialogue(step, playerId, interaction) {
        return {
            success: true,
            message: step.dialogue || step.description
        };
    }

    // Handle combat steps
    async handleCombat(step, playerId, interaction) {
        const CombatManager = require('../systems/CombatManager');
        const Player = require('../database/models/Player');
        
        const player = await Player.findById(playerId);
        const enemy = step.enemy;
        
        // Simplified combat - player wins if their total stats are high enough
        const playerPower = player.strength + player.agility + player.durability + player.intelligence;
        const enemyPower = enemy.power || step.difficulty * 10;
        
        const success = playerPower >= enemyPower || Math.random() < 0.7; // 70% base success rate
        
        if (success) {
            // Give combat XP
            const xpGain = step.difficulty * 25;
            await player.addExperience(xpGain);
            
            return {
                success: true,
                message: `You defeated ${enemy.name}! You gained ${xpGain} experience.`
            };
        } else {
            return {
                success: false,
                message: `You were defeated by ${enemy.name}. Train more and try again!`
            };
        }
    }

    // Handle choice steps
    async handleChoice(step, playerId, interaction) {
        // For now, automatically succeed with first choice
        // In a full implementation, this would present options to the user
        const choice = step.choices[0];
        
        return {
            success: true,
            message: `You chose: ${choice.text}. ${choice.result || ''}`
        };
    }

    // Handle exploration steps
    async handleExploration(step, playerId, interaction) {
        const Player = require('../database/models/Player');
        const player = await Player.findById(playerId);
        
        // Simple exploration - success based on intelligence
        const success = player.intelligence >= step.intelligence_required || Math.random() < 0.8;
        
        if (success) {
            return {
                success: true,
                message: step.success_message || `You successfully explored ${step.location}.`
            };
        } else {
            return {
                success: false,
                message: step.failure_message || `You got lost exploring ${step.location}. Try again!`
            };
        }
    }

    // Handle collection steps
    async handleCollection(step, playerId, interaction) {
        // Simulate finding items
        const found = Math.random() < (step.find_chance || 0.8);
        
        if (found) {
            return {
                success: true,
                message: `You found ${step.item}! ${step.description || ''}`
            };
        } else {
            return {
                success: false,
                message: `You couldn't find ${step.item}. Keep searching!`
            };
        }
    }

    // Check if player meets quest requirements
    canPlayerAccept(player) {
        // Check level requirements
        if (this.requirements.min_level && player.level < this.requirements.min_level) {
            return false;
        }
        
        if (this.requirements.max_level && player.level > this.requirements.max_level) {
            return false;
        }
        
        // Check location requirement
        if (this.requirements.location && player.location !== this.requirements.location) {
            return false;
        }
        
        // Check faction requirement
        if (this.requirements.faction && player.faction !== this.requirements.faction) {
            return false;
        }
        
        // Check race requirement
        if (this.requirements.race && player.race !== this.requirements.race) {
            return false;
        }
        
        // Check completed quest requirements
        if (this.requirements.completed_quests) {
            // This would check if player has completed required quests
            // For now, assume they have
        }
        
        return true;
    }

    // Get quest progress data
    getProgressData() {
        return {
            currentStep: this.currentStep,
            totalSteps: this.steps.length,
            progress: this.progress || {}
        };
    }

    // Save quest progress to database
    async saveProgress(playerId) {
        const { query } = require('../config/database');
        
        await query(`
            UPDATE player_quests 
            SET progress = $3
            WHERE player_id = $1 AND quest_id = $2
        `, [playerId, this.id, JSON.stringify(this.getProgressData())]);
    }

    // Load quest progress from database
    async loadProgress(playerId) {
        const { query } = require('../config/database');
        
        const result = await query(`
            SELECT progress FROM player_quests
            WHERE player_id = $1 AND quest_id = $2
        `, [playerId, this.id]);

        if (result.rows.length > 0) {
            const progressData = JSON.parse(result.rows[0].progress || '{}');
            this.currentStep = progressData.currentStep || 0;
            this.progress = progressData.progress || {};
        }
    }
}

module.exports = BaseQuest;
