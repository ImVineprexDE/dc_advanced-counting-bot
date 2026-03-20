const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Command registration data.
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your personal counting stats for this server.')
        // Optional user target
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to view stats for (defaults to yourself)')
                .setRequired(false)
        ),
        
    // Executes the stats command.
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const dataPath = path.join(__dirname, '..', '..', 'data.json');
        
        let database = {};
        try {
            database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (error) {
            return interaction.reply({ content: '❌ Could not read the database.', ephemeral: true });
        }

        const guildData = database[guildId];
        if (!guildData || !guildData.users || !guildData.users[targetUser.id]) {
            return interaction.reply({ 
                content: `📊 **${targetUser.username}** hasn't participated in the counting game yet!`, 
                ephemeral: true 
            });
        }

        const userStats = guildData.users[targetUser.id];
        const total = (userStats.counts || 0) + (userStats.ruins || 0);
        const accuracy = total > 0 ? (((userStats.counts || 0) / total) * 100).toFixed(1) : 0;

        const statsMessage = `📊 **Counting Stats for ${targetUser.username}**\n\n` +
            `✅ **Valid Counts:** \`${userStats.counts || 0}\`\n` +
            `❌ **Ruined Counts:** \`${userStats.ruins || 0}\`\n` +
            `🎯 **Accuracy:** \`${accuracy}%\`\n` +
            `🏆 **Highest Number Reached:** \`${userStats.highest || 0}\``;

        await interaction.reply({ content: statsMessage, ephemeral: true });
    },
};
