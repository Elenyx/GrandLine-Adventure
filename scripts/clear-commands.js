const { REST, Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
    console.error('DISCORD_TOKEN and CLIENT_ID must be set in environment variables');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Clearing global application commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Global commands cleared.');

        if (guildId) {
            console.log('Clearing guild commands for', guildId);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('Guild commands cleared.');
        } else {
            console.log('No GUILD_ID provided; skip clearing guild commands.');
        }
    } catch (err) {
        console.error('Failed to clear commands:', err);
        process.exit(1);
    }
})();
