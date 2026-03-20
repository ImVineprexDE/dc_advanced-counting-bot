const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const Database = require('better-sqlite3');

module.exports = {
    // Command registration data.
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top 10 counters in the server.'),
        
    // Executes the leaderboard command.
    async execute(interaction) {
        const guildId = interaction.guild.id;

        const db = new Database(path.join(__dirname, '..', '..', 'counting.sqlite'));

        // Query top 10 users directly from database, sorted by counts desc, highest desc
        const users = db.prepare(`
            SELECT user_id, counts as total, highest 
            FROM user_stats 
            WHERE guild_id = ? AND counts > 0 
            ORDER BY counts DESC, highest DESC 
            LIMIT 10
        `).all(guildId);

        if (users.length === 0) {
            return interaction.reply({ 
                content: `📊 This server hasn't accumulated any stats yet! Start counting!`, 
                ephemeral: true 
            });
        }

        let boardText = `🏆 **Top 10 Counters in ${interaction.guild.name}** 🏆\n\n`;
        
        users.forEach((u, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            // u.user_id replaces previous id variable in map loop
            boardText += `${medal} **#${index + 1}** <@${u.user_id}> — **${u.total}** counts (Best: \`${u.highest}\`)\n`;
        });

        // Send ephemeral message directly to the user who executed the interaction.
        await interaction.reply({ content: boardText, ephemeral: true });
    },
};
