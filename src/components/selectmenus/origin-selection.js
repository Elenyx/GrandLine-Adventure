const { StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const { COLORS, ORIGINS } = require('../../config/constants');

module.exports = {
    customId: 'origin_selection',
    async execute(interaction) {
        try {
            const selectedOrigin = interaction.values[0];

            // Store origin selection
            if (!global.characterCreation || !global.characterCreation[interaction.user.id]) {
                await interaction.reply({
                    content: 'Character creation session expired. Please start over.',
                    ephemeral: true
                });
                return;
            }

            global.characterCreation[interaction.user.id].origin = selectedOrigin;

            // Show origin confirmation and dream selection
            const originConfirmContainer = new ContainerBuilder()
                .setAccentColor(COLORS.SUCCESS)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**✅ Origin Selected: ${getOriginEmoji(selectedOrigin)} ${capitalizeFirst(selectedOrigin)}**\n*${getOriginDescription(selectedOrigin)}*`),
                    textDisplay => textDisplay
                        .setContent(getOriginStory(selectedOrigin))
                );

            // Create dream selection menu
            const dreamSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('dream_selection')
                .setPlaceholder('Choose your ultimate dream...')
                .addOptions([
                    {
                        label: '⚔️ World\'s Greatest Swordsman',
                        description: 'Master the way of the sword',
                        value: 'greatest_swordsman'
                    },
                    {
                        label: '🌊 Find the All Blue',
                        description: 'Discover the legendary sea of all fish',
                        value: 'all_blue'
                    },
                    {
                        label: '🗺️ Map the World',
                        description: 'Chart every island and sea',
                        value: 'map_world'
                    },
                    {
                        label: '⚔️ Brave Warrior of the Sea',
                        description: 'Become an unbeatable fighter',
                        value: 'brave_warrior'
                    },
                    {
                        label: '🍎 Master Devil Fruits',
                        description: 'Understand the mysteries of Devil Fruits',
                        value: 'devil_fruit_master'
                    },
                    {
                        label: '✊ Topple the World Government',
                        description: 'Bring down the corrupt system',
                        value: 'topple_government'
                    },
                    {
                        label: '👑 Become the Pirate King',
                        description: 'Reach the ultimate treasure, One Piece',
                        value: 'pirate_king'
                    }
                ]);

            const dreamRow = new ActionRowBuilder().addComponents(dreamSelectMenu);

            const dreamContainer = new ContainerBuilder()
                .setAccentColor(COLORS.GOLD)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('**🌟 Choose Your Ultimate Dream**\n*What drives you to sail the Grand Line?*'),
                    textDisplay => textDisplay
                        .setContent('Your dream is more than a goal - it shapes your abilities:\n• Unlocks unique skill trees\n• Determines starting equipment\n• Influences quest opportunities\n• Defines your character\'s motivation')
                );

            await interaction.reply({
                components: [originConfirmContainer, dreamContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });

            // Send the dream selection menu as a follow-up
            await interaction.followUp({
                content: 'Select your ultimate dream:',
                components: [dreamRow],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in origin selection:', error);
            await interaction.reply({
                content: 'There was an error processing your origin selection!',
                ephemeral: true
            });
        }
    },
};

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function getOriginEmoji(origin) {
    const emojis = {
        shells_town: '⚓',
        syrup_village: '🏴‍☠️',
        ohara: '📚',
        baratie: '🍽️',
        loguetown: '💀',
        skypiea: '☁️',
        elbaf: '🏔️'
    };
    return emojis[origin] || '🏝️';
}

function getOriginDescription(origin) {
    const descriptions = {
        shells_town: 'A Marine base town where justice and order reign supreme',
        syrup_village: 'A peaceful village known for tall tales and brave stories',
        ohara: 'The destroyed island of scholars, keeper of forbidden knowledge',
        baratie: 'The famous floating restaurant where fighting and cooking unite',
        loguetown: 'The town where Gold Roger was executed, marking the beginning and end',
        skypiea: 'A mystical island floating high above the clouds',
        elbaf: 'The legendary island of giants and mighty warriors'
    };
    return descriptions[origin] || 'A mysterious island';
}

function getOriginStory(origin) {
    const stories = {
        shells_town: '**Starting Arc:** "The Tyrant\'s Fall"\nBegin as a Marine recruit under Captain Morgan. Witness corruption within the ranks and decide whether to remain loyal to justice or forge your own path.',
        syrup_village: '**Starting Arc:** "The Liar\'s Legacy"\nInspired by Usopp\'s legendary tales, you defend your peaceful village from pirate threats while seeking your own ship and crew to begin your adventure.',
        ohara: '**Starting Arc:** "Whispers of Truth"\nAs a survivor of the Buster Call, you carry the burden of forbidden knowledge. The Revolutionary Army beckons as you seek to preserve the truth.',
        baratie: '**Starting Arc:** "A Taste of the Grand Line"\nTrain as both a cook and fighter at the famous floating restaurant. Learn that feeding people and protecting them are equally important arts.',
        loguetown: '**Starting Arc:** "Dreams at Dawn"\nIn the town where the Pirate King died and where dreams begin, you must choose your path: follow in his footsteps, uphold justice, or forge something entirely new.',
        skypiea: '**Starting Arc:** "The Sky\'s Burden"\nExplore the mysteries of the sky people while navigating the ancient conflicts between Shandians and Skypieans. The Upper Yard holds many secrets.',
        elbaf: '**Starting Arc:** "Pride of the Warriors"\nProve yourself worthy in the trials of giants. Only by mastering honor and combat can you leave your homeland and sail the lower seas.'
    };
    return stories[origin] || 'Your story begins here...';
}
