const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder, MediaGalleryBuilder } = require('discord.js');
const Player = require('../database/models/Player');
const Quest = require('../database/models/Quest');
const { COLORS, QUEST_STATUS } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Quest management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View available quests'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('active')
                .setDescription('View your active quests'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a quest')
                .addIntegerOption(option =>
                    option.setName('quest_id')
                        .setDescription('ID of the quest to start')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('abandon')
                .setDescription('Abandon an active quest')
                .addIntegerOption(option =>
                    option.setName('quest_id')
                        .setDescription('ID of the quest to abandon')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('View daily quests')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            // Check if player exists
            const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);
            if (!player) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent('❌ You need to create a character first! Use `/character create` to start your adventure.');

                return await interaction.reply({
                    components: [errorDisplay],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case 'list':
                    await handleQuestList(interaction, player);
                    break;
                case 'active':
                    await handleActiveQuests(interaction, player);
                    break;
                case 'start':
                    await handleStartQuest(interaction, player);
                    break;
                case 'abandon':
                    await handleAbandonQuest(interaction, player);
                    break;
                case 'daily':
                    await handleDailyQuests(interaction, player);
                    break;
                default:
                    await interaction.reply({
                        content: 'Unknown quest command.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in quest command:', error);
            const reply = { 
                content: 'There was an error executing this quest command!', 
                ephemeral: true 
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};

async function handleQuestList(interaction, player) {
    const availableQuests = await Quest.getAvailableQuests(player);

    if (availableQuests.length === 0) {
        const noQuestsDisplay = new TextDisplayBuilder()
            .setContent('📋 No quests available at your current level and location. Try exploring new areas or leveling up!');

        return await interaction.reply({
            components: [noQuestsDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const questContainer = new ContainerBuilder()
        .setAccentColor(COLORS.PRIMARY)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📋 Available Quests**\n*Location: ${capitalizeFirst(player.location)} | Level: ${player.level}*`)
        );

    const components = [questContainer];

    // Group quests by difficulty and display in sections
    const mainStoryQuests = availableQuests.filter(q => q.is_main_story);
    const sideQuests = availableQuests.filter(q => !q.is_main_story);

    if (mainStoryQuests.length > 0) {
        mainStoryQuests.slice(0, 3).forEach(quest => {
            const difficultyStars = '⭐'.repeat(quest.difficulty);
            const rewardText = formatRewards(quest.rewards);
            
            const questSection = new SectionBuilder()
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**🎯 ${quest.name}** (Main Story)\n*${quest.arc} Arc*`),
                    textDisplay => textDisplay
                        .setContent(`${quest.description}\n\n**Difficulty:** ${difficultyStars}\n**Rewards:** ${rewardText}`)
                )
                .setButtonAccessory(
                    button => button
                        .setCustomId(`quest_start_${quest.id}`)
                        .setLabel('Start Quest')
                        .setStyle(ButtonStyle.Primary)
                );
            
            components.push(questSection);
        });
    }

    if (sideQuests.length > 0) {
        sideQuests.slice(0, 2).forEach(quest => {
            const difficultyStars = '⭐'.repeat(quest.difficulty);
            const rewardText = formatRewards(quest.rewards);
            
            const questSection = new SectionBuilder()
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**📜 ${quest.name}** (Side Quest)\n*${quest.arc} Arc*`),
                    textDisplay => textDisplay
                        .setContent(`${quest.description}\n\n**Difficulty:** ${difficultyStars}\n**Rewards:** ${rewardText}`)
                )
                .setButtonAccessory(
                    button => button
                        .setCustomId(`quest_start_${quest.id}`)
                        .setLabel('Start Quest')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            components.push(questSection);
        });
    }

    await interaction.reply({
        components: components,
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
}

async function handleActiveQuests(interaction, player) {
    const activeQuests = await player.getActiveQuests();

    if (activeQuests.length === 0) {
        const noActiveDisplay = new TextDisplayBuilder()
            .setContent('📋 You don\'t have any active quests. Use `/quest list` to see available quests!');

        return await interaction.reply({
            components: [noActiveDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const activeContainer = new ContainerBuilder()
        .setAccentColor(COLORS.WARNING)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**⚡ Active Quests (${activeQuests.length}/5)**\n*Your current adventures*`)
        );

    const components = [activeContainer];

    activeQuests.forEach(questData => {
        const progress = questData.progress ? JSON.parse(questData.progress) : {};
        const difficultyStars = '⭐'.repeat(questData.difficulty);
        
        const questSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**${questData.is_main_story ? '🎯' : '📜'} ${questData.name}**\n*${questData.arc} Arc*`),
                textDisplay => textDisplay
                    .setContent(`${questData.description}\n\n**Difficulty:** ${difficultyStars}\n**Status:** In Progress ⏳`)
            )
            .setButtonAccessory(
                button => button
                    .setCustomId(`quest_continue_${questData.id}`)
                    .setLabel('Continue')
                    .setStyle(ButtonStyle.Success)
            );
        
        components.push(questSection);
    });

    await interaction.reply({
        components: components,
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleStartQuest(interaction, player) {
    const questId = interaction.options.getInteger('quest_id');
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
            .setContent('❌ You can only have 5 active quests at a time. Abandon a quest first!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Start the quest
    await quest.startForPlayer(player.id);

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
}

async function handleAbandonQuest(interaction, player) {
    const questId = interaction.options.getInteger('quest_id');
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

    // Check if player has this quest
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

    // Create confirmation interface
    const confirmContainer = new ContainerBuilder()
        .setAccentColor(COLORS.WARNING)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**⚠️ Abandon Quest?**\n*${quest.name}*`),
            textDisplay => textDisplay
                .setContent(`Are you sure you want to abandon this quest? All progress will be lost and you'll need to start over.`)
        );

    const confirmSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('Choose your action:')
        )
        .setButtonAccessory(
            button => button
                .setCustomId(`quest_abandon_confirm_${quest.id}`)
                .setLabel('⚠️ Abandon Quest')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({
        components: [confirmContainer, confirmSection],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleDailyQuests(interaction, player) {
    const dailyQuests = await Quest.getDailyQuests(player);

    if (dailyQuests.length === 0) {
        const noDailyDisplay = new TextDisplayBuilder()
            .setContent('📅 No daily quests available today. Check back tomorrow!');

        return await interaction.reply({
            components: [noDailyDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const dailyContainer = new ContainerBuilder()
        .setAccentColor(COLORS.GOLD)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📅 Daily Quests**\n*Quick adventures for extra rewards*`)
        );

    const components = [dailyContainer];

    dailyQuests.forEach(quest => {
        const rewardText = formatRewards(quest.rewards);
        
        const questSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**⏰ ${quest.name}**\n*Daily Quest*`),
                textDisplay => textDisplay
                    .setContent(`${quest.description}\n\n**Rewards:** ${rewardText}`)
            )
            .setButtonAccessory(
                button => button
                    .setCustomId(`quest_start_${quest.id}`)
                    .setLabel('Start Daily')
                    .setStyle(ButtonStyle.Primary)
            );
        
        components.push(questSection);
    });

    await interaction.reply({
        components: components,
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
}

// Helper functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function formatRewards(rewards) {
    const parts = [];
    if (rewards.experience) parts.push(`${rewards.experience} XP`);
    if (rewards.gold) parts.push(`🪙${rewards.gold}`);
    if (rewards.bounty) parts.push(`₿${rewards.bounty.toLocaleString()}`);
    if (rewards.ship) parts.push(`Ship: ${capitalizeFirst(rewards.ship)}`);
    if (rewards.ally) parts.push(`Ally: ${rewards.ally}`);
    
    return parts.join(', ') || 'Various rewards';
}
