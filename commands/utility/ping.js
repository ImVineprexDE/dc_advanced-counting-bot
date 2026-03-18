const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // 'data' defines the command structure for Discord
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
        
    // 'execute' runs when the user types the command
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
};