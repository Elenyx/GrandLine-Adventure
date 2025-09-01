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
        console.log('Fetching global application commands...');
        const global = await rest.get(Routes.applicationCommands(clientId));
        console.log(`Global commands (${global.length}):`);
        global.forEach(cmd => console.log(` - ${cmd.name} (${cmd.id})`));

        if (guildId) {
            console.log('\nFetching guild commands for', guildId);
            const guild = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
            console.log(`Guild commands (${guild.length}):`);
            guild.forEach(cmd => console.log(` - ${cmd.name} (${cmd.id})`));
        } else {
            console.log('\nNo GUILD_ID provided; skip listing guild commands.');
        }
    } catch (err) {
        console.error('Failed to list commands:', err);
        process.exit(1);
    }
})();
