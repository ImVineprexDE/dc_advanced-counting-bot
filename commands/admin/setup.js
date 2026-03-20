const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set the channel and mode for the counting game.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The text channel where users will count.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Choose the ruleset for the counting game.')
                .setRequired(true)
                .addChoices(
                    { name: 'Basic (Numbers only)', value: 'basic' },
                    { name: 'Advanced (Math equations allowed)', value: 'advanced' }
                )
        )
        // Option for handling consecutive counts.
        .addStringOption(option =>
            option.setName('twice_in_a_row')
                .setDescription('What happens if a user counts twice in a row?')
                .setRequired(true)
                .addChoices(
                    { name: '1. Reset the count', value: 'reset' },
                    { name: '2. Warn the user (No reset)', value: 'warn' },
                    { name: '3. Allow it (Continue counting)', value: 'allow' }
                )
        )
        .addBooleanOption(option =>
            option.setName('allow_talking')
                .setDescription('Allow users to talk normally in the channel without ruining counts?')
                .setRequired(true)
        ),
        
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel');
        const selectedMode = interaction.options.getString('mode');
        const twiceBehavior = interaction.options.getString('twice_in_a_row'); // Retrieve consecutive behavior setting.
        const allowTalking = interaction.options.getBoolean('allow_talking');
        const guildId = interaction.guild.id;

        const dataPath = path.join(__dirname, '..', '..', 'data.json');
        
        let database = {};
        try {
            const rawData = fs.readFileSync(dataPath, 'utf8');
            database = JSON.parse(rawData);
        } catch (error) {
            console.error("Error reading data.json:", error);
        }

        // Retrieve existing high score if available.
        const existingData = database[guildId] || {};
        const savedHighScore = existingData.highScore || 0;

        // Initialize and persist new game state for the guild.
        database[guildId] = {
            channelId: targetChannel.id,
            mode: selectedMode,
            twiceBehavior: twiceBehavior, 
            allowTalking: allowTalking,
            currentNumber: 1,
            lastUserId: null,
            highScore: savedHighScore
        };

        fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));

        const displayMode = selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1);
        
        // Format the response message.
        let behaviorText = '';
        if (twiceBehavior === 'reset') behaviorText = 'Reset the count';
        if (twiceBehavior === 'warn') behaviorText = 'Warn user (No reset)';
        if (twiceBehavior === 'allow') behaviorText = 'Allow multiple counts';

        await interaction.reply({ 
            content: `✅ Setup Complete!\nChannel: ${targetChannel}\nMode: **${displayMode}**\nTwice in a row: **${behaviorText}**\nAllow Talking: **${allowTalking ? 'Yes' : 'No'}**\nThe count starts at **1**.`, 
            ephemeral: true 
        });
    },
};