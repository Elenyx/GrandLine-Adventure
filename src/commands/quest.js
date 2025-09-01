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
                .setDescription('Start a quest'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('abandon')
                .setDescription('Abandon an active quest')
                .addIntegerOption(option =>
                    option.setName('quest_id')
                        .setDescription('ID of the quest to abandon (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('View daily quests')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

    console.log(`[COMMAND] /quest ${subcommand} invoked by user=${interaction.user.id} guild=${interaction.guild?.id}`);

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
                                    ,
                                textDisplay => textDisplay
                                    .setContent(`**Requirements:** ${formatRequirements(quest)}`)
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
                        .setContent(`${quest.description}\n\n**Difficulty:** ${difficultyStars}\n**Rewards:** ${rewardText}`),
                    textDisplay => textDisplay
                        .setContent(`**Requirements:** ${formatRequirements(quest)}`)
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
    // List the player's active quests and provide continue buttons
    const activeQuests = await player.getActiveQuests();

    if (!activeQuests || activeQuests.length === 0) {
        const noActiveDisplay = new TextDisplayBuilder()
            .setContent('📋 You don\'t have any active quests. Use `/quest list` to find new quests.');

        return await interaction.reply({
            components: [noActiveDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const activeContainer = new ContainerBuilder()
        .setAccentColor(COLORS.PRIMARY)
        .addTextDisplayComponents(td => td.setContent(`**⚡ Active Quests (${activeQuests.length}/5)**\n*Select a quest to continue*`));

    const components = [activeContainer];

    activeQuests.forEach(questData => {
        const progress = questData.progress ? JSON.parse(questData.progress) : {};
        const difficultyStars = '⭐'.repeat(questData.difficulty || 1);

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
    // Always show available quests for selection; if only one, auto-start it
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

    // If only one quest is available, auto-start it for convenience
    if (availableQuests.length === 1) {
        const single = availableQuests[0];
        const quest = await Quest.findById(single.id);

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

        await quest.startForPlayer(player.id);

        const successContainer = new ContainerBuilder()
            .setAccentColor(COLORS.SUCCESS)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**✅ Quest Started!**\n*${quest.name}*`),
                textDisplay => textDisplay
                    .setContent(`${quest.description}\n\n**Arc:** ${quest.arc}\n**Difficulty:** ${'⭐'.repeat(quest.difficulty)}\n\nGood luck on your adventure!`)
            );

        return await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: false
        });
    }

    // Multiple quests available -> show list for selection
    return await handleQuestList(interaction, player);
}

async function handleAbandonQuest(interaction, player) {
    const questId = interaction.options.getInteger('quest_id');

    // If no quest id provided, show player's active quests for selection
    if (!questId) {
        const activeQuests = await player.getActiveQuests();

        if (activeQuests.length === 0) {
            const noActiveDisplay = new TextDisplayBuilder()
                .setContent('📋 You don\'t have any active quests to abandon. Use `/quest list` to find new quests.');

            return await interaction.reply({
                components: [noActiveDisplay],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // If exactly one active quest, show confirmation directly for that quest
        if (activeQuests.length === 1) {
            const q = activeQuests[0];
            // Reuse existing confirmation UI by falling through with questId
            return await handleAbandonQuestWithId(interaction, player, q.id);
        }

        // Multiple active quests: show a list with abandon buttons
        const activeContainer = new ContainerBuilder()
            .setAccentColor(COLORS.WARNING)
            .addTextDisplayComponents(
                td => td.setContent(`**⚡ Active Quests (${activeQuests.length}/5)**\n*Select a quest to abandon*`)
            );

        const components = [activeContainer];

        activeQuests.forEach(qd => {
            const questSection = new SectionBuilder()
                .addTextDisplayComponents(
                    td => td.setContent(`**${qd.name}**\n*${qd.arc} Arc*`),
                    td => td.setContent(qd.description)
                )
                .setButtonAccessory(btn => btn
                    .setCustomId(`quest_abandon_select_${qd.id}`)
                    .setLabel('Abandon')
                    .setStyle('Danger')
                );

            components.push(questSection);
        });

        return await interaction.reply({
            components: components,
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    return await handleAbandonQuestWithId(interaction, player, questId);
}

// Separate helper to show the confirmation flow when we have a quest id
async function handleAbandonQuestWithId(interaction, player, questId) {
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
                        .setContent(`${quest.description}\n\n**Rewards:** ${rewardText}`),
                    textDisplay => textDisplay
                        .setContent(`**Requirements:** ${formatRequirements(quest)}`)
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

// Format quest requirements for display to users
function formatRequirements(quest) {
    // Attempt to read structured requirements from quest.requirements first
    const req = quest.requirements || {};
    const parts = [];

    // Known requirement keys
    if (req.min_level) parts.push(`Level ≥ ${req.min_level}`);
    if (req.max_level) parts.push(`Level ≤ ${req.max_level}`);
    if (req.location) parts.push(`${capitalizeFirst(req.location)}`);
    if (req.faction) parts.push(`${capitalizeFirst(req.faction)}`);
    if (req.race) parts.push(`${capitalizeFirst(req.race)}`);

    // Also check top-level fields on the quest object (database columns)
    if (quest.min_level && !req.min_level) parts.push(`Level ≥ ${quest.min_level}`);
    if (quest.max_level && !req.max_level) parts.push(`Level ≤ ${quest.max_level}`);
    if (quest.location && !req.location) parts.push(`${capitalizeFirst(quest.location)}`);
    if (quest.faction_requirement && !req.faction) parts.push(`${capitalizeFirst(quest.faction_requirement)}`);
    if (quest.race_requirement && !req.race) parts.push(`${capitalizeFirst(quest.race_requirement)}`);

    if (parts.length === 0) return 'None';
    return parts.join(' • ');
}
