const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const { runMigrations } = require('./database/migrate');

// Initialize client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Initialize collections
client.commands = new Collection();
client.components = new Collection();

// --- Command Loader ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[COMMAND] Loaded ${command.data.name}`);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// --- Component Loader (uses a utility so we can test it) ---
const { loadComponentsFromDir } = require('./utils/componentLoader');

const componentsPath = path.join(__dirname, 'components');
console.log('[COMPONENT] Loading components...');
const loaded = loadComponentsFromDir(componentsPath);
client.components = loaded; // assign the map returned by the loader
console.log(`[COMPONENT] Total components loaded: ${client.components.size}`);

// Debug: print all registered component customIds for startup verification
try {
    const ids = Array.from(client.components.keys()).slice(0, 100).join(', ');
    console.log('[COMPONENT] Registered component customIds:', ids || '<none>');
} catch (err) {
    console.error('[COMPONENT] Failed to list component customIds:', err);
}


// --- Event Loader ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[EVENT] Loaded ${event.name}`);
}

// --- Global Error Handling ---
const { getAllMappings } = require('./utils/errorLogStore');

async function postErrorToChannels(client, payload) {
    try {
        const mappings = getAllMappings();
        for (const [guildId, channelId] of Object.entries(mappings)) {
            try {
                const guild = await client.guilds.fetch(guildId).catch(() => null);
                if (!guild) continue;
                const channel = await guild.channels.fetch(channelId).catch(() => null);
                if (!channel || !channel.isTextBased()) continue;

                // Keep message compact and easy to copy/paste
                const text = `**[ERROR]** ${payload.title}\n\n` +
                    `**Type:** ${payload.type}\n` +
                    `**Time:** ${payload.time}\n` +
                    `**Message:** ${payload.message}\n\n` +
                    `**Stack:**\n${payload.stack}\n\n` +
                    `**Metadata:** ${JSON.stringify(payload.meta || {}, null, 2)}`;

                await channel.send({ content: text });
            } catch (err) {
                console.error('Failed to send error log to channel', channelId, err);
            }
        }
    } catch (err) {
        console.error('Failed to iterate error log mappings:', err);
    }
}

process.on('unhandledRejection', async (reason, promise) => {
    try {
        console.error('Unhandled promise rejection:', reason);
        const payload = {
            title: 'Unhandled Promise Rejection',
            type: reason && reason.name ? reason.name : typeof reason,
            message: reason && reason.message ? reason.message : String(reason),
            stack: reason && reason.stack ? reason.stack : String(reason),
            time: new Date().toISOString(),
            meta: { promise: String(promise), nodeVersion: process.version }
        };
        await postErrorToChannels(client, payload);
    } catch (err) {
        console.error('Error handling unhandledRejection:', err);
    }
});

process.on('uncaughtException', async (error) => {
    try {
        console.error('Uncaught exception:', error);
        const payload = {
            title: 'Uncaught Exception',
            type: error && error.name ? error.name : typeof error,
            message: error && error.message ? error.message : String(error),
            stack: error && error.stack ? error.stack : String(error),
            time: new Date().toISOString(),
            meta: { pid: process.pid, nodeVersion: process.version }
        };
        await postErrorToChannels(client, payload);
    } catch (err) {
        console.error('Error handling uncaughtException reporter:', err);
    } finally {
        // allow some time to post before exiting
        setTimeout(() => process.exit(1), 1000);
    }
});

// --- Login to Discord (run migrations first) ---
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error("[FATAL] DISCORD_TOKEN environment variable is not set! The bot cannot log in.");
    process.exit(1);
}

(async () => {
    try {
        const migrateFlag = process.env.MIGRATE_ON_STARTUP;
        const isProduction = process.env.NODE_ENV === 'production';

        // Default: do not run migrations automatically in production unless explicitly enabled
        const shouldRunMigrations = migrateFlag ? migrateFlag.toLowerCase() === 'true' : !isProduction;

        if (shouldRunMigrations) {
            console.log('[STARTUP] Running database migrations...');
            await runMigrations();
            console.log('[STARTUP] Migrations complete.');
        } else {
            console.log(`[STARTUP] Skipping database migrations on startup (MIGRATE_ON_STARTUP=${migrateFlag || 'undefined'}, NODE_ENV=${process.env.NODE_ENV || 'undefined'}).`);
            console.log('[STARTUP] If you want to run migrations automatically on startup, set MIGRATE_ON_STARTUP=true.');
        }

        console.log('[STARTUP] Logging in to Discord...');
        await client.login(token);
    } catch (err) {
        console.error('[FATAL] Startup failed:', err);
        process.exit(1);
    }
})();
