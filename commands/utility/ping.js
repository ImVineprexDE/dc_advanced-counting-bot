const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Command registration data.
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
        
    // Executes the ping command.
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
};