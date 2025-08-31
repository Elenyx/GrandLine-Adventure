const { Events } = require('discord.js');
const Player = require('../database/models/Player');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Only process messages in guilds
        if (!message.guild) return;

        try {
            // Check if user has a character and give small XP for activity
            const player = await Player.findByUserId(message.author.id, message.guild.id);
            
            if (player) {
                // Give 1-3 XP for being active (with cooldown to prevent spam)
                const now = Date.now();
                const lastXpKey = `lastXp_${message.author.id}`;
                
                // Use a simple in-memory cooldown (5 minutes)
                if (!global.xpCooldowns) {
                    global.xpCooldowns = {};
                }
                
                const lastXpTime = global.xpCooldowns[lastXpKey] || 0;
                const cooldownTime = 5 * 60 * 1000; // 5 minutes
                
                if (now - lastXpTime >= cooldownTime) {
                    const xpGain = Math.floor(Math.random() * 3) + 1; // 1-3 XP
                    const leveledUp = await player.addExperience(xpGain);
                    
                    global.xpCooldowns[lastXpKey] = now;
                    
                    // Notify on level up
                    if (leveledUp) {
                        try {
                            await message.react('🌟');
                            
                            // Send level up message (optional - can be disabled to reduce spam)
                            if (Math.random() < 0.3) { // 30% chance to send message
                                await message.reply({
                                    content: `🌟 **${player.character_name}** leveled up to **Level ${player.level}**! 🌟`,
                                    allowedMentions: { repliedUser: false }
                                });
                            }
                        } catch (error) {
                            // Ignore reaction/reply errors (permissions, etc.)
                        }
                    }
                }
            }

            // Handle certain keywords for roleplay enhancement
            const content = message.content.toLowerCase();
            
            // React to One Piece related keywords
            if (content.includes('one piece') || content.includes('pirate king')) {
                try {
                    await message.react('👑');
                } catch (error) {
                    // Ignore reaction errors
                }
            } else if (content.includes('devil fruit')) {
                try {
                    await message.react('🍎');
                } catch (error) {
                    // Ignore reaction errors
                }
            } else if (content.includes('marine') || content.includes('navy')) {
                try {
                    await message.react('⚓');
                } catch (error) {
                    // Ignore reaction errors
                }
            } else if (content.includes('grand line')) {
                try {
                    await message.react('🌊');
                } catch (error) {
                    // Ignore reaction errors
                }
            }

            // Log message for moderation/statistics (optional)
            if (content.includes('!debug') && message.member && message.member.permissions.has('Administrator')) {
                const stats = {
                    totalMessages: global.messageCount || 0,
                    activeUsers: Object.keys(global.xpCooldowns || {}).length,
                    uptime: process.uptime()
                };
                global.messageCount = (global.messageCount || 0) + 1;
                
                await message.reply({
                    content: `**Bot Debug Info:**
• Total messages processed: ${stats.totalMessages}
• Active users (last 5 min): ${stats.activeUsers}
• Bot uptime: ${Math.floor(stats.uptime / 60)} minutes`,
                    allowedMentions: { repliedUser: false }
                });
            }

        } catch (error) {
            console.error('[ERROR] Error in messageCreate event:', error);
            // Don't reply with error in message events to prevent spam
        }
    },
};
