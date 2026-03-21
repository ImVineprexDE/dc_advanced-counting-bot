const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const Database = require('better-sqlite3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('extralife')
        .setDescription('Configure the server Extra Life system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option => 
            option.setName('enabled')
                .setDescription('Turn the Extra Life system ON (True) or OFF (False)')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('interval')
                .setDescription('How many counts until the server earns an Extra Life? (Default: 100)')
                .setRequired(false)
                .setMinValue(10)
        ),
        
    async execute(interaction) {
        const isEnabled = interaction.options.getBoolean('enabled') ? 1 : 0;
        let interval = interaction.options.getInteger('interval');
        const guildId = interaction.guild.id;

        const db = new Database(path.join(__dirname, '..', '..', 'counting.sqlite'));
        
        const guildData = db.prepare('SELECT * FROM guild_data WHERE guild_id = ?').get(guildId);
        if (!guildData) {
            return interaction.reply({ 
                content: '❌ This server has not set up the counting game yet. Run `/setup` first.', 
                ephemeral: true 
            });
        }
        
        if (!interval) {
            interval = guildData.extralife_interval || 100;
        }

        db.prepare('UPDATE guild_data SET extralife_enabled = ?, extralife_interval = ? WHERE guild_id = ?')
          .run(isEnabled, interval, guildId);
          
        await interaction.reply({ 
            content: `💖 **Extra Life Configuration Saved!**\nSystem Status: **${isEnabled ? 'ON ✅' : 'OFF ❌'}**\nInterval: **Every ${interval} counts**`, 
            ephemeral: true 
        });
    },
};
