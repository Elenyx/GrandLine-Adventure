const { MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const Player = require('../../database/models/Player');
const Quest = require('../../database/models/Quest');
const QuestManager = require('../../systems/QuestManager');
const { COLORS, QUEST_STATUS } = require('../../config/constants');
const { query } = require('../../config/database');

module.exports = [
    {
        customId: /^quest_start_(\d+)$/,
        async execute(interaction) {
            const questId = parseInt(interaction.customId.match(/^quest_start_(\d+)$/)[1]);
            
            try {
                const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                if (!player) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You need to create a character first!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                const quest = await Quest.findById(questId);
                if (!quest) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ Quest not found!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Check if player can accept the quest
                if (!quest.canPlayerAccept(player)) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You don\'t meet the requirements for this quest!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Check if player already has this quest
                const existingProgress = await quest.getPlayerProgress(player.id);
                if (existingProgress) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You already have this quest!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Check active quest limit
                const activeQuests = await player.getActiveQuests();
                if (activeQuests.length >= 5) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You can only have 5 active quests at a time!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Start the quest
                await quest.startForPlayer(player.id);
                
                // Initialize quest progress in QuestManager
                await QuestManager.initializeQuest(player.id, questId);

                const successContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.SUCCESS)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**✅ Quest Started!**\n*${quest.name}*`),
                        textDisplay => textDisplay
                            .setContent(`${quest.description}\n\n**Arc:** ${quest.arc}\n**Difficulty:** ${'⭐'.repeat(quest.difficulty)}\n\nGood luck on your adventure!`)
                    );

                await interaction.reply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: false
                });

            } catch (error) {
                console.error('Error starting quest:', error);
                await interaction.reply({
                    content: 'There was an error starting the quest!',
                    ephemeral: true
                });
            }
        }
    },
    {
        customId: /^quest_continue_(\d+)$/,
        async execute(interaction) {
            const questId = parseInt(interaction.customId.match(/^quest_continue_(\d+)$/)[1]);
            
            try {
                const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                const quest = await Quest.findById(questId);

                if (!player || !quest) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ Quest or character not found!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Get quest progress
                const progress = await quest.getPlayerProgress(player.id);
                if (!progress || progress.status !== QUEST_STATUS.IN_PROGRESS) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You don\'t have this quest active!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Continue quest through QuestManager
                const result = await QuestManager.continueQuest(player.id, questId, interaction);
                
                if (result.completed) {
                    // Quest completed
                    await quest.completeForPlayer(player.id);
                    
                    // Give rewards
                    if (quest.rewards.experience) {
                        const leveledUp = await player.addExperience(quest.rewards.experience);
                        result.leveledUp = leveledUp;
                    }
                    if (quest.rewards.gold) {
                        player.gold += quest.rewards.gold;
                        await player.save();
                    }
                    if (quest.rewards.bounty) {
                        player.bounty += quest.rewards.bounty;
                        await player.save();
                    }

                    const completionContainer = new ContainerBuilder()
                        .setAccentColor(COLORS.GOLD)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**🎉 Quest Completed! 🎉**\n*${quest.name}*`),
                            textDisplay => textDisplay
                                .setContent(`${result.message}\n\n**Rewards Received:**\n${formatRewards(quest.rewards)}${result.leveledUp ? '\n\n🌟 **LEVEL UP!**' : ''}`)
                        );

                    await interaction.reply({
                        components: [completionContainer],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: false
                    });
                } else {
                    // Quest continues
                    const progressContainer = new ContainerBuilder()
                        .setAccentColor(COLORS.WARNING)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**⚡ ${quest.name}**\n*In Progress...*`),
                            textDisplay => textDisplay
                                .setContent(result.message)
                        );

                    await interaction.reply({
                        components: [progressContainer],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

            } catch (error) {
                console.error('Error continuing quest:', error);
                await interaction.reply({
                    content: 'There was an error continuing the quest!',
                    ephemeral: true
                });
            }
        }
    },
    {
        customId: /^quest_abandon_confirm_(\d+)$/,
        async execute(interaction) {
            const questId = parseInt(interaction.customId.match(/^quest_abandon_confirm_(\d+)$/)[1]);
            
            try {
                const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                
                // Remove quest from player
                await query(`
                    DELETE FROM player_quests 
                    WHERE player_id = $1 AND quest_id = $2
                `, [player.id, questId]);

                const quest = await Quest.findById(questId);
                
                const abandonContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.ERROR)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**❌ Quest Abandoned**\n*${quest?.name || 'Unknown Quest'}*`),
                        textDisplay => textDisplay
                            .setContent('You have abandoned this quest. All progress has been lost.\n\nYou can start it again later if you meet the requirements.')
                    );

                await interaction.reply({
                    components: [abandonContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });

            } catch (error) {
                console.error('Error abandoning quest:', error);
                await interaction.reply({
                    content: 'There was an error abandoning the quest!',
                    ephemeral: true
                });
            }
        }
    }
];

function formatRewards(rewards) {
    const parts = [];
    if (rewards.experience) parts.push(`🌟 ${rewards.experience} XP`);
    if (rewards.gold) parts.push(`🪙 ${rewards.gold} Gold`);
    if (rewards.bounty) parts.push(`₿ ${rewards.bounty.toLocaleString()} Bounty`);
    if (rewards.ship) parts.push(`🚢 Ship: ${capitalizeFirst(rewards.ship)}`);
    if (rewards.ally) parts.push(`👥 Ally: ${rewards.ally}`);
    
    return parts.join('\n') || 'Various rewards';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
