const { Events } = require('discord.js');
const { evaluate } = require('mathjs');
const db = require('../database');

// Prepared SQL Statements for peak performance in Event Listeners
const getGuild = db.prepare('SELECT * FROM guild_data WHERE guild_id = ?');
const updateGuildState = db.prepare('UPDATE guild_data SET current_number = ?, last_user_id = ?, high_score = ?, last_high_score = ? WHERE guild_id = ?');

// Helper to insert or update user stats safely
const getUserStats = db.prepare('SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?');
const insertUserStats = db.prepare('INSERT INTO user_stats (guild_id, user_id, counts, ruins, highest) VALUES (?, ?, ?, ?, ?)');
const updateUserStat = db.prepare('UPDATE user_stats SET counts = ?, ruins = ?, highest = ? WHERE guild_id = ? AND user_id = ?');

function trackUserStat(guildId, userId, type, countNumber) {
    let stat = getUserStats.get(guildId, userId);
    if (!stat) {
        insertUserStats.run(guildId, userId, 0, 0, 0);
        stat = { counts: 0, ruins: 0, highest: 0 };
    }
    
    if (type === 'ruin') {
        stat.ruins += 1;
    } else if (type === 'count') {
        stat.counts += 1;
        if (countNumber > stat.highest) stat.highest = countNumber;
    }
    updateUserStat.run(stat.counts, stat.ruins, stat.highest, guildId, userId);
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const guildData = getGuild.get(message.guild.id);
        if (!guildData) return;
        if (message.channel.id !== guildData.channel_id) return;

        let userNumber = null;
        let isValidInput = false;

        if (guildData.mode === 'advanced') {
            try {
                userNumber = evaluate(message.content);
                if (typeof userNumber === 'number' && !isNaN(userNumber)) {
                    isValidInput = true;
                }
            } catch (error) {
                isValidInput = false;
            }
        } else {
            if (/^\d+$/.test(message.content.trim())) {
                userNumber = parseInt(message.content.trim(), 10);
                isValidInput = true;
            }
        }

        // Helper function to handle incorrect counts and reset the game state.
        const ruinCount = async (reason) => {
            const achievedNumber = guildData.current_number - 1;
            const previousRecord = guildData.last_high_score !== null ? guildData.last_high_score : (guildData.high_score || 0);
            const currentRecord = guildData.high_score || 0;

            let recordText = `🏆 The server **HIGHSCORE** is \`${currentRecord}\`.`;

            if (achievedNumber > previousRecord && achievedNumber > 0) {
                recordText = `🎉 Wait... they actually set a **NEW SERVER HIGHSCORE** of \`${achievedNumber}\`! 🏆`;
            }

            await message.react('❌');

            trackUserStat(message.guild.id, message.author.id, 'ruin', null);

            let ruinMessage = `🚨 ${reason}\n\n💀 ${message.author} ruined the count`;
            if (achievedNumber > 0) ruinMessage += ` at \`${achievedNumber}\`!`;
            else ruinMessage += `!`;

            ruinMessage += `\n${recordText}\n🔄 The count has been reset to \`1\`. Start again!`;

            await message.reply(ruinMessage);

            updateGuildState.run(1, null, guildData.high_score, guildData.high_score, message.guild.id);
        };

        if (!isValidInput) {
            if (guildData.allow_talking) return; // Ignore normal text chat
            return ruinCount(`That's not a valid ${guildData.mode === 'advanced' ? 'math equation' : 'number'}!`);
        }

        if (message.author.id === guildData.last_user_id) {
            const behavior = guildData.twice_behavior || 'reset';

            if (behavior === 'warn') {
                await message.react('⚠️');
                return message.reply(`You can't count twice in a row, **${message.author.username}**! The next number is still **${guildData.current_number}**.`);
            } else if (behavior === 'allow') {
                // Allow
            } else {
                return ruinCount(`You can't count twice in a row!`);
            }
        }

        if (userNumber !== guildData.current_number) {
            return ruinCount(`You typed \`${userNumber}\`, but the next number was \`${guildData.current_number}\`!`);
        }

        await message.react('✅');

        // Process specific milestones.
        if (userNumber === 7) await message.react('🍀');
        if (userNumber === 13) await message.react('👻');
        if (userNumber === 21) await message.react('♠️');
        if (userNumber === 42) await message.react('🌌');
        if (userNumber === 66) await message.react('🛣️');
        if (userNumber === 69) await message.react('🍆');
        if (userNumber === 88) await message.react('🏎️');
        if (userNumber === 100) await message.react('💯');
        if (userNumber === 101) await message.react('🐶');
        if (userNumber === 111) await message.react('👼');
        if (userNumber === 247) await message.react('🕒');
        if (userNumber === 314) await message.react('🥧');
        if (userNumber === 365) await message.react('📅');
        if (userNumber === 404) await message.react('🔍');
        if (userNumber === 420) await message.react('😎');
        if (userNumber === 666) await message.react('😈');
        if (userNumber === 777) await message.react('🎰');
        if (userNumber === 1337) await message.react('💻');
        if (userNumber === 2048) await message.react('🎮');
        if (userNumber === 9000) await message.react('💥');
        if (userNumber === 80085) await message.react('👙');
        if (userNumber === 127001) await message.react('🏠');
        if (userNumber % 1000 === 0) await message.react('🎉');

        let newHighScore = guildData.high_score || 0;
        if (userNumber > newHighScore) {
            newHighScore = userNumber;
        }

        trackUserStat(message.guild.id, message.author.id, 'count', userNumber);
        updateGuildState.run(guildData.current_number + 1, message.author.id, newHighScore, guildData.last_high_score, message.guild.id);
    },
};
