const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const Database = require('better-sqlite3');

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

        const db = new Database(path.join(__dirname, '..', '..', 'counting.sqlite'));

        const userStats = db.prepare('SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?').get(guildId, targetUser.id);
        
        if (!userStats) {
            return interaction.reply({ 
                content: `📊 **${targetUser.globalName || targetUser.username}** (@${targetUser.username}) hasn't participated in the counting game yet!`, 
                ephemeral: true 
            });
        }

        const total = (userStats.counts || 0) + (userStats.ruins || 0);
        const accuracy = total > 0 ? (((userStats.counts || 0) / total) * 100).toFixed(1) : 0;

        const displayName = targetUser.globalName || targetUser.username;
        const displayHandle = `@${targetUser.username}`;

        const statsEmbed = new EmbedBuilder()
            .setColor(0x0099ff) // Standard Discord Blue
            .setTitle(`📊 Counting Stats for ${displayName}`)
            .setDescription(`**User Handle:** ${displayHandle}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '✅ Valid Counts', value: `\`${userStats.counts || 0}\``, inline: true },
                { name: '❌ Ruined Counts', value: `\`${userStats.ruins || 0}\``, inline: true },
                { name: '🎯 Accuracy', value: `\`${accuracy}%\``, inline: true },
                { name: '🏆 Highest Number Reached', value: `\`${userStats.highest || 0}\``, inline: false }
            )
            .setFooter({ text: 'Advanced Counting Bot', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    },
};
