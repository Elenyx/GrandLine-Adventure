const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { StringSelectMenuBuilder, TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const { COLORS } = require('../../config/constants');

module.exports = {
    customId: 'character_creation_start',
    async execute(interaction) {
        try {
            // Create race selection menu
            const raceSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('race_selection')
                .setPlaceholder('Choose your race...')
                .addOptions([
                    {
                        label: '👤 Human',
                        description: 'Adaptable majority - balanced stats, +10% XP',
                        value: 'human'
                    },
                    {
                        label: '🐟 Fish-Man/Mermaid',
                        description: 'Lords of the sea - water breathing, +2 STR, +1 DUR',
                        value: 'fishman'
                    },
                    {
                        label: '🐺 Mink',
                        description: 'Lightning furies - electro ability, +2 AGI, +1 STR',
                        value: 'mink'
                    },
                    {
                        label: '☁️ Skypiean',
                        description: 'Children of clouds - sky dweller, +2 INT, +1 AGI',
                        value: 'skypiean'
                    },
                    {
                        label: '🏔️ Giant',
                        description: 'Titans of the seas - giant strength, +4 STR, +2 DUR, -2 AGI',
                        value: 'giant'
                    }
                ]);

            const raceRow = new ActionRowBuilder().addComponents(raceSelectMenu);

            const raceContainer = new ContainerBuilder()
                .setAccentColor(COLORS.PRIMARY)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('**🧬 Choose Your Race**\n*Your racial heritage determines your natural abilities and starting stats*'),
                    textDisplay => textDisplay
                        .setContent('Each race offers unique advantages:\n• **Humans** are adaptable and learn faster\n• **Fish-Men** dominate underwater\n• **Minks** harness electricity\n• **Skypieans** excel with dials and sky navigation\n• **Giants** possess overwhelming physical power')
                );

            await interaction.reply({
                components: [raceContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });

            // Send the select menu as a follow-up
            await interaction.followUp({
                content: 'Select your race:',
                components: [raceRow],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in character creation start:', error);
            await interaction.reply({
                content: 'There was an error starting character creation!',
                ephemeral: true
            });
        }
    },
};
