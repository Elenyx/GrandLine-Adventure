const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`[BOT] Ready! Logged in as ${client.user.tag}`);
        console.log(`[BOT] Serving ${client.guilds.cache.size} guilds`);
        
        // Set bot activity status
        client.user.setActivity('the Grand Line 🏴‍☠️', { 
            type: ActivityType.Watching 
        });

        // Log some statistics
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        console.log(`[BOT] Monitoring ${totalUsers} total users across all guilds`);

        // Initialize global objects for component state management
        global.characterCreation = {};
        global.characterCreationModals = {};
        global.questSessions = {};
        global.combatSessions = {};

        console.log('[BOT] One Piece RPG Bot is ready for adventure!');
        console.log('[BOT] Set sail for the Grand Line! 🌊');
    },
};
