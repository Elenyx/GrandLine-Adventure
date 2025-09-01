const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const { getErrorLogChannel, setErrorLogChannel, getAllMappings } = require('../utils/errorLogStore');
const Player = require('../database/models/Player');
const Quest = require('../database/models/Quest');
const Crew = require('../database/models/Crew');
const Ally = require('../database/models/Ally');
const { COLORS } = require('../config/constants');
const { query } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands for bot management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View bot statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset a player\'s character')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Give items to a player')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to give items to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of item to give')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Experience', value: 'experience' },
                            { name: 'Gold', value: 'gold' },
                            { name: 'Bounty', value: 'bounty' },
                            { name: 'Levels', value: 'levels' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to give')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('broadcast')
                .setDescription('Send a server-wide announcement')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Announcement message')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('event')
                .setDescription('Start a server event')
                .addStringOption(option =>
                    option.setName('event_type')
                        .setDescription('Type of event to start')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Double XP', value: 'double_xp' },
                            { name: 'Treasure Hunt', value: 'treasure_hunt' },
                            { name: 'Marine Raid', value: 'marine_raid' },
                            { name: 'Full Moon (Mink)', value: 'full_moon' }
                        ))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                        .setMinValue(5)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Clean up inactive players')
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Days of inactivity threshold')
                        .setRequired(true)
                        .setMinValue(30)
                        .setMaxValue(365)))
        .addSubcommand(sub => sub
            .setName('set-error-log')
            .setDescription('Set or change the error log channel for this server')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to receive error logs').setRequired(true))
        )
    ,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'stats':
                    await handleBotStats(interaction);
                    break;
                case 'reset':
                    await handlePlayerReset(interaction);
                    break;
                case 'give':
                    await handleGiveItems(interaction);
                    break;
                case 'broadcast':
                    await handleBroadcast(interaction);
                    break;
                case 'event':
                    await handleServerEvent(interaction);
                    break;
                case 'cleanup':
                    await handleCleanup(interaction);
                    break;
                case 'set-error-log':
                    {
                        const channel = interaction.options.getChannel('channel');
                        try {
                            setErrorLogChannel(interaction.guild.id, channel.id);
                            await interaction.reply({ content: `Error log channel set to ${channel}.`, ephemeral: true });
                        } catch (err) {
                            console.error('Failed to set error log channel:', err);
                            await interaction.reply({ content: 'Failed to set error log channel.', ephemeral: true });
                        }
                    }
                    break;
                
                default:
                    await interaction.reply({
                        content: 'Unknown admin command.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in admin command:', error);
            const reply = { 
                content: 'There was an error executing this admin command!', 
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


async function handleBotStats(interaction) {
    // Get database statistics
    const playerStats = await query('SELECT COUNT(*) as total, AVG(level) as avg_level FROM players WHERE guild_id = $1', [interaction.guild.id]);
    const crewStats = await query('SELECT COUNT(*) as total, AVG(bounty) as avg_bounty FROM crews c JOIN players p ON c.captain_id = p.id WHERE p.guild_id = $1', [interaction.guild.id]);
    const questStats = await query('SELECT COUNT(*) as total FROM player_quests pq JOIN players p ON pq.player_id = p.id WHERE p.guild_id = $1', [interaction.guild.id]);
    
    const totalPlayers = parseInt(playerStats.rows[0].total);
    const avgLevel = parseFloat(playerStats.rows[0].avg_level) || 0;
    const totalCrews = parseInt(crewStats.rows[0].total);
    const avgBounty = parseFloat(crewStats.rows[0].avg_bounty) || 0;
    const totalQuests = parseInt(questStats.rows[0].total);

    // Get top player
    const topPlayer = await query(`
        SELECT character_name, level, bounty 
        FROM players 
        WHERE guild_id = $1 
        ORDER BY level DESC, bounty DESC 
        LIMIT 1
    `, [interaction.guild.id]);

    // Get top crew
    const topCrew = await query(`
        SELECT c.name, c.bounty, p.character_name as captain_name
        FROM crews c 
        JOIN players p ON c.captain_id = p.id 
        WHERE p.guild_id = $1 
        ORDER BY c.bounty DESC 
        LIMIT 1
    `, [interaction.guild.id]);

    const statsContainer = new ContainerBuilder()
        .setAccentColor(COLORS.INFO)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📊 Bot Statistics**\n*${interaction.guild.name}*`),
            textDisplay => textDisplay
                .setContent(`**Players:** ${totalPlayers}\n**Average Level:** ${avgLevel.toFixed(1)}\n**Total Crews:** ${totalCrews}\n**Active Quests:** ${totalQuests}`)
        );

    const components = [statsContainer];

    if (topPlayer.rows.length > 0) {
        const player = topPlayer.rows[0];
        const topPlayerSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**🏆 Top Player**\n**${player.character_name}**\nLevel ${player.level} • ₿${player.bounty.toLocaleString()}`)
            );
        components.push(topPlayerSection);
    }

    if (topCrew.rows.length > 0) {
        const crew = topCrew.rows[0];
        const topCrewSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**🏴‍☠️ Top Crew**\n**${crew.name}**\nCaptain: ${crew.captain_name} • ₿${crew.bounty.toLocaleString()}`)
            );
        components.push(topCrewSection);
    }

    await interaction.reply({
        components: components,
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handlePlayerReset(interaction) {
    const targetUser = interaction.options.getUser('user');
    const player = await Player.findByUserId(targetUser.id, interaction.guild.id);

    if (!player) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ That user doesn\'t have a character to reset!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const confirmContainer = new ContainerBuilder()
        .setAccentColor(COLORS.WARNING)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**⚠️ Reset Player Character**\n*${player.character_name} (${targetUser.username})*`),
            textDisplay => textDisplay
                .setContent(`This will permanently delete:\n• All character progress\n• Crew membership\n• Quest progress\n• Allies\n\n**This action cannot be undone!**`)
        );

    const confirmSection = new SectionBuilder()
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('Are you absolutely sure?')
        )
        .setButtonAccessory(
            button => button
                .setCustomId(`admin_reset_confirm_${player.id}`)
                .setLabel('💥 RESET CHARACTER')
                .setStyle('Danger')
        );

    await interaction.reply({
        components: [confirmContainer, confirmSection],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleGiveItems(interaction) {
    const targetUser = interaction.options.getUser('user');
    const itemType = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');

    const player = await Player.findByUserId(targetUser.id, interaction.guild.id);

    if (!player) {
        const errorDisplay = new TextDisplayBuilder()
            .setContent('❌ That user doesn\'t have a character!');

        return await interaction.reply({
            components: [errorDisplay],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    let updateMessage = '';
    let leveledUp = false;

    switch (itemType) {
        case 'experience':
            leveledUp = await player.addExperience(amount);
            updateMessage = `Added ${amount} experience`;
            break;
        case 'gold':
            player.gold += amount;
            await player.save();
            updateMessage = `Added 🪙${amount} gold`;
            break;
        case 'bounty':
            player.bounty += amount;
            await player.save();
            updateMessage = `Added ₿${amount.toLocaleString()} bounty`;
            break;
        case 'levels':
            for (let i = 0; i < amount; i++) {
                player.level++;
                player.strength += Math.floor(Math.random() * 3) + 2;
                player.agility += Math.floor(Math.random() * 3) + 2;
                player.durability += Math.floor(Math.random() * 3) + 2;
                player.intelligence += Math.floor(Math.random() * 3) + 2;
            }
            await player.save();
            updateMessage = `Added ${amount} levels`;
            leveledUp = amount > 0;
            break;
    }

    const successContainer = new ContainerBuilder()
        .setAccentColor(COLORS.SUCCESS)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**✅ Items Given**\n*${player.character_name}*`),
            textDisplay => textDisplay
                .setContent(`${updateMessage}\n${leveledUp ? '\n🎉 **LEVEL UP!**' : ''}`)
        );

    await interaction.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
}

async function handleBroadcast(interaction) {
    const message = interaction.options.getString('message');

    const broadcastContainer = new ContainerBuilder()
        .setAccentColor(COLORS.GOLD)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📢 Server Announcement**\n*From the Admiralty*`),
            textDisplay => textDisplay
                .setContent(message)
        );

    await interaction.reply({
        components: [broadcastContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });

    // Acknowledge to admin
    const confirmDisplay = new TextDisplayBuilder()
        .setContent('✅ Announcement sent successfully!');

    await interaction.followUp({
        components: [confirmDisplay],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleServerEvent(interaction) {
    const eventType = interaction.options.getString('event_type');
    const duration = interaction.options.getInteger('duration');

    const eventNames = {
        double_xp: 'Double Experience Event',
        treasure_hunt: 'Treasure Hunt Event',
        marine_raid: 'Marine Raid Event',
        full_moon: 'Full Moon Event (Mink Bonus)'
    };

    const eventDescriptions = {
        double_xp: 'All players receive double experience from quests and battles!',
        treasure_hunt: 'Hidden treasures have appeared across the Grand Line!',
        marine_raid: 'Marine forces are conducting raids - pirates beware!',
        full_moon: 'The full moon rises - Mink warriors gain tremendous power!'
    };

    const eventContainer = new ContainerBuilder()
        .setAccentColor(COLORS.GOLD)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🎉 ${eventNames[eventType]} Started! 🎉**\n*Duration: ${duration} minutes*`),
            textDisplay => textDisplay
                .setContent(eventDescriptions[eventType])
        );

    await interaction.reply({
        components: [eventContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });

    // Set timeout to end event
    setTimeout(async () => {
        try {
            const endContainer = new ContainerBuilder()
                .setAccentColor(COLORS.INFO)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**⏰ ${eventNames[eventType]} Ended**\n*Thank you for participating!*`)
                );

            await interaction.followUp({
                components: [endContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error ending event:', error);
        }
    }, duration * 60 * 1000);
}

async function handleCleanup(interaction) {
    const days = interaction.options.getInteger('days');

    await interaction.deferReply({ ephemeral: true });

    try {
        // Find inactive players
        const inactivePlayers = await query(`
            SELECT COUNT(*) as count
            FROM players 
            WHERE guild_id = $1 
            AND updated_at < NOW() - INTERVAL '${days} days'
        `, [interaction.guild.id]);

        const count = parseInt(inactivePlayers.rows[0].count);

        if (count === 0) {
            const noCleanupDisplay = new TextDisplayBuilder()
                .setContent(`✅ No players found inactive for more than ${days} days.`);

            return await interaction.editReply({
                components: [noCleanupDisplay],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const confirmContainer = new ContainerBuilder()
            .setAccentColor(COLORS.WARNING)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**⚠️ Cleanup Confirmation**\n*${count} players found*`),
                textDisplay => textDisplay
                    .setContent(`This will delete ${count} players who have been inactive for more than ${days} days.\n\n**This action cannot be undone!**`)
            );

        const confirmSection = new SectionBuilder()
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('Proceed with cleanup?')
            )
            .setButtonAccessory(
                button => button
                    .setCustomId(`admin_cleanup_confirm_${days}`)
                    .setLabel(`🗑️ Delete ${count} Players`)
                    .setStyle('Danger')
            );

        await interaction.editReply({
            components: [confirmContainer, confirmSection],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error in cleanup:', error);
        await interaction.editReply({
            content: 'Error occurred during cleanup operation.',
            components: []
        });
    }
}
