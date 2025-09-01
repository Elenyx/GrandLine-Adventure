const { REST, Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.argv[2] || process.env.GUILD_ID;

if (!token || !clientId) {
    console.error('DISCORD_TOKEN and CLIENT_ID must be set in environment variables');
    process.exit(1);
}

if (!guildId) {
    console.error('GUILD_ID must be provided as the first argument or via the GUILD_ID env var');
    console.error('Usage: node scripts/clear-guild-commands.js <GUILD_ID>');
    process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Fetching guild commands for guild ${guildId}...`);
        const commands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));

        if (!Array.isArray(commands) || commands.length === 0) {
            console.log('No guild commands found to clear.');
            return;
        }

        console.log(`Found ${commands.length} guild commands. Deleting...`);
        for (const cmd of commands) {
            await rest.delete(Routes.applicationGuildCommand(clientId, guildId, cmd.id));
            console.log(`Deleted guild command: ${cmd.name} (${cmd.id})`);
        }

        console.log('Finished clearing guild commands.');
    } catch (err) {
        console.error('Error clearing guild commands:', err);
        process.exit(1);
    }
})();
