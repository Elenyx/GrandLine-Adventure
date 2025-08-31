const { StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { TextDisplayBuilder, SectionBuilder, ContainerBuilder } = require('discord.js');
const { COLORS, RACES } = require('../../config/constants');

module.exports = {
    customId: 'race_selection',
    async execute(interaction) {
        try {
            const selectedRace = interaction.values[0];

            // Initialize global character creation storage if it doesn't exist
            if (!global.characterCreation) {
                global.characterCreation = {};
            }

            // Store race selection
            if (!global.characterCreation[interaction.user.id]) {
                global.characterCreation[interaction.user.id] = {};
            }
            global.characterCreation[interaction.user.id].race = selectedRace;

            // Show race confirmation and origin selection
            const raceConfirmContainer = new ContainerBuilder()
                .setAccentColor(COLORS.SUCCESS)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**✅ Race Selected: ${getRaceEmoji(selectedRace)} ${capitalizeFirst(selectedRace)}**\n*${getRaceDescription(selectedRace)}*`),
                    textDisplay => textDisplay
                        .setContent(getRaceBonuses(selectedRace))
                );

            // Create origin selection menu
            const originSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('origin_selection')
                .setPlaceholder('Choose your origin island...')
                .addOptions([
                    {
                        label: '⚓ Shells Town',
                        description: 'Marine base - Start as a Marine recruit',
                        value: 'shells_town'
                    },
                    {
                        label: '🏴‍☠️ Syrup Village',
                        description: 'Peaceful village - Become inspired by tales',
                        value: 'syrup_village'
                    },
                    {
                        label: '📚 Ohara',
                        description: 'Destroyed scholar island - Revolutionary path',
                        value: 'ohara'
                    },
                    {
                        label: '🍽️ Baratie',
                        description: 'Floating restaurant - Learn fighting and cooking',
                        value: 'baratie'
                    },
                    {
                        label: '💀 Loguetown',
                        description: 'Where the Pirate King died - Choose your path',
                        value: 'loguetown'
                    },
                    {
                        label: '☁️ Skypiea',
                        description: 'Sky island - Mysterious sky dweller',
                        value: 'skypiea'
                    }
                ]);

            const originRow = new ActionRowBuilder().addComponents(originSelectMenu);

            const originContainer = new ContainerBuilder()
                .setAccentColor(COLORS.PRIMARY)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('**🗺️ Choose Your Origin Island**\n*Where did your journey begin?*'),
                    textDisplay => textDisplay
                        .setContent('Your origin island determines:\n• Your starting faction alignment\n• Initial storyline and quests\n• Connection to major events\n• Starting location on the Grand Line')
                );

            await interaction.reply({
                components: [raceConfirmContainer, originContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });

            // Send the origin selection menu as a follow-up
            await interaction.followUp({
                content: 'Select your origin island:',
                components: [originRow],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in race selection:', error);
            await interaction.reply({
                content: 'There was an error processing your race selection!',
                ephemeral: true
            });
        }
    },
};

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function getRaceEmoji(race) {
    const emojis = {
        human: '👤',
        fishman: '🐟',
        mink: '🐺',
        skypiean: '☁️',
        giant: '🏔️',
        cyborg: '🤖'
    };
    return emojis[race] || '👤';
}

function getRaceDescription(race) {
    const descriptions = {
        human: 'The adaptable majority of the world, capable of great achievements',
        fishman: 'Aquatic beings with incredible strength and underwater capabilities',
        mink: 'Anthropomorphic animals with natural electricity manipulation',
        skypiean: 'Sky island inhabitants with unique dial technology knowledge',
        giant: 'Massive warriors with overwhelming physical power',
        cyborg: 'Mechanically enhanced beings with technological advantages'
    };
    return descriptions[race] || 'Unknown race';
}

function getRaceBonuses(race) {
    const bonuses = {
        human: '**Bonuses:**\n• +1 to all stats\n• Adaptability: +10% XP gain\n• Can join any faction without penalties',
        fishman: '**Bonuses:**\n• +2 Strength, +1 Durability\n• Water Breathing: No underwater penalties\n• Unique Fish-Man Karate abilities',
        mink: '**Bonuses:**\n• +2 Agility, +1 Strength\n• Electro: Lightning attacks with stun\n• Sulong form during full moon events',
        skypiean: '**Bonuses:**\n• +2 Intelligence, +1 Agility\n• Sky-Dweller: Reduced fall damage\n• Starts with Impact/Wind Dial',
        giant: '**Bonuses:**\n• +4 Strength, +2 Durability, -2 Agility\n• Giant\'s Strength: Wield massive weapons\n• Resistant to knockback effects',
        cyborg: '**Bonuses:**\n• +3 Durability, +2 Strength\n• Mechanical Upgrades: Custom modules\n• Repair system instead of natural healing'
    };
    return bonuses[race] || 'No bonuses listed';
}
