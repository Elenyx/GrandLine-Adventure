const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];

// Grab all the command files from the commands directory
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
    console.log(`Loading command: ${file}`);
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.`);
        
        // Check if we have required environment variables
        if (!process.env.DISCORD_TOKEN) {
            throw new Error('DISCORD_TOKEN is required in environment variables');
        }
        
        if (!process.env.CLIENT_ID) {
            throw new Error('CLIENT_ID is required in environment variables');
        }

        let data;

        // Check if GUILD_ID is provided for guild-specific deployment (faster for development)
        if (process.env.GUILD_ID) {
            console.log(`📍 Deploying commands to guild: ${process.env.GUILD_ID}`);
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} guild (/) commands.`);
        } else {
            // Global deployment (takes up to 1 hour to propagate)
            console.log('🌍 Deploying commands globally (this may take up to 1 hour to propagate)...');
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} global (/) commands.`);
        }

        console.log('\n📋 Deployed commands:');
        data.forEach((command, index) => {
            console.log(`${index + 1}. /${command.name} - ${command.description}`);
        });

        console.log('\n🎉 Command deployment completed successfully!');
        console.log('\nNote: If deployed globally, commands may take up to 1 hour to appear in Discord.');
        console.log('For faster testing, set GUILD_ID in your .env file for guild-specific deployment.');

    } catch (error) {
        console.error('\n❌ Error deploying commands:');
        
        if (error.code === 50001) {
            console.error('Missing Access - Check if bot is in the guild and has application.commands scope');
        } else if (error.code === 50013) {
            console.error('Missing Permissions - Bot needs Administrator or appropriate permissions');
        } else if (error.code === 10003) {
            console.error('Unknown Channel - Check if GUILD_ID is correct');
        } else if (error.rawError?.message?.includes('Invalid Form Body')) {
            console.error('Invalid command structure - Check command data format');
            console.error('Commands that failed validation:');
            error.rawError.errors?.forEach((err, index) => {
                console.error(`  ${index + 1}. ${err.message}`);
            });
        } else {
            console.error(error);
        }
        
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Verify DISCORD_TOKEN and CLIENT_ID in .env file');
        console.log('2. Ensure bot has been invited to the guild with proper permissions');
        console.log('3. Check that all command files have valid structure');
        console.log('4. For guild deployment, verify GUILD_ID is correct');
        
        process.exit(1);
    }
})();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Deployment interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️  Deployment terminated');
    process.exit(0);
});
