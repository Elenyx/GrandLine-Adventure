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

// --- Recursive Component Loader ---
// This function will find all component handlers, even in subdirectories,
// and correctly loads files that export single objects, arrays of objects, or multiple handlers.
function loadComponents(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadComponents(fullPath);
        } else if (file.name.endsWith('.js')) {
            try {
                const componentExports = require(fullPath);
                
                // Handle different export styles (single object, array of objects, etc.)
                const handlers = Array.isArray(componentExports) ? componentExports : Object.values(componentExports);

                for (const handler of handlers) {
                    if (handler && typeof handler.customId !== 'undefined' && typeof handler.execute === 'function') {
                        const id = handler.customId instanceof RegExp ? handler.customId.toString() : handler.customId;
                        if (client.components.has(id)) {
                             console.warn(`[WARNING] Duplicate component customId found: ${id}. Overwriting.`);
                        }
                        // Store the component with its customId (string or regex string) as the key
                        client.components.set(id, handler);
                        console.log(`[COMPONENT] Loaded ${id}`);
                    }
                }
            } catch (error) {
                console.error(`[ERROR] Failed to load components from ${fullPath}:`, error);
            }
        }
    }
}

const componentsPath = path.join(__dirname, 'components');
console.log('[COMPONENT] Loading components...');
loadComponents(componentsPath);
console.log(`[COMPONENT] Total components loaded: ${client.components.size}`);


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
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
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
