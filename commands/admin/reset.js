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
                    { name: '🏆 High Score', value: 'highscore' }
                    // Additional reset targets can be added here.
                    // { name: '📊 All User Stats', value: 'stats' },
                    // { name: '🔄 Current Count', value: 'count' }
                )
        ),
        
    async execute(interaction) {
        const target = interaction.options.getString('target');
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
                
            // Example configuration for future targets:
            // case 'stats':
            //     database[guildId].users = {};
            //     fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
            //     await interaction.reply({ content: '✅ User stats reset.', ephemeral: true });
            //     break;
            
            default:
                await interaction.reply({ 
                    content: '❌ Unknown reset target.', 
                    ephemeral: true 
                });
        }
    },
};