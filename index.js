const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { evaluate } = require('mathjs'); // The safe math library!
require('dotenv').config();

// 1. ADD NEW INTENTS HERE SO THE BOT CAN READ MESSAGES
const client = new Client({ 
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Required to read what users type!
    ] 
});

client.commands = new Collection();

// --- DYNAMIC COMMAND LOADER ---
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
            console.log(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
        }
    }
}

// --- WHEN BOT IS READY ---
client.once(Events.ClientReady, readyClient => {
    console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
});

// --- SLASH COMMAND EXECUTOR ---
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

// --- COUNTING GAME LISTENER ---
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

// --- UPDATED RUIN COUNT LOGIC (WITH VIBES & EMOJIS) ---
    const ruinCount = async (reason) => {
        const achievedNumber = guildData.currentNumber - 1;
        const currentRecord = guildData.highScore || 0;
        
        let recordText = `🏆 The server **HIGHSCORE** is \`${currentRecord}\`.`;
        
        // Did they set a new record before ruining it?
        if (achievedNumber > currentRecord && achievedNumber > 0) {
            recordText = `🎉 Wait... they actually set a **NEW SERVER HIGHSCORE** of \`${achievedNumber}\`! 🏆`;
            guildData.highScore = achievedNumber; // Save the new record
        }

        await message.react('❌');
        
        // Format the message with emojis and actually MENTION the user!
        let ruinMessage = `🚨 ${reason}\n\n💀 ${message.author} ruined the count`;
        if (achievedNumber > 0) ruinMessage += ` at **${achievedNumber}**!`;
        else ruinMessage += `!`;
        
        ruinMessage += `\n${recordText}\n🔄 The count has been reset to **1**. Start again!`;

        await message.reply(ruinMessage);
        
        // Reset the count but KEEP the high score
        guildData.currentNumber = 1;
        guildData.lastUserId = null;
        fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
    };

    // 1. Valid input?
    if (!isValidInput) {
        return ruinCount(`That's not a valid ${guildData.mode === 'advanced' ? 'math equation' : 'number'}!`);
    }

    // 2. Twice in a row logic
    if (message.author.id === guildData.lastUserId) {
        const behavior = guildData.twiceBehavior || 'reset'; 

        if (behavior === 'warn') {
            await message.react('⚠️');
            return message.reply(`You can't count twice in a row, **${message.author.username}**! The next number is still **${guildData.currentNumber}**.`);
        } else if (behavior === 'allow') {
            // Do nothing, let them continue counting
        } else {
            return ruinCount(`You can't count twice in a row!`);
        }
    }

    // 3. Right number?
    if (userNumber !== guildData.currentNumber) {
        return ruinCount(`You typed **${userNumber}**, but the next number was **${guildData.currentNumber}**!`);
    }

    // 4. Correct!
    await message.react('✅');
    
    // --- MILESTONES (EASY & FUN) ---
    if (userNumber === 69) await message.react('🍆');
    if (userNumber === 100) await message.react('💯');
    if (userNumber === 420) await message.react('😎');
    if (userNumber % 1000 === 0) await message.react('🎉'); // Reacts to 1000, 2000, 3000, etc.

    // Update the high score instantly just in case the bot restarts
    if (!guildData.highScore) guildData.highScore = 0;
    if (userNumber > guildData.highScore) {
        guildData.highScore = userNumber;
    }

    // Advance the game
    guildData.currentNumber += 1;
    guildData.lastUserId = message.author.id;
    fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
});

client.login(process.env.DISCORD_TOKEN);