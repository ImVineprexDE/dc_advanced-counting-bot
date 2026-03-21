const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands for the Advanced Counting Bot.'),
        
    async execute(interaction) {
        const commands = interaction.client.commands;
        
        // Define the embed structure
        const helpEmbed = new EmbedBuilder()
            .setTitle('📚 Advanced Counting Bot - Guide')
            .setDescription('Here are all the slash commands you can use to manage or interact with the counting engine!')
            .setColor('#5865F2') // Discord blurple
            .setThumbnail(interaction.client.user.displayAvatarURL());

        // Extract and format all loaded commands dynamically
        const commandList = commands.map(cmd => {
            return `**\`/${cmd.data.name}\`** - *${cmd.data.description}*`;
        }).join('\n\n');

        helpEmbed.addFields({ name: '🛠️ Available Commands', value: commandList });

        // Ensure the help menu is only visible to the user who requested it
        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    },
};
