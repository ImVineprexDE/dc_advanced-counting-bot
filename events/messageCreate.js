const { Events } = require('discord.js');
const { evaluate } = require('mathjs');
const db = require('../database');

// Prepared SQL Statements for peak performance in Event Listeners
const getGuild = db.prepare('SELECT * FROM guild_data WHERE guild_id = ?');
const updateGuildState = db.prepare('UPDATE guild_data SET current_number = ?, last_user_id = ?, high_score = ?, last_high_score = ? WHERE guild_id = ?');
const consumeExtraLife = db.prepare('UPDATE guild_data SET extra_lives = extra_lives - 1 WHERE guild_id = ?');
const grantExtraLife = db.prepare('UPDATE guild_data SET extra_lives = extra_lives + 1 WHERE guild_id = ?');

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
            const hasLettersOrVariables = /[a-zA-Z=]/.test(message.content);
            
            if (hasLettersOrVariables) {
                isValidInput = false;
            } else {
                try {
                    userNumber = evaluate(message.content);
                    if (typeof userNumber === 'number' && !isNaN(userNumber)) {
                        isValidInput = true;
                    }
                } catch (error) {
                    isValidInput = false;
                }
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

            // Check for extra lives to save the run!
            if (guildData.extralife_enabled === 1 && guildData.extra_lives > 0) {
                consumeExtraLife.run(message.guild.id);
                const livesLeft = guildData.extra_lives - 1;
                
                await message.react('💖');
                
                let rescueMessage = `🚨 ${reason}\n\n💀 ${message.author} messed up the count... BUT the server used a **Server Extra Life**! 💖\n*(Lives remaining: ${livesLeft})*`;
                rescueMessage += `\n\n🛡️ The count remains alive! The next number is still **${guildData.current_number}**. Keep going!`;
                
                return message.reply(rescueMessage);
            }

            await message.reply(ruinMessage);

            updateGuildState.run(1, null, guildData.high_score, guildData.high_score, message.guild.id);
        };

        if (!isValidInput) {
            if (guildData.allow_talking) return; // Ignore normal text chat
            return ruinCount(`That's not a valid ${guildData.mode === 'advanced' ? 'math equation' : 'number'}! (Variables/words are not allowed)`);
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
        if (userNumber === 1) await message.react('🥇'); // First!
        if (userNumber === 7) await message.react('🍀'); // Lucky Number Seven
        if (userNumber === 8) await message.react('🎱'); // Magic 8-Ball
        if (userNumber === 13) await message.react('👻'); // Unlucky / Spooky 13
        if (userNumber === 21) await message.react('♠️'); // Blackjack / 9+10
        if (userNumber === 42) await message.react('🌌'); // Answer to the Ultimate Question (Hitchhiker's Guide)
        if (userNumber === 50) await message.react('🎯'); // Half-century / Bullseye
        if (userNumber === 66) await message.react('🛣️'); // Route 66
        if (userNumber === 67) await message.react('🔨'); // Meme that gets you banned
        if (userNumber === 69) await message.react('🍆'); // Nice.
        if (userNumber === 88) await message.react('🏎️'); // 88 mph (Back to the Future)
        if (userNumber === 99) await message.react('🎈'); // 99 Red Balloons
        if (userNumber === 100) await message.react('💯'); // Perfect score
        if (userNumber === 101) await message.react('🐶'); // 101 Dalmatians
        if (userNumber === 111) await message.react('👼'); // Angel number
        if (userNumber === 247) await message.react('🕒'); // 24/7 Time
        if (userNumber === 300) await message.react('⚔️'); // This is Sparta!
        if (userNumber === 314) await message.react('🥧'); // Pi (3.14)
        if (userNumber === 365) await message.react('📅'); // Days in a year
        if (userNumber === 403) await message.react('🚫'); // HTTP 403: Forbidden
        if (userNumber === 404) await message.react('🔍'); // HTTP 404: Not Found
        if (userNumber === 418) await message.react('🫖'); // HTTP 418: I'm a teapot (April Fools)
        if (userNumber === 420) await message.react('😎'); // Weed culture
        if (userNumber === 500) await message.react('🔥'); // HTTP 500: Internal Server Error
        if (userNumber === 666) await message.react('😈'); // Number of the Beast
        if (userNumber === 727) await message.react('✈️'); // WYSI (Osu!) / Boeing 727
        if (userNumber === 777) await message.react('🎰'); // Casino Jackpot
        if (userNumber === 888) await message.react('🐉'); // Chinese lucky number for wealth
        if (userNumber === 1337) await message.react('💻'); // Leetspeak / Elite
        if (userNumber === 1984) await message.react('👁️'); // George Orwell's 1984
        if (userNumber === 2048) await message.react('🎮'); // 2048 game
        if (userNumber === 9000) await message.react('💥'); // It's over 9000! (Dragon Ball Z)
        if (userNumber === 80085) await message.react('👙'); // BOOBS on a calculator
        if (userNumber === 127001) await message.react('🏠'); // Localhost IP (127.0.0.1)
        if (userNumber % 1000 === 0) await message.react('🎉'); // Flat thousands

        // Process Extra Life milestones
        if (guildData.extralife_enabled === 1 && guildData.extralife_interval) {
            if (userNumber > 0 && userNumber % guildData.extralife_interval === 0) {
                grantExtraLife.run(message.guild.id);
                guildData.extra_lives = (guildData.extra_lives || 0) + 1;
                await message.channel.send(`🎉 **Milestone Reached!** ${message.author} hit **${userNumber}**, earning the server **+1 Extra Life**! 💖 *(Total Lives: ${guildData.extra_lives})*`);
            }
        }

        let newHighScore = guildData.high_score || 0;
        if (userNumber > newHighScore) {
            newHighScore = userNumber;
        }

        trackUserStat(message.guild.id, message.author.id, 'count', userNumber);
        updateGuildState.run(guildData.current_number + 1, message.author.id, newHighScore, guildData.last_high_score, message.guild.id);
    },
};
