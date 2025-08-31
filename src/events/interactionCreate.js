const { Events, MessageFlags } = require('discord.js');
const { TextDisplayBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
                    return;
                }

                try {
                    await command.execute(interaction);
                    console.log(`[COMMAND] ${interaction.user.tag} executed /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);
                } catch (error) {
                    console.error(`[ERROR] Error executing command ${interaction.commandName}:`, error);
                    
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ There was an error while executing this command!');

                    const reply = {
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(reply);
                    } else {
                        await interaction.reply(reply);
                    }
                }
            }
            // Handle button interactions
            else if (interaction.isButton()) {
                const buttonHandler = interaction.client.components.get(interaction.customId);
                
                if (buttonHandler) {
                    try {
                        await buttonHandler.execute(interaction);
                        console.log(`[BUTTON] ${interaction.user.tag} clicked button ${interaction.customId} in ${interaction.guild?.name || 'DM'}`);
                    } catch (error) {
                        console.error(`[ERROR] Error handling button ${interaction.customId}:`, error);
                        
                        const errorDisplay = new TextDisplayBuilder()
                            .setContent('❌ There was an error handling this button!');

                        await interaction.reply({
                            components: [errorDisplay],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: true
                        });
                    }
                } else {
                    // Check for pattern-based button handlers
                    let handled = false;
                    for (const [customId, handler] of interaction.client.components) {
                        if (handler.customId instanceof RegExp && handler.customId.test(interaction.customId)) {
                            try {
                                await handler.execute(interaction);
                                console.log(`[BUTTON] ${interaction.user.tag} clicked pattern button ${interaction.customId} in ${interaction.guild?.name || 'DM'}`);
                                handled = true;
                                break;
                            } catch (error) {
                                console.error(`[ERROR] Error handling pattern button ${interaction.customId}:`, error);
                                break;
                            }
                        }
                    }

                    if (!handled) {
                        console.warn(`[WARNING] No handler found for button: ${interaction.customId}`);
                        
                        const errorDisplay = new TextDisplayBuilder()
                            .setContent('❌ This button is no longer available or has expired.');

                        await interaction.reply({
                            components: [errorDisplay],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: true
                        });
                    }
                }
            }
            // Handle select menu interactions
            else if (interaction.isStringSelectMenu()) {
                const selectHandler = interaction.client.components.get(interaction.customId);
                
                if (selectHandler) {
                    try {
                        await selectHandler.execute(interaction);
                        console.log(`[SELECT] ${interaction.user.tag} used select menu ${interaction.customId} in ${interaction.guild?.name || 'DM'}`);
                    } catch (error) {
                        console.error(`[ERROR] Error handling select menu ${interaction.customId}:`, error);
                        
                        const errorDisplay = new TextDisplayBuilder()
                            .setContent('❌ There was an error handling this selection!');

                        await interaction.reply({
                            components: [errorDisplay],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: true
                        });
                    }
                } else {
                    console.warn(`[WARNING] No handler found for select menu: ${interaction.customId}`);
                    
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ This selection menu is no longer available or has expired.');

                    await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }
            }
            // Handle modal submissions
            else if (interaction.isModalSubmit()) {
                const modalHandler = interaction.client.components.get(interaction.customId);
                
                if (modalHandler) {
                    try {
                        await modalHandler.execute(interaction);
                        console.log(`[MODAL] ${interaction.user.tag} submitted modal ${interaction.customId} in ${interaction.guild?.name || 'DM'}`);
                    } catch (error) {
                        console.error(`[ERROR] Error handling modal ${interaction.customId}:`, error);
                        
                        const errorDisplay = new TextDisplayBuilder()
                            .setContent('❌ There was an error processing your submission!');

                        await interaction.reply({
                            components: [errorDisplay],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: true
                        });
                    }
                } else {
                    console.warn(`[WARNING] No handler found for modal: ${interaction.customId}`);
                    
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ This form is no longer available or has expired.');

                    await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }
            }
            // Handle other interaction types
            else {
                console.log(`[INTERACTION] Unhandled interaction type: ${interaction.type} from ${interaction.user.tag}`);
            }

        } catch (error) {
            console.error('[ERROR] Critical error in interactionCreate event:', error);
            
            // Try to respond to the interaction if we haven't already
            if (!interaction.replied && !interaction.deferred) {
                try {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent('❌ A critical error occurred while processing your interaction!');

                    await interaction.reply({
                        components: [errorDisplay],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('[ERROR] Failed to send error reply:', replyError);
                }
            }
        }
    },
};
