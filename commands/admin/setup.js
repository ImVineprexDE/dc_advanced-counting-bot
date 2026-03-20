const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const path = require('node:path');
const Database = require('better-sqlite3');

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

        const db = new Database(path.join(__dirname, '..', '..', 'counting.sqlite'));

        // Retrieve existing high score if available.
        const existingData = db.prepare('SELECT high_score FROM guild_data WHERE guild_id = ?').get(guildId);
        const savedHighScore = existingData ? existingData.high_score : 0;

        // Initialize and persist new game state for the guild.
        db.prepare(`
            INSERT OR REPLACE INTO guild_data 
            (guild_id, channel_id, mode, twice_behavior, allow_talking, current_number, last_user_id, high_score, last_high_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(guildId, targetChannel.id, selectedMode, twiceBehavior, allowTalking ? 1 : 0, 1, null, savedHighScore, savedHighScore);

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