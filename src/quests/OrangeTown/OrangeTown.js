const BaseQuest = require('../BaseQuest');

class OrangeTownQuest extends BaseQuest {
    constructor(questData) {
        super(questData);
        
        // Define Orange Town arc specific steps
        this.steps = [
            {
                type: 'dialogue',
                dialogue: 'You arrive at Orange Town to find it mostly deserted. The few remaining townspeople hide in their homes, terrorized by the infamous pirate captain Buggy the Clown and his crew.',
                description: 'Investigate the situation in Orange Town'
            },
            {
                type: 'exploration',
                location: 'Orange Town Streets',
                intelligence_required: 2,
                success_message: 'You carefully explore the empty streets and discover Buggy\'s crew has taken over the mayor\'s house.',
                failure_message: 'You make too much noise and attract unwanted attention from Buggy\'s pirates.',
                description: 'Scout the town to learn about Buggy\'s operation'
            },
            {
                type: 'dialogue',
                dialogue: 'You meet Nami, a skilled thief who\'s also after Buggy\'s treasure. "That clown has a map to the Grand Line," she explains. "But more importantly, he\'s terrorizing innocent people for his own amusement."',
                description: 'Encounter with the cat burglar Nami'
            },
            {
                type: 'choice',
                description: 'How do you want to deal with Buggy?',
                choices: [
                    {
                        text: 'Team up with Nami for a strategic approach',
                        result: 'You and Nami devise a plan to outsmart Buggy using cunning and teamwork.'
                    },
                    {
                        text: 'Challenge Buggy to a direct confrontation',
                        result: 'You march straight to Buggy\'s stronghold and challenge him to single combat.'
                    },
                    {
                        text: 'Rally the townspeople to fight back',
                        result: 'You inspire the citizens of Orange Town to stand up against their oppressor.'
                    }
                ]
            },
            {
                type: 'combat',
                enemy: {
                    name: 'Buggy\'s Pirates',
                    power: 12
                },
                description: 'Fight your way through Buggy\'s crew members!'
            },
            {
                type: 'combat',
                enemy: {
                    name: 'Buggy the Clown',
                    power: 25
                },
                description: 'Face the notorious Devil Fruit user Buggy in the final confrontation!'
            },
            {
                type: 'dialogue',
                dialogue: 'With Buggy defeated, Orange Town is free! The mayor emerges from hiding to thank you. "You\'ve given us our home back," he says with tears in his eyes. Nami also seems impressed by your dedication to helping others.',
                description: 'Victory celebration in Orange Town'
            }
        ];
    }

    async executeStep(step, playerId, interaction) {
        const Player = require('../../database/models/Player');
        const player = await Player.findById(playerId);

        switch (step.type) {
            case 'dialogue':
                return await this.handleOrangeTownDialogue(step, player);

            case 'combat':
                return await this.handleOrangeTownCombat(step, player);

            case 'exploration':
                return await this.handleOrangeTownExploration(step, player);

            case 'choice':
                return await this.handleOrangeTownChoice(step, player);

            default:
                return await super.executeStep(step, playerId, interaction);
        }
    }

    async handleOrangeTownDialogue(step, player) {
        // Special dialogue responses based on player faction
        let message = step.dialogue;

        if (step.description === 'Encounter with the cat burglar Nami') {
            if (player.faction === 'pirate') {
                message += '\n\n"Another pirate?" Nami eyes you suspiciously. "Prove you\'re different from Buggy."';
            } else if (player.faction === 'marine') {
                message += '\n\n"A Marine?" Nami looks worried. "Are you here to arrest me or stop Buggy?"';
            } else {
                message += '\n\n"You don\'t look like a pirate or Marine," Nami observes. "Maybe we can trust each other."';
            }
        }

        return {
            success: true,
            message: message
        };
    }

    async handleOrangeTownCombat(step, player) {
        const playerPower = player.strength + player.agility + player.durability;
        const enemyPower = step.enemy.power;
        
        // Apply faction and race bonuses
        let bonus = 0;
        
        // Faction bonuses
        if (player.faction === 'marine' && step.enemy.name.includes('Buggy')) {
            bonus += 3; // Marines have training against pirates
        } else if (player.faction === 'pirate' && step.enemy.name.includes('Buggy')) {
            bonus += 2; // Pirates understand other pirates' tactics
        }

        // Race bonuses
        if (player.race === 'human') {
            bonus += 2; // Human adaptability
        } else if (player.race === 'mink' && step.enemy.name === 'Buggy the Clown') {
            bonus += 4; // Electro is effective against Devil Fruit users
        }

        const totalPlayerPower = playerPower + bonus;
        let success;

        if (step.enemy.name === 'Buggy the Clown') {
            // Buggy is harder, requires more strategy
            success = totalPlayerPower >= enemyPower || Math.random() < 0.6;
        } else {
            // Regular pirates are easier
            success = totalPlayerPower >= enemyPower || Math.random() < 0.8;
        }

        if (success) {
            let xpGain, goldGain, bountyGain = 0;

            if (step.enemy.name === 'Buggy the Clown') {
                // Special rewards for defeating Buggy
                xpGain = 100;
                goldGain = 1000;
                if (player.faction === 'pirate') {
                    bountyGain = 15000000; // 15M berry bounty for defeating another captain
                } else if (player.faction === 'marine') {
                    bountyGain = 0; // Marines don't get bounties
                    goldGain += 500; // Extra reward from Marine headquarters
                }
            } else {
                // Regular crew combat
                xpGain = 40;
                goldGain = 300;
                if (player.faction === 'pirate') {
                    bountyGain = 2000000; // 2M berry bounty
                }
            }

            await player.addExperience(xpGain);
            player.gold += goldGain;
            if (bountyGain > 0) {
                player.bounty += bountyGain;
            }
            await player.save();

            let message = `You defeated ${step.enemy.name}! `;
            
            if (step.enemy.name === 'Buggy the Clown') {
                message += `Buggy's Devil Fruit powers couldn't save him from your determination!\n\n`;
            } else {
                message += `The crew scatters in fear!\n\n`;
            }

            message += `**Rewards:**\n• ${xpGain} Experience\n• 🪙${goldGain} Gold`;
            if (bountyGain > 0) {
                message += `\n• ₿${bountyGain.toLocaleString()} Bounty increase`;
            }

            return {
                success: true,
                message: message
            };
        } else {
            if (step.enemy.name === 'Buggy the Clown') {
                return {
                    success: false,
                    message: `Buggy's Chop-Chop Fruit powers prove too tricky! His body parts scatter and reform as he laughs maniacally. "You can't defeat a man who can't be cut!" Train more and return!`
                };
            } else {
                return {
                    success: false,
                    message: `The pirate crew overwhelms you with their numbers! You retreat to regroup and plan a better strategy.`
                };
            }
        }
    }

    async handleOrangeTownExploration(step, player) {
        const success = player.intelligence >= step.intelligence_required || Math.random() < 0.85;

        if (success) {
            // Give stealth/intelligence bonus
            if (Math.random() < 0.3) { // 30% chance
                player.agility += 1;
                await player.save();
            }

            return {
                success: true,
                message: `${step.success_message}${player.agility ? '\n\n**Bonus:** Your agility increased from sneaking around!' : ''}`
            };
        } else {
            return {
                success: false,
                message: step.failure_message
            };
        }
    }

    async handleOrangeTownChoice(step, player) {
        // Each choice affects the story differently
        const choice = step.choices[0]; // For now, use first choice
        
        // Give different bonuses based on choice
        if (choice.text.includes('Team up with Nami')) {
            // Teamwork bonus
            player.intelligence += 1;
            await player.save();
        } else if (choice.text.includes('direct confrontation')) {
            // Courage bonus
            player.strength += 1;
            await player.save();
        } else if (choice.text.includes('Rally the townspeople')) {
            // Leadership bonus
            player.durability += 1;
            await player.save();
        }

        return {
            success: true,
            message: `${choice.text}: ${choice.result}\n\n**Your choice shaped your character!**`
        };
    }

    // Override initialization for Orange Town specific setup
    async initialize(playerId) {
        const progress = await super.initialize(playerId);
        
        progress.data.nami_trust = 0;
        progress.data.townspeople_saved = 0;
        progress.data.treasure_found = false;

        return progress;
    }
}

module.exports = OrangeTownQuest;
