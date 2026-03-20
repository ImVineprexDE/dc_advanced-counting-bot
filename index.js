const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { evaluate } = require('mathjs'); // The safe math library!
const Database = require('better-sqlite3');
require('dotenv').config();

// Connect to the SQLite Database
const db = new Database(path.join(__dirname, 'counting.sqlite'));

// Create necessary tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS guild_data (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT,
        mode TEXT,
        twice_behavior TEXT,
        allow_talking INTEGER,
        current_number INTEGER,
        last_user_id TEXT,
        high_score INTEGER,
        last_high_score INTEGER
    );
    CREATE TABLE IF NOT EXISTS user_stats (
        guild_id TEXT,
        user_id TEXT,
        counts INTEGER,
        ruins INTEGER,
        highest INTEGER,
        PRIMARY KEY (guild_id, user_id)
    );
`);

// --- AUTOMATIC JSON MIGRATION SCRIPT ---
const oldDataPath = path.join(__dirname, 'data.json');
if (fs.existsSync(oldDataPath)) {
    console.log('[MIGRATION] Found data.json! Migrating to counting.sqlite...');
    try {
        const oldData = JSON.parse(fs.readFileSync(oldDataPath, 'utf8'));
        
        const insertGuild = db.prepare(`
            INSERT OR REPLACE INTO guild_data 
            (guild_id, channel_id, mode, twice_behavior, allow_talking, current_number, last_user_id, high_score, last_high_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertUser = db.prepare(`
            INSERT OR REPLACE INTO user_stats (guild_id, user_id, counts, ruins, highest)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        db.transaction(() => {
            for (const [guildId, gData] of Object.entries(oldData)) {
                insertGuild.run(
                    guildId,
                    gData.channelId || null,
                    gData.mode || 'basic',
                    gData.twiceBehavior || 'reset',
                    gData.allowTalking ? 1 : 0,
                    gData.currentNumber || 1,
                    gData.lastUserId || null,
                    gData.highScore || 0,
                    gData.lastHighScore || 0
                );
                
                if (gData.users) {
                    for (const [userId, stats] of Object.entries(gData.users)) {
                        insertUser.run(
                            guildId,
                            userId,
                            stats.counts || 0,
                            stats.ruins || 0,
                            stats.highest || 0
                        );
                    }
                }
            }
        })();
        
        // Rename old format out of the way to prevent re-migration
        fs.renameSync(oldDataPath, path.join(__dirname, 'data.old.json'));
        console.log('[MIGRATION] Migration successful! Renamed old file to data.old.json.');
    } catch (e) {
        console.error('[MIGRATION ERROR]', e);
    }
}

// Define required Gateway intents for the bot.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Enables reading of message content.
    ]
});

client.commands = new Collection();

// Load command files dynamically.
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.error(`[ERROR] Command at ${filePath} is missing "data" or "execute" property.`);
        }
    }
}

// Handle client ready event.
client.once(Events.ClientReady, readyClient => {
    console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle incoming slash command interactions.
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error!', ephemeral: true });
        }
    }
});

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

// Process incoming messages for the counting game.
client.on(Events.MessageCreate, async message => {
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
        // Retrieve the previous high score to verify if a new record was set.
        const previousRecord = guildData.last_high_score !== null ? guildData.last_high_score : (guildData.high_score || 0);
        const currentRecord = guildData.high_score || 0;

        let recordText = `🏆 The server **HIGHSCORE** is \`${currentRecord}\`.`;

        // Evaluate if the current session establishes a new historical best.
        if (achievedNumber > previousRecord && achievedNumber > 0) {
            recordText = `🎉 Wait... they actually set a **NEW SERVER HIGHSCORE** of \`${achievedNumber}\`! 🏆`;
        }

        await message.react('❌');

        // Track the ruin in user stats.
        trackUserStat(message.guild.id, message.author.id, 'ruin');

        // Format the ruin notification message.
        let ruinMessage = `🚨 ${reason}\n\n💀 ${message.author} ruined the count`;
        if (achievedNumber > 0) ruinMessage += ` at \`${achievedNumber}\`!`;
        else ruinMessage += `!`;

        ruinMessage += `\n${recordText}\n🔄 The count has been reset to \`1\`. Start again!`;

        await message.reply(ruinMessage);

        // Reset the game state while preserving the high score.
        // Persist the current high score as the baseline for the next session.
        updateGuildState.run(1, null, guildData.high_score, guildData.high_score, message.guild.id);
    };

    // Validate the user input based on the game mode.
    if (!isValidInput) {
        if (guildData.allow_talking) return; // Ignore normal text chat
        return ruinCount(`That's not a valid ${guildData.mode === 'advanced' ? 'math equation' : 'number'}!`);
    }

    // Handle consecutive counts by the same user.
    if (message.author.id === guildData.last_user_id) {
        const behavior = guildData.twice_behavior || 'reset';

        if (behavior === 'warn') {
            await message.react('⚠️');
            return message.reply(`You can't count twice in a row, **${message.author.username}**! The next number is still **${guildData.current_number}**.`);
        } else if (behavior === 'allow') {
            // No action needed; allow consecutive counting.
        } else {
            return ruinCount(`You can't count twice in a row!`);
        }
    }

    // Verify if the input matches the expected sequence number.
    if (userNumber !== guildData.current_number) {
        return ruinCount(`You typed \`${userNumber}\`, but the next number was \`${guildData.current_number}\`!`);
    }

    // Process successful count.
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
    if (userNumber % 1000 === 0) await message.react('🎉'); // Reacts to 1000, 2000, 3000, etc.

    // Update the current high score.
    let newHighScore = guildData.high_score;
    if (!newHighScore) newHighScore = 0;
    if (userNumber > newHighScore) {
        newHighScore = userNumber;
    }

    // Track the successful count in user stats.
    trackUserStat(message.guild.id, message.author.id, 'count', userNumber);

    // Increment the count and persist the updated game state.
    updateGuildState.run(guildData.current_number + 1, message.author.id, newHighScore, guildData.last_high_score, message.guild.id);
});

// Anti-Cheat: Catch message edits for counting attempts
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
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
});

// Anti-Cheat: Catch message deletes for correct counting numbers
client.on(Events.MessageDelete, async message => {
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
        // They deleted the active number! Repost it!
        await message.channel.send(`🚨 **${message.author.username}** tried to delete their count! The last number was **${lastValidNumber}**!`);
    }
});

client.login(process.env.DISCORD_TOKEN);