const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { evaluate } = require('mathjs'); // The safe math library!
require('dotenv').config();

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

// Process incoming messages for the counting game.
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const dataPath = path.join(__dirname, 'data.json');
    let database = {};
    try {
        database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
        return;
    }

    const guildData = database[message.guild.id];
    if (!guildData) return;
    if (message.channel.id !== guildData.channelId) return;

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
        const achievedNumber = guildData.currentNumber - 1;
        // Retrieve the previous high score to verify if a new record was set.
        const previousRecord = guildData.lastHighScore !== undefined ? guildData.lastHighScore : (guildData.highScore || 0);
        const currentRecord = guildData.highScore || 0;

        let recordText = `🏆 The server **HIGHSCORE** is \`${currentRecord}\`.`;

        // Evaluate if the current session establishes a new historical best.
        if (achievedNumber > previousRecord && achievedNumber > 0) {
            recordText = `🎉 Wait... they actually set a **NEW SERVER HIGHSCORE** of \`${achievedNumber}\`! 🏆`;
        }

        await message.react('❌');

        // Track the ruin in user stats.
        const userId = message.author.id;
        guildData.users = guildData.users || {};
        guildData.users[userId] = guildData.users[userId] || { counts: 0, ruins: 0, highest: 0 };
        guildData.users[userId].ruins += 1;

        // Format the ruin notification message.
        let ruinMessage = `🚨 ${reason}\n\n💀 ${message.author} ruined the count`;
        if (achievedNumber > 0) ruinMessage += ` at \`${achievedNumber}\`!`;
        else ruinMessage += `!`;

        ruinMessage += `\n${recordText}\n🔄 The count has been reset to \`1\`. Start again!`;

        await message.reply(ruinMessage);

        // Reset the game state while preserving the high score.
        guildData.currentNumber = 1;
        guildData.lastUserId = null;
        // Persist the current high score as the baseline for the next session.
        guildData.lastHighScore = guildData.highScore;
        fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
    };

    // Validate the user input based on the game mode.
    if (!isValidInput) {
        if (guildData.allowTalking) return; // Ignore normal text chat
        return ruinCount(`That's not a valid ${guildData.mode === 'advanced' ? 'math equation' : 'number'}!`);
    }

    // Handle consecutive counts by the same user.
    if (message.author.id === guildData.lastUserId) {
        const behavior = guildData.twiceBehavior || 'reset';

        if (behavior === 'warn') {
            await message.react('⚠️');
            return message.reply(`You can't count twice in a row, **${message.author.username}**! The next number is still **${guildData.currentNumber}**.`);
        } else if (behavior === 'allow') {
            // No action needed; allow consecutive counting.
        } else {
            return ruinCount(`You can't count twice in a row!`);
        }
    }

    // Verify if the input matches the expected sequence number.
    if (userNumber !== guildData.currentNumber) {
        return ruinCount(`You typed \`${userNumber}\`, but the next number was \`${guildData.currentNumber}\`!`);
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
    if (!guildData.highScore) guildData.highScore = 0;
    if (userNumber > guildData.highScore) {
        guildData.highScore = userNumber;
    }

    // Track the successful count in user stats.
    const userId = message.author.id;
    guildData.users = guildData.users || {};
    guildData.users[userId] = guildData.users[userId] || { counts: 0, ruins: 0, highest: 0 };
    guildData.users[userId].counts += 1;
    if (userNumber > guildData.users[userId].highest) {
        guildData.users[userId].highest = userNumber;
    }

    // Increment the count and persist the updated game state.
    guildData.currentNumber += 1;
    guildData.lastUserId = message.author.id;
    fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
});

// Anti-Cheat: Catch message edits for counting attempts
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (newMessage.author && newMessage.author.bot) return;
    
    const dataPath = path.join(__dirname, 'data.json');
    let database = {};
    try {
        database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch(err) { return; }
    
    const guildData = database[newMessage.guildId];
    if (!guildData || newMessage.channelId !== guildData.channelId) return;
    
    if (oldMessage.partial) return; // Can't verify original content
    
    const lastValidNumber = guildData.currentNumber - 1;
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
    await newMessage.reply(`⚠️ **${newMessage.author.username}**, you are not allowed to edit your counting numbers!`);
});

// Anti-Cheat: Catch message deletes for correct counting numbers
client.on(Events.MessageDelete, async message => {
    if (message.partial || (message.author && message.author.bot)) return;
    
    const dataPath = path.join(__dirname, 'data.json');
    let database = {};
    try {
        database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch(err) { return; }
    
    const guildData = database[message.guildId];
    if (!guildData || message.channelId !== guildData.channelId) return;

    const lastValidNumber = guildData.currentNumber - 1;
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