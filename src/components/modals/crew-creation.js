const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const Player = require('../../database/models/Player');
const Crew = require('../../database/models/Crew');
const { COLORS } = require('../../config/constants');

module.exports = [
    {
        customId: 'crew_creation_modal',
        async execute(interaction) {
            try {
                const crewName = interaction.fields.getTextInputValue('crew_name');
                const crewMotto = interaction.fields.getTextInputValue('crew_motto') || '';

                // Validate crew name
                if (crewName.length < 2 || crewName.length > 50) {
                    await interaction.reply({
                        content: 'Crew name must be between 2 and 50 characters long.',
                        ephemeral: true
                    });
                    return;
                }

                const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                
                if (!player) {
                    await interaction.reply({
                        content: 'Character not found!',
                        ephemeral: true
                    });
                    return;
                }

                if (player.crew_id) {
                    await interaction.reply({
                        content: 'You are already in a crew!',
                        ephemeral: true
                    });
                    return;
                }

                // Check if crew name already exists
                const existingCrew = await Crew.findByName(crewName, interaction.guild.id);
                if (existingCrew) {
                    await interaction.reply({
                        content: 'A crew with that name already exists! Choose a different name.',
                        ephemeral: true
                    });
                    return;
                }

                // Check level requirement
                if (player.level < 3) {
                    await interaction.reply({
                        content: 'You need to reach level 3 before creating a crew!',
                        ephemeral: true
                    });
                    return;
                }

                // Create the crew
                const crew = await Crew.create({
                    name: crewName,
                    captain_id: player.id,
                    motto: crewMotto,
                    location: player.location
                });

                const successContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.SUCCESS)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🏴‍☠️ Crew Created Successfully! 🏴‍☠️**\n*${crew.name}*`),
                        textDisplay => textDisplay
                            .setContent(`Congratulations, Captain ${player.character_name}!\n\n${crewMotto ? `**Motto:** "${crewMotto}"\n\n` : ''}Your crew has been established and you are now ready to recruit members and sail the Grand Line!`)
                    );

                const nextStepsSection = new SectionBuilder()
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**⚓ Next Steps as Captain:**\n• Use \`/crew invite @user\` to recruit members\n• Use \`/crew role @user <role>\` to assign positions\n• Build your crew's reputation through quests and adventures\n• Work together to become a legendary crew!`)
                    );

                await interaction.reply({
                    components: [successContainer, nextStepsSection],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: false
                });

            } catch (error) {
                console.error('Error creating crew:', error);
                await interaction.reply({
                    content: 'There was an error creating the crew!',
                    ephemeral: true
                });
            }
        }
    }
];
