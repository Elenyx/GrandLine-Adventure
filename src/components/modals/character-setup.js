const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const Player = require('../../database/models/Player');
const Quest = require('../../database/models/Quest');
const QuestManager = require('../../systems/QuestManager');
const { COLORS, RACES, ORIGINS, DREAMS, FACTIONS } = require('../../config/constants');

module.exports = [
    {
        customId: 'character_name_modal',
        async execute(interaction) {
            try {
                // Get stored character data
                const characterData = global.characterCreation?.[interaction.user.id];
                if (!characterData) {
                    await interaction.reply({
                        content: 'Character creation session expired. Please start over.',
                        ephemeral: true
                    });
                    return;
                }

                const characterName = interaction.fields.getTextInputValue('character_name');

                // Validate character name
                if (characterName.length < 2 || characterName.length > 32) {
                    await interaction.reply({
                        content: 'Character name must be between 2 and 32 characters long.',
                        ephemeral: true
                    });
                    return;
                }

                // Check if name is already taken
                const existingPlayer = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                if (existingPlayer) {
                    await interaction.reply({
                        content: 'You already have a character!',
                        ephemeral: true
                    });
                    return;
                }

                // Apply racial bonuses
                let baseStats = { strength: 1, agility: 1, durability: 1, intelligence: 1 };
                
                switch (characterData.race) {
                    case RACES.HUMAN:
                        baseStats.strength += 1;
                        baseStats.agility += 1;
                        baseStats.durability += 1;
                        baseStats.intelligence += 1;
                        break;
                    case RACES.FISHMAN:
                        baseStats.strength += 2;
                        baseStats.durability += 1;
                        break;
                    case RACES.MINK:
                        baseStats.agility += 2;
                        baseStats.strength += 1;
                        break;
                    case RACES.SKYPIEAN:
                        baseStats.intelligence += 2;
                        baseStats.agility += 1;
                        break;
                    case RACES.GIANT:
                        baseStats.strength += 4;
                        baseStats.durability += 2;
                        baseStats.agility -= 2;
                        break;
                }

                // Determine faction based on origin
                let faction = FACTIONS.NEUTRAL;
                switch (characterData.origin) {
                    case ORIGINS.SHELLS_TOWN:
                        faction = FACTIONS.MARINE;
                        break;
                    case ORIGINS.SYRUP_VILLAGE:
                        faction = FACTIONS.PIRATE;
                        break;
                    case ORIGINS.OHARA:
                        faction = FACTIONS.REVOLUTIONARY;
                        break;
                    case ORIGINS.LOGUETOWN:
                        faction = FACTIONS.NEUTRAL; // Player chooses later
                        break;
                    default:
                        faction = FACTIONS.NEUTRAL;
                }

                // Create the player
                const player = await Player.create({
                    user_id: interaction.user.id,
                    guild_id: interaction.guild.id,
                    character_name: characterName,
                    race: characterData.race,
                    origin: characterData.origin,
                    dream: characterData.dream,
                    faction: faction,
                    level: 1,
                    experience: 0,
                    strength: baseStats.strength,
                    agility: baseStats.agility,
                    durability: baseStats.durability,
                    intelligence: baseStats.intelligence,
                    gold: 1000,
                    bounty: 0,
                    location: characterData.origin
                });

                // Clear character creation data
                if (global.characterCreation) {
                    delete global.characterCreation[interaction.user.id];
                }

                // Show character creation success
                const successContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.SUCCESS)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🎉 Character Created Successfully! 🎉**\n*Welcome to the Grand Line, ${characterName}!*`),
                        textDisplay => textDisplay
                            .setContent(`**Race:** ${getRaceEmoji(player.race)} ${capitalizeFirst(player.race)}\n**Origin:** ${capitalizeFirst(player.origin)}\n**Dream:** ${getDreamText(player.dream)}\n**Faction:** ${getFactionEmoji(player.faction)} ${capitalizeFirst(player.faction)}`)
                    );

                const statsSection = new SectionBuilder()
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**⚔️ Starting Stats**\n**Strength:** ${player.strength}\n**Agility:** ${player.agility}\n**Durability:** ${player.durability}\n**Intelligence:** ${player.intelligence}`),
                        textDisplay => textDisplay
                            .setContent(`**💰 Starting Resources**\n**Level:** ${player.level}\n**Gold:** 🪙${player.gold.toLocaleString()}\n**Bounty:** ₿${player.bounty}\n**Location:** ${capitalizeFirst(player.location)}`)
                    );

                const nextStepsSection = new SectionBuilder()
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🗺️ What's Next?**\nYour adventure begins now! You can:\n• Use \`/quest list\` to find available quests\n• Use \`/character profile\` to view your character\n• Use \`/crew create\` once you reach level 3\n\nMay your journey across the Grand Line be legendary!`)
                    );

                await interaction.reply({
                    components: [successContainer, statsSection, nextStepsSection],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: false
                });

                // Auto-start the very first quest for new players to reduce friction
                (async () => {
                    try {
                        const FIRST_QUEST_ID = 1;
                        const firstQuest = await Quest.findById(FIRST_QUEST_ID);
                        if (!firstQuest) return;

                        // Ensure player meets requirements and doesn't already have it
                        if (!firstQuest.canPlayerAccept(player)) return;
                        const existing = await firstQuest.getPlayerProgress(player.id);
                        if (existing) return;

                        // Start quest and initialize quest manager state
                        await firstQuest.startForPlayer(player.id);
                        try { await QuestManager.initializeQuest(player.id, FIRST_QUEST_ID); } catch (e) { /* non-fatal */ }

                        const questStartContainer = new ContainerBuilder()
                            .setAccentColor(COLORS.SUCCESS)
                            .addTextDisplayComponents(
                                td => td.setContent(`**🗡️ Your First Quest Has Begun!**\n*${firstQuest.name}*`),
                                td => td.setContent(`${firstQuest.description}\n\nUse \`/quest active\` to view your quest or click any quest buttons to continue.`)
                            );

                        await interaction.followUp({
                            components: [questStartContainer],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: false
                        });
                    } catch (err) {
                        console.error('Error auto-starting first quest for new player:', err);
                    }
                })();

            } catch (error) {
                console.error('Error creating character:', error);
                await interaction.reply({
                    content: 'There was an error creating your character!',
                    ephemeral: true
                });
            }
        }
    }
];

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
