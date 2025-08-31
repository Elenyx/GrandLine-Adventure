const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const Player = require('../database/models/Player');
const Crew = require('../database/models/Crew');
const { COLORS, CREW_ROLES } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crew')
        .setDescription('Crew management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new crew')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of your crew')
                        .setRequired(true)
                        .setMaxLength(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View crew information')
                .addStringOption(option =>
                    option.setName('crew_name')
                        .setDescription('Name of crew to view')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invite')
                .setDescription('Invite a player to your crew')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to invite')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Remove a member from your crew')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave your current crew'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Change a crew member\'s role')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to change role of')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('new_role')
                        .setDescription('New role to assign')
                        .setRequired(true)
                        .addChoices(
                            { name: 'First Mate', value: 'first_mate' },
                            { name: 'Cook', value: 'cook' },
                            { name: 'Navigator', value: 'navigator' },
                            { name: 'Doctor', value: 'doctor' },
                            { name: 'Shipwright', value: 'shipwright' },
                            { name: 'Musician', value: 'musician' },
                            { name: 'Fighter', value: 'fighter' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View crew leaderboard')),

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
                case 'create':
                    await handleCrewCreation(interaction, player);
                    break;
                case 'info':
                    await handleCrewInfo(interaction, player);
                    break;
                case 'invite':
                    await handleCrewInvite(interaction, player);
                    break;
                case 'kick':
                    await handleCrewKick(interaction, player);
                    break;
                case 'leave':
                    await handleCrewLeave(interaction, player);
                    break;
                case 'role':
                    await handleCrewRole(interaction, player);
                    break;
                case 'leaderboard':
                    await handleCrewLeaderboard(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: 'Unknown crew command.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in crew command:', error);
            const reply = { 
                content: 'There was an error executing this crew command!', 
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

async function handleCrewCreation(interaction, player) {
    const crewName = interaction.options.getString('name');

    // Check if player is already in a crew
    if (player.crew_id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You are already in a crew! Leave your current crew first to create a new one.');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Check if crew name already exists
    const existingCrew = await Crew.findByName(crewName, interaction.guild.id);
    if (existingCrew) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ A crew with that name already exists! Choose a different name.');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Check if player has completed first voyage (requirement for crew creation)
    if (player.level < 3) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You need to reach level 3 and complete your first voyage before creating a crew!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Create crew creation modal trigger
    const crewCreationContainer = new ContainerBuilder()
        .setAccentColor(COLORS.PRIMARY)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🏴‍☠️ Create Crew: "${crewName}"**\n*You are about to become a captain!*`),
            textDisplay => textDisplay
                .setContent('As a captain, you will be able to:\n• Recruit crew members\n• Assign roles and responsibilities\n• Lead your crew on adventures\n• Build your crew\'s reputation and bounty')
        );

    const confirmSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('Ready to set sail as a captain?')
        )
        .setButtonAccessory(
            button => button
                .setCustomId(`crew_create_confirm_${crewName}`)
                .setLabel('⚓ Create Crew')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({
        components: [crewCreationContainer, confirmSection],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleCrewInfo(interaction, player) {
    let crew;
    const crewName = interaction.options.getString('crew_name');

    if (crewName) {
        // View specific crew by name
        crew = await Crew.findByName(crewName, interaction.guild.id);
        if (!crew) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent('❌ No crew found with that name!');

            return await interaction.reply({
                components: [errorDisplay],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    } else {
        // View player's own crew
        if (!player.crew_id) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent('❌ You are not in a crew! Use `/crew create` to start your own crew or wait for an invitation.');

            return await interaction.reply({
                components: [errorDisplay],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
        crew = await Crew.findById(player.crew_id);
    }

    const members = await crew.getMembers();
    const captain = members.find(m => m.role === CREW_ROLES.CAPTAIN);
    const ship = await crew.getShip();

    // Main crew info container
    const crewContainer = new ContainerBuilder()
        .setAccentColor(COLORS.NAVY)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🏴‍☠️ ${crew.name} 🏴‍☠️**\n*Captain: ${captain.character_name}*`),
            textDisplay => textDisplay
                .setContent(`**Bounty:** ₿${crew.bounty.toLocaleString()}\n**Reputation:** ${crew.reputation}\n**Members:** ${crew.member_count}/20\n**Location:** ${capitalizeFirst(crew.location)}`)
        );

    const components = [crewContainer];

    // Crew motto section (if exists)
    if (crew.motto) {
        const mottoSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📜 Crew Motto**\n*"${crew.motto}"*`)
            );
        components.push(mottoSection);
    }

    // Ship info section (if exists)
    if (ship) {
        const shipSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**🚢 Ship: ${ship.name}**\n**Type:** ${capitalizeFirst(ship.type)}\n**Durability:** ${ship.durability}/100\n**Speed:** ${ship.speed}\n**Firepower:** ${ship.firepower}`)
            );
        components.push(shipSection);
    }

    // Crew members section
    let membersText = '';
    const roleOrder = [CREW_ROLES.CAPTAIN, CREW_ROLES.FIRST_MATE, CREW_ROLES.COOK, CREW_ROLES.NAVIGATOR, CREW_ROLES.DOCTOR, CREW_ROLES.SHIPWRIGHT, CREW_ROLES.MUSICIAN, CREW_ROLES.FIGHTER];
    
    roleOrder.forEach(role => {
        const rolemembers = members.filter(m => m.role === role);
        if (rolemembers.length > 0) {
            const roleEmoji = getRoleEmoji(role);
            membersText += `**${roleEmoji} ${capitalizeFirst(role)}${rolemembers.length > 1 ? 's' : ''}:**\n`;
            rolemembers.forEach(member => {
                membersText += `• ${member.character_name} (Lv.${member.level}) - ₿${member.bounty.toLocaleString()}\n`;
            });
            membersText += '\n';
        }
    });

    const membersSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**👥 Crew Members**\n${membersText}`)
        );
    
    components.push(membersSection);

    await interaction.reply({
        components: components,
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
}

async function handleCrewInvite(interaction, player) {
    const targetUser = interaction.options.getUser('user');

    // Check if player is in a crew and has permission to invite
    if (!player.crew_id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You need to be in a crew to invite members!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const crew = await Crew.findById(player.crew_id);
    const playerMember = await crew.getMember(player.id);

    // Only captain and first mate can invite
    if (playerMember.role !== CREW_ROLES.CAPTAIN && playerMember.role !== CREW_ROLES.FIRST_MATE) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ Only the captain and first mate can invite new members!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Check if target user has a character
    const targetPlayer = await Player.findByUserId(targetUser.id, interaction.guild.id);
    if (!targetPlayer) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ That user doesn\'t have a character yet!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Check if target is already in a crew
    if (targetPlayer.crew_id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ That user is already in a crew!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Check crew capacity
    if (crew.member_count >= 20) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ Your crew is at maximum capacity (20 members)!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Create invitation
    const inviteContainer = new ContainerBuilder()
        .setAccentColor(COLORS.PRIMARY)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🏴‍☠️ Crew Invitation 🏴‍☠️**\n${targetUser}, you've been invited to join **${crew.name}**!`),
            textDisplay => textDisplay
                .setContent(`**Captain:** ${playerMember.character_name}\n**Current Members:** ${crew.member_count}/20\n**Crew Bounty:** ₿${crew.bounty.toLocaleString()}`)
        );

    const inviteSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`${targetUser}, do you want to join this crew?`)
        )
        .setButtonAccessory(
            button => button
                .setCustomId(`crew_invite_accept_${crew.id}_${targetUser.id}`)
                .setLabel('⚓ Join Crew')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({
        components: [inviteContainer, inviteSection],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
}

async function handleCrewKick(interaction, player) {
    const targetUser = interaction.options.getUser('user');

    // Check if player is captain
    if (!player.crew_id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You need to be in a crew!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const crew = await Crew.findById(player.crew_id);
    const playerMember = await crew.getMember(player.id);

    if (playerMember.role !== CREW_ROLES.CAPTAIN) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ Only the captain can remove crew members!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Check if target is in the crew
    const targetPlayer = await Player.findByUserId(targetUser.id, interaction.guild.id);
    if (!targetPlayer || targetPlayer.crew_id !== crew.id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ That user is not in your crew!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Cannot kick yourself (captain)
    if (targetPlayer.id === player.id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You cannot remove yourself as captain! Use `/crew leave` to leave the crew.');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Create kick confirmation
    const kickContainer = new ContainerBuilder()
        .setAccentColor(COLORS.WARNING)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**⚠️ Remove Crew Member**\n*${targetPlayer.character_name}*`),
            textDisplay => textDisplay
                .setContent(`Are you sure you want to remove this member from **${crew.name}**? This action cannot be undone.`)
        );

    const confirmSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('Choose your action:')
        )
        .setButtonAccessory(
            button => button
                .setCustomId(`crew_kick_confirm_${targetPlayer.id}`)
                .setLabel('⚠️ Remove Member')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({
        components: [kickContainer, confirmSection],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleCrewLeave(interaction, player) {
    if (!player.crew_id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You are not in a crew!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const crew = await Crew.findById(player.crew_id);
    const playerMember = await crew.getMember(player.id);

    // Special handling for captain leaving
    if (playerMember.role === CREW_ROLES.CAPTAIN) {
        const members = await crew.getMembers();
        
        if (members.length > 1) {
            const leaveContainer = new ContainerBuilder()
                .setAccentColor(COLORS.WARNING)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**⚠️ Captain Leaving Crew**\n*${crew.name}*`),
                    textDisplay => textDisplay
                        .setContent(`As the captain, leaving will disband the entire crew and remove all ${members.length} members. This action cannot be undone.`)
                );

            const confirmSection = new SectionBuilder()
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('Are you sure you want to disband your crew?')
                )
                .setButtonAccessory(
                    button => button
                        .setCustomId(`crew_disband_confirm`)
                        .setLabel('💥 Disband Crew')
                        .setStyle(ButtonStyle.Danger)
                );

            return await interaction.reply({
                components: [leaveContainer, confirmSection],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        } else {
            // Captain is only member, safe to leave
            await crew.delete();
            
            const successDisplay = new TextDisplayBuilder()
                .setContent(`✅ You have disbanded **${crew.name}** and are no longer a captain.`);

            return await interaction.reply({
                components: [successDisplay],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: false
            });
        }
    } else {
        // Regular member leaving
        const leaveContainer = new ContainerBuilder()
            .setAccentColor(COLORS.WARNING)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**⚠️ Leave Crew**\n*${crew.name}*`),
                textDisplay => textDisplay
                    .setContent(`Are you sure you want to leave **${crew.name}**? You'll need a new invitation to rejoin.`)
            );

        const confirmSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('Choose your action:')
            )
            .setButtonAccessory(
                button => button
                    .setCustomId(`crew_leave_confirm`)
                    .setLabel('🚪 Leave Crew')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({
            components: [leaveContainer, confirmSection],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
}

async function handleCrewRole(interaction, player) {
    const targetUser = interaction.options.getUser('user');
    const newRole = interaction.options.getString('new_role');

    // Check permissions
    if (!player.crew_id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ You need to be in a crew!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const crew = await Crew.findById(player.crew_id);
    const playerMember = await crew.getMember(player.id);

    if (playerMember.role !== CREW_ROLES.CAPTAIN) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ Only the captain can change crew member roles!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Check if target is in crew
    const targetPlayer = await Player.findByUserId(targetUser.id, interaction.guild.id);
    if (!targetPlayer || targetPlayer.crew_id !== crew.id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ That user is not in your crew!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Cannot change captain's role or change yourself
    const targetMember = await crew.getMember(targetPlayer.id);
    if (targetMember.role === CREW_ROLES.CAPTAIN || targetPlayer.id === player.id) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ Cannot change the captain\'s role!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Update role
    await crew.updateMemberRole(targetPlayer.id, newRole);

    const successContainer = new ContainerBuilder()
        .setAccentColor(COLORS.SUCCESS)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**✅ Role Updated**\n*${crew.name}*`),
            textDisplay => textDisplay
                .setContent(`**${targetPlayer.character_name}** is now the crew's **${getRoleEmoji(newRole)} ${capitalizeFirst(newRole)}**!`)
        );

    await interaction.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
}

async function handleCrewLeaderboard(interaction) {
    const topCrews = await Crew.getTopCrews(interaction.guild.id, 10);

    if (topCrews.length === 0) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ No crews found in this server yet. Be the first to create one with `/crew create`!');

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
                .setContent(`**🏆 ${interaction.guild.name} Crew Leaderboard 🏆**\n*Most notorious crews of the Grand Line*`)
        );

    const components = [leaderboardContainer];

    // Top 5 crews
    const topFive = topCrews.slice(0, 5);
    let topFiveText = '';
    topFive.forEach((crew, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        topFiveText += `${medal} **${crew.name}**\n`;
        topFiveText += `   Captain: ${crew.captain_name}\n`;
        topFiveText += `   Bounty: ₿${crew.bounty.toLocaleString()} | Members: ${crew.member_count}\n\n`;
    });

    const topSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(topFiveText)
        );
    
    components.push(topSection);

    // Bottom 5 crews if they exist
    const bottomFive = topCrews.slice(5, 10);
    if (bottomFive.length > 0) {
        let bottomFiveText = '';
        bottomFive.forEach((crew, index) => {
            const rank = index + 6;
            bottomFiveText += `${rank}. **${crew.name}**\n`;
            bottomFiveText += `   Captain: ${crew.captain_name}\n`;
            bottomFiveText += `   Bounty: ₿${crew.bounty.toLocaleString()} | Members: ${crew.member_count}\n\n`;
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

function getRoleEmoji(role) {
    const emojis = {
        captain: '👑',
        first_mate: '🥇',
        cook: '👨‍🍳',
        navigator: '🧭',
        doctor: '⚕️',
        shipwright: '🔨',
        musician: '🎵',
        fighter: '⚔️'
    };
    return emojis[role] || '⚔️';
}
