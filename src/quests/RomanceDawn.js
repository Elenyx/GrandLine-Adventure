const BaseQuest = require('./BaseQuest');

class RomanceDawnQuest extends BaseQuest {
    constructor(questData) {
        super(questData);
        
        // Define Romance Dawn arc specific steps
        this.steps = [
            {
                type: 'dialogue',
                dialogue: 'You arrive at Shells Town, where the corrupt Marine Captain Morgan rules with an iron fist. The townspeople whisper of a young swordsman imprisoned for standing up to injustice.',
                description: 'Learn about the situation in Shells Town'
            },
            {
                type: 'choice',
                description: 'How do you want to handle Captain Morgan?',
                choices: [
                    {
                        text: 'Confront him directly',
                        result: 'You boldly challenge the corrupt captain to a fight.'
                    },
                    {
                        text: 'Gather information first',
                        result: 'You decide to learn more about the situation before acting.'
                    },
                    {
                        text: 'Help the townspeople secretly',
                        result: 'You work behind the scenes to undermine Morgan\'s authority.'
                    }
                ]
            },
            {
                type: 'combat',
                enemy: {
                    name: 'Captain Morgan',
                    power: 15
                },
                description: 'Face the tyrant Captain Morgan in battle!'
            },
            {
                type: 'dialogue',
                dialogue: 'With Captain Morgan defeated, the townspeople are free! The young swordsman, Zoro, thanks you for your help. "You\'re not like the other Marines," he says. "You actually care about justice."',
                description: 'The aftermath of victory'
            },
            {
                type: 'exploration',
                location: 'Marine Base',
                intelligence_required: 3,
                success_message: 'You explore the Marine base and find important documents about corruption in the ranks.',
                failure_message: 'The base is too heavily guarded to explore safely.',
                description: 'Search the Marine base for evidence'
            }
        ];
    }

    async executeStep(step, playerId, interaction) {
        const Player = require('../database/models/Player');
        const player = await Player.findById(playerId);

        switch (step.type) {
            case 'dialogue':
                return {
                    success: true,
                    message: step.dialogue
                };

            case 'choice':
                // In a full implementation, this would present actual choices
                // For now, we'll use the first choice
                const choice = step.choices[0];
                return {
                    success: true,
                    message: `${choice.text}: ${choice.result}`
                };

            case 'combat':
                return this.handleRomanceDawnCombat(step, player);

            case 'exploration':
                return this.handleRomanceDawnExploration(step, player);

            default:
                return await super.executeStep(step, playerId, interaction);
        }
    }

    async handleRomanceDawnCombat(step, player) {
        const playerPower = player.strength + player.agility + player.durability;
        const enemyPower = step.enemy.power;
        
        // Add faction bonus for Marines fighting corrupt Marines
        let bonus = 0;
        if (player.faction === 'marine') {
            bonus = 5; // Marines get bonus against corruption
        } else if (player.faction === 'pirate') {
            bonus = 3; // Pirates are naturally rebellious
        }

        const totalPlayerPower = playerPower + bonus;
        const success = totalPlayerPower >= enemyPower || Math.random() < 0.75;

        if (success) {
            // Special rewards for Romance Dawn
            const xpGain = 50 + (step.enemy.power * 2);
            const goldGain = 200;
            const bountyGain = player.faction === 'pirate' ? 5000000 : 0; // 5M berry bounty for pirates

            await player.addExperience(xpGain);
            player.gold += goldGain;
            if (bountyGain > 0) {
                player.bounty += bountyGain;
            }
            await player.save();

            let message = `You defeated ${step.enemy.name}! The townspeople cheer your victory!\n\n`;
            message += `**Rewards:**\n• ${xpGain} Experience\n• 🪙${goldGain} Gold`;
            if (bountyGain > 0) {
                message += `\n• ₿${bountyGain.toLocaleString()} Bounty (You're now a wanted pirate!)`;
            }

            return {
                success: true,
                message: message
            };
        } else {
            return {
                success: false,
                message: `Captain Morgan's axe-hand proves too much for you! You retreat to fight another day. Train harder and return!`
            };
        }
    }

    async handleRomanceDawnExploration(step, player) {
        const success = player.intelligence >= step.intelligence_required || Math.random() < 0.85;

        if (success) {
            // Grant intelligence bonus for successful exploration
            player.intelligence += 1;
            await player.save();

            return {
                success: true,
                message: `${step.success_message}\n\n**Bonus:** Your intelligence increased by 1 from uncovering secrets!`
            };
        } else {
            return {
                success: false,
                message: step.failure_message
            };
        }
    }

    // Override initialization for Romance Dawn specific setup
    async initialize(playerId) {
        const progress = await super.initialize(playerId);
        
        // Set up Romance Dawn specific progress tracking
        progress.data.allies_met = [];
        progress.data.corruption_evidence = 0;
        progress.data.townspeople_helped = 0;

        return progress;
    }
}

module.exports = RomanceDawnQuest;
