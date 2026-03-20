const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

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
        const dataPath = path.join(__dirname, '..', '..', 'data.json');
        
        let database = {};
        try {
            database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (error) {
            return interaction.reply({ content: '❌ Could not read the database.', ephemeral: true });
        }

        // Verify if the counting game is initialized for the guild.
        if (!database[guildId]) {
            return interaction.reply({ 
                content: '❌ This server has not set up the counting game yet. Run `/setup` first.', 
                ephemeral: true 
            });
        }

        // Process reset based on target selection.
        switch (target) {
            case 'highscore':
                database[guildId].highScore = 0;
                fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
                
                await interaction.reply({ 
                    content: '✅ The **High Score** has been successfully reset to **0**.', 
                    ephemeral: true 
                });
                break;
                
            case 'stats':
                if (targetUser) {
                    if (database[guildId].users && database[guildId].users[targetUser.id]) {
                        delete database[guildId].users[targetUser.id];
                        fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
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
                    database[guildId].users = {};
                    fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
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