const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const Database = require('better-sqlite3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset specific data for the counting game.')
        // Restrict command to Administrators.
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('target')
                .setDescription('What data do you want to reset?')
                .setRequired(true)
                .addChoices(
                    { name: '🏆 High Score', value: 'highscore' },
                    { name: '📊 Statistics', value: 'stats' }
                )
        )
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Specify a user to reset only their stats (leave blank for everyone)')
                .setRequired(false)
        ),
        
    async execute(interaction) {
        const target = interaction.options.getString('target');
        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        const db = new Database(path.join(__dirname, '..', '..', 'counting.sqlite'));
        
        // Verify if the counting game is initialized for the guild.
        const guildData = db.prepare('SELECT * FROM guild_data WHERE guild_id = ?').get(guildId);
        if (!guildData) {
            return interaction.reply({ 
                content: '❌ This server has not set up the counting game yet. Run `/setup` first.', 
                ephemeral: true 
            });
        }

        // Process reset based on target selection.
        switch (target) {
            case 'highscore':
                db.prepare('UPDATE guild_data SET high_score = 0 WHERE guild_id = ?').run(guildId);
                
                await interaction.reply({ 
                    content: '✅ The **High Score** has been successfully reset to **0**.', 
                    ephemeral: true 
                });
                break;
                
            case 'stats':
                if (targetUser) {
                    const row = db.prepare('SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?').get(guildId, targetUser.id);
                    if (row) {
                        db.prepare('DELETE FROM user_stats WHERE guild_id = ? AND user_id = ?').run(guildId, targetUser.id);
                        await interaction.reply({ 
                            content: `✅ Statistics for **${targetUser.username}** have been reset.`, 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: `⚠️ **${targetUser.username}** has no stats to reset.`, 
                            ephemeral: true 
                        });
                    }
                } else {
                    db.prepare('DELETE FROM user_stats WHERE guild_id = ?').run(guildId);
                    await interaction.reply({ 
                        content: '✅ **All User Statistics** have been reset for the server.', 
                        ephemeral: true 
                    });
                }
                break;
            
            default:
                await interaction.reply({ 
                    content: '❌ Unknown reset target.', 
                    ephemeral: true 
                });
        }
    },
};