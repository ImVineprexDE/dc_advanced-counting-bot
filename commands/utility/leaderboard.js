const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Command registration data.
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top 10 counters in the server.'),
        
    // Executes the leaderboard command.
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const dataPath = path.join(__dirname, '..', '..', 'data.json');
        
        let database = {};
        try {
            database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (error) {
            return interaction.reply({ content: '❌ Could not read the database.', ephemeral: true });
        }

        const guildData = database[guildId];
        if (!guildData || !guildData.users) {
            return interaction.reply({ 
                content: `📊 This server hasn't accumulated any stats yet! Start counting!`, 
                ephemeral: true 
            });
        }

        // Map Object to Array and sort by best metrics (Counts then Highest)
        const users = Object.entries(guildData.users)
            .map(([id, stats]) => ({
                id,
                total: (stats.counts || 0),
                highest: (stats.highest || 0)
            }))
            .filter(u => u.total > 0)
            .sort((a, b) => b.total - a.total || b.highest - a.highest)
            .slice(0, 10);

        let boardText = `🏆 **Top 10 Counters in ${interaction.guild.name}** 🏆\n\n`;
        
        if (users.length === 0) {
            boardText += "*No one has successfully counted yet!*";
        } else {
            users.forEach((u, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                boardText += `${medal} **#${index + 1}** <@${u.id}> — **${u.total}** counts (Best: \`${u.highest}\`)\n`;
            });
        }

        // Send ephemeral message directly to the user who executed the interaction.
        await interaction.reply({ content: boardText, ephemeral: true });
    },
};
