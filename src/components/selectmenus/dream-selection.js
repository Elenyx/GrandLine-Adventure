const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const { COLORS, DREAMS } = require('../../config/constants');

module.exports = {
    customId: 'dream_selection',
    async execute(interaction) {
        try {
            const selectedDream = interaction.values[0];

            // Store dream selection
            if (!global.characterCreation || !global.characterCreation[interaction.user.id]) {
                await interaction.reply({
                    content: 'Character creation session expired. Please start over.',
                    ephemeral: true
                });
                return;
            }

            global.characterCreation[interaction.user.id].dream = selectedDream;

            // Show dream confirmation
            const dreamConfirmContainer = new ContainerBuilder()
                .setAccentColor(COLORS.GOLD)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**✅ Dream Selected: ${getDreamEmoji(selectedDream)} ${getDreamName(selectedDream)}**\n*${getDreamDescription(selectedDream)}*`),
                    textDisplay => textDisplay
                        .setContent(getDreamBenefits(selectedDream))
                );

            // Create character name input modal
            const modal = new ModalBuilder()
                .setCustomId('character_name_modal')
                .setTitle('Complete Character Creation');

            const nameInput = new TextInputBuilder()
                .setCustomId('character_name')
                .setLabel('Character Name')
                .setStyle(TextInputStyle.Short)
                .setMinLength(2)
                .setMaxLength(32)
                .setPlaceholder('Enter your character\'s name...')
                .setRequired(true);

            const nameRow = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(nameRow);

            const summaryContainer = new ContainerBuilder()
                .setAccentColor(COLORS.INFO)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('**📋 Character Summary**\n*Review your choices*'),
                    textDisplay => textDisplay
                        .setContent(`**Race:** ${getRaceEmoji(global.characterCreation[interaction.user.id].race)} ${capitalizeFirst(global.characterCreation[interaction.user.id].race)}\n**Origin:** ${getOriginEmoji(global.characterCreation[interaction.user.id].origin)} ${capitalizeFirst(global.characterCreation[interaction.user.id].origin)}\n**Dream:** ${getDreamEmoji(selectedDream)} ${getDreamName(selectedDream)}`)
                );

            const finalStepSection = new SectionBuilder()
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('**🎯 Final Step**\nClick the button below to enter your character\'s name and complete creation!')
                )
                .setButtonAccessory(
                    button => button
                        .setCustomId('show_name_modal')
                        .setLabel('✨ Enter Character Name')
                        .setStyle('Primary')
                );

            await interaction.reply({
                components: [dreamConfirmContainer, summaryContainer, finalStepSection],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });

            // Store the modal for the button handler
            global.characterCreationModals = global.characterCreationModals || {};
            global.characterCreationModals[interaction.user.id] = modal;

        } catch (error) {
            console.error('Error in dream selection:', error);
            await interaction.reply({
                content: 'There was an error processing your dream selection!',
                ephemeral: true
            });
        }
    },
};

// Helper button to show the modal
module.exports.showNameModal = {
    customId: 'show_name_modal',
    async execute(interaction) {
        try {
            const modal = global.characterCreationModals?.[interaction.user.id];
            if (!modal) {
                await interaction.reply({
                    content: 'Character creation session expired. Please start over.',
                    ephemeral: true
                });
                return;
            }

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing name modal:', error);
            await interaction.reply({
                content: 'There was an error showing the name input!',
                ephemeral: true
            });
        }
    }
};

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

function getOriginEmoji(origin) {
    const emojis = {
        shells_town: '⚓',
        syrup_village: '🏴‍☠️',
        ohara: '📚',
        baratie: '🍽️',
        loguetown: '💀',
        skypiea: '☁️',
        elbaf: '🏔️'
    };
    return emojis[origin] || '🏝️';
}

function getDreamEmoji(dream) {
    const emojis = {
        greatest_swordsman: '⚔️',
        all_blue: '🌊',
        map_world: '🗺️',
        brave_warrior: '⚔️',
        devil_fruit_master: '🍎',
        topple_government: '✊',
        pirate_king: '👑'
    };
    return emojis[dream] || '🌟';
}

function getDreamName(dream) {
    const names = {
        greatest_swordsman: 'World\'s Greatest Swordsman',
        all_blue: 'Find the All Blue',
        map_world: 'Map the World',
        brave_warrior: 'Brave Warrior of the Sea',
        devil_fruit_master: 'Master Devil Fruits',
        topple_government: 'Topple the World Government',
        pirate_king: 'Become the Pirate King'
    };
    return names[dream] || 'Unknown Dream';
}

function getDreamDescription(dream) {
    const descriptions = {
        greatest_swordsman: 'Become the most skilled swordsman in the world, surpassing even Dracule Mihawk',
        all_blue: 'Discover the legendary sea where all four blues meet, containing every fish in the world',
        map_world: 'Chart every island, sea, and secret location across the entire world',
        brave_warrior: 'Become an unbeatable fighter who never backs down from any challenge',
        devil_fruit_master: 'Unlock the secrets and powers of the mysterious Devil Fruits',
        topple_government: 'Bring down the corrupt World Government and create a better world',
        pirate_king: 'Find the legendary treasure One Piece and become the freest person on the seas'
    };
    return descriptions[dream] || 'A mysterious aspiration';
}

function getDreamBenefits(dream) {
    const benefits = {
        greatest_swordsman: '**Starting Benefits:**\n• Katana weapon\n• Swordsman skill tree unlocked\n• Unique duel quest opportunities\n• +10% sword damage bonus',
        all_blue: '**Starting Benefits:**\n• Cooking recipes and tools\n• Cook skill tree unlocked\n• Food crafting abilities\n• HP restoration bonuses',
        map_world: '**Starting Benefits:**\n• Log Pose navigation tool\n• Navigator skill tree unlocked\n• Hidden location discovery\n• Reduced travel cooldowns',
        brave_warrior: '**Starting Benefits:**\n• +20% base HP\n• Brawler/Marksman skill tree\n• Tanky combat archetype\n• Courage-based abilities',
        devil_fruit_master: '**Starting Benefits:**\n• Enhanced Devil Fruit sensing\n• Fruit Hunt skill unlocked\n• Higher discovery rates\n• Fruit knowledge database',
        topple_government: '**Starting Benefits:**\n• Revolutionary alignment\n• Sabotage and propaganda quests\n• Rally ability for allies\n• Government resistance network',
        pirate_king: '**Starting Benefits:**\n• Balanced skill bonuses\n• Access to all quest types\n• Endgame Raftel questline\n• Supreme leadership potential'
    };
    return benefits[dream] || 'Unknown benefits';
}
