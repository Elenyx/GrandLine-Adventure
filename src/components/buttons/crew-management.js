const { MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const Player = require('../../database/models/Player');
const Crew = require('../../database/models/Crew');
const { COLORS, CREW_ROLES } = require('../../config/constants');
const { query } = require('../../config/database');

module.exports = [
    {
        customId: /^crew_create_confirm_(.+)$/,
        async execute(interaction) {
            const crewName = interaction.customId.match(/^crew_create_confirm_(.+)$/)[1];
            
            try {
                const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                
                if (!player) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ Character not found!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                if (player.crew_id) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You are already in a crew!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Check if crew name still available
                const existingCrew = await Crew.findByName(crewName, interaction.guild.id);
                if (existingCrew) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ A crew with that name already exists!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Create the crew
                const crew = await Crew.create({
                    name: crewName,
                    captain_id: player.id,
                    motto: '',
                    location: player.location
                });

                const successContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.SUCCESS)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🏴‍☠️ Crew Created Successfully! 🏴‍☠️**\n*${crew.name}*`),
                        textDisplay => textDisplay
                            .setContent(`Congratulations, Captain ${player.character_name}!\n\nYour crew has been established. You can now:\n• Invite members with \`/crew invite\`\n• Set roles with \`/crew role\`\n• Build your reputation across the seas`)
                    );

                await interaction.reply({
                    components: [successContainer],
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
    },
    {
        customId: /^crew_invite_accept_(\d+)_(.+)$/,
        async execute(interaction) {
            const match = interaction.customId.match(/^crew_invite_accept_(\d+)_(.+)$/);
            const crewId = parseInt(match[1]);
            const targetUserId = match[2];
            
            try {
                // Check if the person clicking is the target of the invitation
                if (interaction.user.id !== targetUserId) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ This invitation is not for you!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

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

                if (player.crew_id) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You are already in a crew!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                const crew = await Crew.findById(crewId);
                if (!crew) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ Crew not found!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Add player to crew
                await crew.addMember(player.id, CREW_ROLES.FIGHTER);

                const successContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.SUCCESS)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🏴‍☠️ Welcome to ${crew.name}! 🏴‍☠️**\n*${player.character_name} has joined the crew*`),
                        textDisplay => textDisplay
                            .setContent(`You are now a member of **${crew.name}**!\n\nAs a crew member, you can:\n• Participate in crew quests\n• Share in crew achievements\n• Build the crew's reputation and bounty`)
                    );

                await interaction.reply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: false
                });

            } catch (error) {
                console.error('Error accepting crew invitation:', error);
                await interaction.reply({
                    content: 'There was an error accepting the crew invitation!',
                    ephemeral: true
                });
            }
        }
    },
    {
        customId: /^crew_kick_confirm_(\d+)$/,
        async execute(interaction) {
            const targetPlayerId = parseInt(interaction.customId.match(/^crew_kick_confirm_(\d+)$/)[1]);
            
            try {
                const captain = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                const targetPlayer = await Player.findById(targetPlayerId);
                
                if (!captain || !targetPlayer) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ Player not found!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                const crew = await Crew.findById(captain.crew_id);
                if (!crew || crew.captain_id !== captain.id) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You are not the captain of this crew!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                // Remove member from crew
                await crew.removeMember(targetPlayer.id);

                const successContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.WARNING)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**⚠️ Member Removed**\n*${crew.name}*`),
                        textDisplay => textDisplay
                            .setContent(`**${targetPlayer.character_name}** has been removed from the crew.`)
                    );

                await interaction.reply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: false
                });

            } catch (error) {
                console.error('Error kicking crew member:', error);
                await interaction.reply({
                    content: 'There was an error removing the crew member!',
                    ephemeral: true
                });
            }
        }
    },
    {
        customId: 'crew_leave_confirm',
        async execute(interaction) {
            try {
                const player = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                
                if (!player || !player.crew_id) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You are not in a crew!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                const crew = await Crew.findById(player.crew_id);
                const crewName = crew.name;

                // Remove player from crew
                await crew.removeMember(player.id);

                const successContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.WARNING)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🚪 Left Crew**\n*${crewName}*`),
                        textDisplay => textDisplay
                            .setContent(`You have left **${crewName}**.\n\nYou are now a free adventurer. You can join another crew or create your own when ready.`)
                    );

                await interaction.reply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: false
                });

            } catch (error) {
                console.error('Error leaving crew:', error);
                await interaction.reply({
                    content: 'There was an error leaving the crew!',
                    ephemeral: true
                });
            }
        }
    },
    {
        customId: 'crew_disband_confirm',
        async execute(interaction) {
            try {
                const captain = await Player.findByUserId(interaction.user.id, interaction.guild.id);
                
                if (!captain || !captain.crew_id) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You are not in a crew!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                const crew = await Crew.findById(captain.crew_id);
                if (!crew || crew.captain_id !== captain.id) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ You are not the captain!');

                    return await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                const crewName = crew.name;
                
                // Delete the entire crew
                await crew.delete();

                const disbandContainer = new ContainerBuilder()
                    .setAccentColor(COLORS.ERROR)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**💥 Crew Disbanded**\n*${crewName}*`),
                        textDisplay => textDisplay
                            .setContent(`Captain ${captain.character_name} has disbanded **${crewName}**.\n\nAll crew members have been released and are now free adventurers.`)
                    );

                await interaction.reply({
                    components: [disbandContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: false
                });

            } catch (error) {
                console.error('Error disbanding crew:', error);
                await interaction.reply({
                    content: 'There was an error disbanding the crew!',
                    ephemeral: true
                });
            }
        }
    }
];
