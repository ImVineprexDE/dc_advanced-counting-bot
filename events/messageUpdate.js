const { Events } = require('discord.js');
const { evaluate } = require('mathjs');
const db = require('../database');

const getGuild = db.prepare('SELECT * FROM guild_data WHERE guild_id = ?');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (newMessage.author && newMessage.author.bot) return;
        
        const guildData = getGuild.get(newMessage.guildId);
        if (!guildData || newMessage.channelId !== guildData.channel_id) return;
        
        if (oldMessage.partial) return; // Can't verify original content
        
        const lastValidNumber = guildData.current_number - 1;
        let editedNumber = null;
        
        // Check if the original message was the last valid count
        if (guildData.mode === 'advanced') {
            try {
                const val = evaluate(oldMessage.content);
                if (typeof val === 'number' && !isNaN(val)) editedNumber = val;
            } catch (e) {}
        } else {
            if (/^\d+$/.test(oldMessage.content.trim())) {
                editedNumber = parseInt(oldMessage.content.trim(), 10);
            }
        }
        
        // Only scold if they edited the active correct count 
        if (editedNumber !== lastValidNumber || lastValidNumber === 0) return;

        // If it was the correct count, scold them
        await newMessage.reply(`⚠️ **${newMessage.author.username}**, you are not allowed to edit your counting numbers! The next number is **${guildData.current_number}**.`);
    },
};
