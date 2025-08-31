const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const Player = require('../database/models/Player');
const { COLORS } = require('../config/constants');
const { createCharacterEmbed, createErrorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('character')
        .setDescription('Character management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new character'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('profile')
                .setDescription('View your character profile')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view profile of')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your character stats'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View the server leaderboard')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCharacterCreation(interaction);
                    break;
                case 'profile':
                    await handleCharacterProfile(interaction);
                    break;
                case 'stats':
                    await handleCharacterStats(interaction);
                    break;
                case 'leaderboard':
                    await handleLeaderboard(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: 'Unknown character command.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in character command:', error);
            const reply = { 
                content: 'There was an error executing this character command!', 
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

async function handleCharacterCreation(interaction) {
    // Check if player already exists
    const existingPlayer = await Player.findByUserId(interaction.user.id, interaction.guild.id);
    if (existingPlayer) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You already have a character! Use `/character profile` to view it.');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Create character creation interface using Components V2
    const welcomeContainer = new ContainerBuilder()
        .setAccentColor(COLORS.PRIMARY)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('**🏴‍☠️ Welcome to the One Piece RPG! 🏴‍☠️**\n\nYou are about to begin your adventure across the Grand Line. Choose your destiny by selecting your race, origin, and dream.'),
            textDisplay => textDisplay
                .setContent('**Your choices will shape your journey:**\n• Race determines your natural abilities\n• Origin sets your starting story\n• Dream defines your ultimate goal')
        );

    const startButton = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('Ready to begin your adventure? Click the button below to start character creation!')
        )
        .setButtonAccessory(
            button => button
                .setCustomId('character_creation_start')
                .setLabel('🚀 Start Character Creation')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({
        components: [welcomeContainer, startButton],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleCharacterProfile(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const player = await Player.findByUserId(targetUser.id, interaction.guild.id);

    if (!player) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent(`❌ ${targetUser.id === interaction.user.id ? 'You don\'t' : 'That user doesn\'t'} have a character yet. Use \`/character create\` to start your adventure!`);

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Get additional data
    const allies = await player.getAllies();
    const activeQuests = await player.getActiveQuests();

    // Create profile display using Components V2
    const profileContainer = new ContainerBuilder()
        .setAccentColor(COLORS.GOLD)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🏴‍☠️ ${player.character_name} 🏴‍☠️**\n*${getRaceEmoji(player.race)} ${capitalizeFirst(player.race)} from ${capitalizeFirst(player.origin)}*`),
            textDisplay => textDisplay
                .setContent(`**Level:** ${player.level} | **XP:** ${player.experience}/${player.getRequiredXP()}\n**Bounty:** ₿${player.bounty.toLocaleString()}\n**Gold:** 🪙${player.gold.toLocaleString()}`)
        );

    const statsSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**⚔️ Combat Stats**\n**Strength:** ${player.strength}\n**Agility:** ${player.agility}\n**Durability:** ${player.durability}\n**Intelligence:** ${player.intelligence}`),
            textDisplay => textDisplay
                .setContent(`**🎯 Dream:** ${getDreamText(player.dream)}\n**⚓ Faction:** ${getFactionEmoji(player.faction)} ${capitalizeFirst(player.faction)}\n**📍 Location:** ${capitalizeFirst(player.location)}`)
        );

    const components = [profileContainer, statsSection];

    // Add crew info if player is in a crew
    if (player.crew_id) {
        const Crew = require('../database/models/Crew');
        const crew = await Crew.findById(player.crew_id);
        if (crew) {
            const crewSection = new SectionBuilder()
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**🏴‍☠️ Crew:** ${crew.name}\n**Crew Bounty:** ₿${crew.bounty.toLocaleString()}\n**Members:** ${crew.member_count}/20`)
                );
            components.push(crewSection);
        }
    }

    // Add allies info if player has any
    if (allies.length > 0) {
        const activeAlly = allies.find(ally => ally.is_active);
        const allyText = activeAlly 
            ? `**Active Ally:** ${activeAlly.name} (Bond Level ${activeAlly.bond_level})\n**Total Allies:** ${allies.length}`
            : `**Total Allies:** ${allies.length} (None active)`;
        
        const allySection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**👥 Allies**\n${allyText}`)
            );
        components.push(allySection);
    }

    await interaction.reply({
        components: components,
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
}

async function handleCharacterStats(interaction) {
    const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);

    if (!player) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You don\'t have a character yet. Use `/character create` to start your adventure!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Calculate some additional stats
    const totalStats = player.getTotalStats();
    const progressToNext = player.experience;
    const requiredXP = player.getRequiredXP();
    const progressPercent = Math.floor((progressToNext / requiredXP) * 100);

    const statsContainer = new ContainerBuilder()
        .setAccentColor(COLORS.INFO)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📊 Detailed Stats for ${player.character_name}**\n*Level ${player.level} ${getRaceEmoji(player.race)} ${capitalizeFirst(player.race)}*`),
            textDisplay => textDisplay
                .setContent(`**Experience Progress**\n${progressToNext}/${requiredXP} XP (${progressPercent}%)\n${'█'.repeat(Math.floor(progressPercent/10))}${'░'.repeat(10-Math.floor(progressPercent/10))}`)
        );

    const combatSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**⚔️ Combat Statistics**\n**Strength:** ${player.strength}\n**Agility:** ${player.agility}\n**Durability:** ${player.durability}\n**Intelligence:** ${player.intelligence}\n**Total:** ${totalStats}`),
            textDisplay => textDisplay
                .setContent(`**💰 Wealth & Fame**\n**Gold:** 🪙${player.gold.toLocaleString()}\n**Bounty:** ₿${player.bounty.toLocaleString()}\n**Faction:** ${getFactionEmoji(player.faction)} ${capitalizeFirst(player.faction)}`)
        );

    const locationSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🗺️ Journey Information**\n**Current Location:** ${capitalizeFirst(player.location)}\n**Origin:** ${capitalizeFirst(player.origin)}\n**Dream:** ${getDreamText(player.dream)}`)
        );

    await interaction.reply({
        components: [statsContainer, combatSection, locationSection],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleLeaderboard(interaction) {
    const leaderboard = await Player.getLeaderboard(interaction.guild.id, 10);

    if (leaderboard.length === 0) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ No characters found in this server yet. Be the first to create one with `/character create`!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: false
        });
    }

    const leaderboardContainer = new ContainerBuilder()
        .setAccentColor(COLORS.GOLD)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🏆 ${interaction.guild.name} Leaderboard 🏆**\n*Top adventurers of the Grand Line*`)
        );

    // Split leaderboard into chunks of 5 for better display
    const topFive = leaderboard.slice(0, 5);
    const bottomFive = leaderboard.slice(5, 10);

    let topFiveText = '';
    topFive.forEach((player, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        topFiveText += `${medal} **${player.character_name}** (Lv.${player.level})\n`;
        topFiveText += `   ${getFactionEmoji(player.faction)} ${capitalizeFirst(player.faction)} • ₿${player.bounty.toLocaleString()}\n`;
    });

    const topSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(topFiveText)
        );

    const components = [leaderboardContainer, topSection];

    if (bottomFive.length > 0) {
        let bottomFiveText = '';
        bottomFive.forEach((player, index) => {
            const rank = index + 6;
            bottomFiveText += `${rank}. **${player.character_name}** (Lv.${player.level})\n`;
            bottomFiveText += `   ${getFactionEmoji(player.faction)} ${capitalizeFirst(player.faction)} • ₿${player.bounty.toLocaleString()}\n`;
        });

        const bottomSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(bottomFiveText)
            );
        
        components.push(bottomSection);
    }

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

function getRaceEmoji(race) {
    const emojis = {
        human: '👤',
        fishman: '🐟',
        mink: '🐺',
        skypiean: '☁️',
        giant: '🏔️',
        cyborg: '🤖'
    };
    return emojis[race] || '👤';
}

function getFactionEmoji(faction) {
    const emojis = {
        pirate: '🏴‍☠️',
        marine: '⚓',
        revolutionary: '✊',
        neutral: '🤝'
    };
    return emojis[faction] || '🤝';
}

function getDreamText(dream) {
    const dreams = {
        greatest_swordsman: 'World\'s Greatest Swordsman ⚔️',
        all_blue: 'Find the All Blue 🌊',
        map_world: 'Map the World 🗺️',
        brave_warrior: 'Brave Warrior of the Sea ⚔️',
        devil_fruit_master: 'Master Devil Fruits 🍎',
        topple_government: 'Topple the World Government ✊',
        pirate_king: 'Become the Pirate King 👑'
    };
    return dreams[dream] || dream;
}
