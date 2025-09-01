const { Events, MessageFlags } = require('discord.js');
const { TextDisplayBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // --- Slash Command Handling ---
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
                    return;
                }

                try {
                    await command.execute(interaction);
                    console.log(`[COMMAND] ${interaction.user.tag} in #${interaction.channel.name} triggered /${interaction.commandName}`);
                } catch (error) {
                    console.error(`[ERROR] Error executing /${interaction.commandName}:`, error);
                    const errorDisplay = new TextDisplayBuilder().setContent('❌ There was an error while executing this command!');
                    const reply = { components: [errorDisplay], flags: MessageFlags.IsComponentsV2, ephemeral: true };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(reply);
                    } else {
                        await interaction.reply(reply);
                    }
                }
            }
            // --- Component Handling (Buttons, Select Menus, Modals) ---
            else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
                let handler;

                // Fast path: try direct lookup for string customIds
                if (interaction.client.components.has(interaction.customId)) {
                    handler = interaction.client.components.get(interaction.customId);
                } else {
                    // Fallback: iterate handlers to test regex customIds
                    for (const component of interaction.client.components.values()) {
                        if (component.customId instanceof RegExp) {
                            if (component.customId.test(interaction.customId)) {
                                handler = component;
                                break;
                            }
                        } else if (component.customId === interaction.customId) {
                            handler = component;
                            break;
                        }
                    }
                }

                if (handler) {
                    try {
                        await handler.execute(interaction);
                        console.log(`[COMPONENT] ${interaction.user.tag} in #${interaction.channel.name} triggered ${interaction.customId}`);
                    } catch (error) {
                        console.error(`[ERROR] Error handling component ${interaction.customId}:`, error);
                        const errorDisplay = new TextDisplayBuilder().setContent('❌ There was an error responding to this interaction!');
                        const reply = { components: [errorDisplay], flags: MessageFlags.IsComponentsV2, ephemeral: true };
                        if (!interaction.replied && !interaction.deferred) {
                           await interaction.reply(reply);
                        } else {
                           await interaction.followUp(reply);
                        }
                    }
                } else {
                    console.warn(`[WARNING] No handler found for component: ${interaction.customId}`);
                    const errorDisplay = new TextDisplayBuilder().setContent('🤔 This interaction may have expired.');
                    if (!interaction.replied && !interaction.deferred) {
                       await interaction.reply({ components: [errorDisplay], flags: MessageFlags.IsComponentsV2, ephemeral: true });
                    }
                }
            }
        } catch (error) {
            console.error('[ERROR] A critical error occurred in the interactionCreate event:', error);
        }
    },
};
