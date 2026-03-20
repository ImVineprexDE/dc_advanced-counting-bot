const { Events } = require('discord.js');
const { evaluate } = require('mathjs');
const db = require('../database');

const getGuild = db.prepare('SELECT * FROM guild_data WHERE guild_id = ?');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (message.partial || (message.author && message.author.bot)) return;
        
        const guildData = getGuild.get(message.guildId);
        if (!guildData || message.channelId !== guildData.channel_id) return;

        const lastValidNumber = guildData.current_number - 1;
        let deletedNumber = null;
        
        if (guildData.mode === 'advanced') {
            try {
                const val = evaluate(message.content);
                if (typeof val === 'number' && !isNaN(val)) deletedNumber = val;
            } catch (e) {}
        } else {
            if (/^\d+$/.test(message.content.trim())) {
                deletedNumber = parseInt(message.content.trim(), 10);
            }
        }
        
        if (deletedNumber === lastValidNumber && lastValidNumber > 0) {
            await message.channel.send(`🚨 **${message.author.username}** tried to delete their count! The last number was **${lastValidNumber}**!`);
        }
    },
};
