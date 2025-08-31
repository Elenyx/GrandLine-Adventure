const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');

// Create character profile embed
function createCharacterEmbed(player) {
    const embed = new EmbedBuilder()
        .setTitle(`🏴‍☠️ ${player.character_name}`)
        .setColor(COLORS.PRIMARY)
        .addFields(
            {
                name: '📊 Basic Info',
                value: `**Level:** ${player.level}\n**XP:** ${player.experience}/${player.getRequiredXP()}\n**Race:** ${capitalizeFirst(player.race)}\n**Origin:** ${capitalizeFirst(player.origin)}`,
                inline: true
            },
            {
                name: '⚔️ Combat Stats',
                value: `**STR:** ${player.strength}\n**AGI:** ${player.agility}\n**DUR:** ${player.durability}\n**INT:** ${player.intelligence}`,
                inline: true
            },
            {
                name: '💰 Resources',
                value: `**Gold:** 🪙${player.gold.toLocaleString()}\n**Bounty:** ₿${player.bounty.toLocaleString()}\n**Faction:** ${capitalizeFirst(player.faction)}`,
                inline: true
            }
        )
        .addFields(
            {
                name: '🎯 Dream',
                value: getDreamText(player.dream),
                inline: true
            },
            {
                name: '📍 Location',
                value: capitalizeFirst(player.location),
                inline: true
            }
        )
        .setFooter({ text: `Created ${player.created_at.toLocaleDateString()}` })
        .setTimestamp();

    return embed;
}

// Create quest embed
function createQuestEmbed(quest) {
    const embed = new EmbedBuilder()
        .setTitle(quest.name)
        .setDescription(quest.description)
        .setColor(quest.is_main_story ? COLORS.GOLD : COLORS.PRIMARY)
        .addFields(
            {
                name: '📚 Arc',
                value: quest.arc,
                inline: true
            },
            {
                name: '⭐ Difficulty',
                value: '⭐'.repeat(quest.difficulty),
                inline: true
            },
            {
                name: '🎁 Rewards',
                value: formatQuestRewards(quest.rewards),
                inline: true
            }
        );

    if (quest.min_level || quest.max_level) {
        embed.addFields({
            name: '📋 Requirements',
            value: `Level ${quest.min_level || '1'}-${quest.max_level || '∞'}`,
            inline: true
        });
    }

    if (quest.location) {
        embed.addFields({
            name: '📍 Location',
            value: capitalizeFirst(quest.location),
            inline: true
        });
    }

    embed.setFooter({ text: quest.is_main_story ? 'Main Story Quest' : 'Side Quest' });

    return embed;
}

// Create crew embed
function createCrewEmbed(crew, members = []) {
    const embed = new EmbedBuilder()
        .setTitle(`🏴‍☠️ ${crew.name}`)
        .setColor(COLORS.NAVY)
        .addFields(
            {
                name: '💰 Crew Stats',
                value: `**Bounty:** ₿${crew.bounty.toLocaleString()}\n**Reputation:** ${crew.reputation}\n**Members:** ${crew.member_count}/20`,
                inline: true
            },
            {
                name: '📍 Location',
                value: capitalizeFirst(crew.location),
                inline: true
            }
        );

    if (crew.motto) {
        embed.addFields({
            name: '📜 Crew Motto',
            value: `"${crew.motto}"`,
            inline: false
        });
    }

    if (members && members.length > 0) {
        const captain = members.find(m => m.role === 'captain');
        if (captain) {
            embed.addFields({
                name: '👑 Captain',
                value: `${captain.character_name} (Lv.${captain.level})`,
                inline: true
            });
        }

        const memberList = members
            .filter(m => m.role !== 'captain')
            .slice(0, 8)
            .map(m => `${getRoleEmoji(m.role)} ${m.character_name}`)
            .join('\n');

        if (memberList) {
            embed.addFields({
                name: '👥 Crew Members',
                value: memberList || 'None',
                inline: false
            });
        }
    }

    embed.setFooter({ text: `Crew established ${crew.created_at.toLocaleDateString()}` })
        .setTimestamp();

    return embed;
}

// Create error embed
function createErrorEmbed(message, details = null) {
    const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription(message)
        .setColor(COLORS.ERROR)
        .setTimestamp();

    if (details) {
        embed.addFields({
            name: 'Details',
            value: details,
            inline: false
        });
    }

    return embed;
}

// Create success embed
function createSuccessEmbed(message, details = null) {
    const embed = new EmbedBuilder()
        .setTitle('✅ Success')
        .setDescription(message)
        .setColor(COLORS.SUCCESS)
        .setTimestamp();

    if (details) {
        embed.addFields({
            name: 'Details',
            value: details,
            inline: false
        });
    }

    return embed;
}

// Create info embed
function createInfoEmbed(title, message, color = COLORS.INFO) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(color)
        .setTimestamp();

    return embed;
}

// Create leaderboard embed
function createLeaderboardEmbed(title, players, guildName) {
    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${title}`)
        .setDescription(`*Top adventurers in ${guildName}*`)
        .setColor(COLORS.GOLD)
        .setTimestamp();

    if (players.length === 0) {
        embed.setDescription('No players found.');
        return embed;
    }

    const leaderboardText = players
        .map((player, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            return `${medal} **${player.character_name}** (Lv.${player.level}) - ₿${player.bounty.toLocaleString()}`;
        })
        .join('\n');

    embed.addFields({
        name: 'Rankings',
        value: leaderboardText,
        inline: false
    });

    return embed;
}

// Create battle result embed
function createBattleResultEmbed(winner, loser, result) {
    const embed = new EmbedBuilder()
        .setTitle('⚔️ Battle Results')
        .setColor(COLORS.WARNING)
        .addFields(
            {
                name: '👑 Winner',
                value: `**${winner.character_name}** (Lv.${winner.level})`,
                inline: true
            },
            {
                name: '💀 Loser',
                value: `**${loser.character_name}** (Lv.${loser.level})`,
                inline: true
            },
            {
                name: '📊 Battle Summary',
                value: `**Rounds:** ${result.rounds}\n**Damage Dealt:** ${result.totalDamage}\n**Critical Hits:** ${result.criticalHits}`,
                inline: false
            }
        );

    if (result.rewards) {
        embed.addFields({
            name: '🎁 Rewards',
            value: formatBattleRewards(result.rewards),
            inline: false
        });
    }

    embed.setTimestamp();
    return embed;
}

// Create ally embed
function createAllyEmbed(ally) {
    const embed = new EmbedBuilder()
        .setTitle(ally.name)
        .setDescription(ally.description)
        .setColor(getRarityColor(ally.rarity))
        .addFields(
            {
                name: '⭐ Rarity',
                value: capitalizeFirst(ally.rarity),
                inline: true
            },
            {
                name: '🎯 Buffs',
                value: formatAllyBuffs(ally.buffs),
                inline: true
            }
        );

    if (ally.faction) {
        embed.addFields({
            name: '⚓ Faction',
            value: capitalizeFirst(ally.faction),
            inline: true
        });
    }

    if (ally.origin_arc) {
        embed.addFields({
            name: '📚 Origin Arc',
            value: ally.origin_arc,
            inline: true
        });
    }

    if (ally.image_url) {
        embed.setThumbnail(ally.image_url);
    }

    return embed;
}

// Helper functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
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

function getRarityColor(rarity) {
    const colors = {
        common: 0x808080,
        uncommon: 0x00FF00,
        rare: 0x0080FF,
        epic: 0x8000FF,
        legendary: 0xFF8000
    };
    return colors[rarity] || COLORS.PRIMARY;
}

function formatQuestRewards(rewards) {
    const parts = [];
    if (rewards.experience) parts.push(`🌟 ${rewards.experience} XP`);
    if (rewards.gold) parts.push(`🪙 ${rewards.gold} Gold`);
    if (rewards.bounty) parts.push(`₿ ${rewards.bounty.toLocaleString()} Bounty`);
    if (rewards.ship) parts.push(`🚢 ${capitalizeFirst(rewards.ship)}`);
    if (rewards.ally) parts.push(`👥 ${rewards.ally}`);
    return parts.join('\n') || 'Various rewards';
}

function formatBattleRewards(rewards) {
    const parts = [];
    if (rewards.experience) parts.push(`🌟 ${rewards.experience} XP`);
    if (rewards.gold) parts.push(`🪙 ${rewards.gold} Gold`);
    if (rewards.bounty) parts.push(`₿ ${rewards.bounty.toLocaleString()} Bounty`);
    return parts.join('\n') || 'No rewards';
}

function formatAllyBuffs(buffs) {
    const parts = [];
    for (const [key, value] of Object.entries(buffs)) {
        const buffName = capitalizeFirst(key.replace('_', ' '));
        parts.push(`${buffName}: +${value}`);
    }
    return parts.join('\n') || 'No buffs';
}

module.exports = {
    createCharacterEmbed,
    createQuestEmbed,
    createCrewEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createInfoEmbed,
    createLeaderboardEmbed,
    createBattleResultEmbed,
    createAllyEmbed,
    capitalizeFirst,
    getDreamText,
    getRoleEmoji,
    getRarityColor,
    formatQuestRewards,
    formatBattleRewards,
    formatAllyBuffs
};
