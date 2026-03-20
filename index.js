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
    // Ignore messages from bots (including itself) to prevent infinite loops
    if (message.author.bot) return;

    // Load our saved data
    const dataPath = path.join(__dirname, 'data.json');
    let database = {};
    try {
        database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
        return; // If data.json doesn't exist or is broken, do nothing
    }

    // Check if this server has set up the game
    const guildData = database[message.guild.id];
    if (!guildData) return;

    // Check if the message is in the specific counting channel
    if (message.channel.id !== guildData.channelId) return;

    // --- GAME LOGIC STARTS HERE ---
    let userNumber = null;
    let isValidInput = false;

    // Figure out what number the user typed based on the mode
    if (guildData.mode === 'advanced') {
        try {
            // Safely calculate the math (e.g., "5 + 5" becomes 10)
            userNumber = evaluate(message.content);
            // Ensure the result is actually a standard number
            if (typeof userNumber === 'number' && !isNaN(userNumber)) {
                isValidInput = true;
            }
        } catch (error) {
            // If they type text that isn't math (like "hello"), it throws an error.
            isValidInput = false;
        }
    } else {
        // Basic Mode: Only accept standard digits (e.g., "5")
        if (/^\d+$/.test(message.content.trim())) {
            userNumber = parseInt(message.content.trim(), 10);
            isValidInput = true;
        }
    }

    // Function to handle ruining the count
    const ruinCount = async (reason) => {
        await message.react('❌');
        await message.reply(`${reason} **${message.author.username}** ruined the count! It has been reset to **1**.`);
        
        // Reset the data
        guildData.currentNumber = 1;
        guildData.lastUserId = null;
        fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
    };

    // 1. Did they type complete nonsense?
    if (!isValidInput) {
        return ruinCount(`That's not a valid ${guildData.mode === 'advanced' ? 'math equation' : 'number'}!`);
    }

    // 2. Did they try to count twice in a row?
    if (message.author.id === guildData.lastUserId) {
        // We use || 'reset' as a fallback just in case old data doesn't have this setting yet
        const behavior = guildData.twiceBehavior || 'reset'; 

        if (behavior === 'warn') {
            await message.react('⚠️');
            return message.reply(`You can't count twice in a row, **${message.author.username}**! The next number is still **${guildData.currentNumber}**.`);
        } else if (behavior === 'allow') {
            // Do absolutely nothing here! It will skip this block and move 
            // straight to checking if their math/number is correct.
        } else {
            // Default 'reset' behavior
            return ruinCount(`You can't count twice in a row!`);
        }
    }

    // 3. Did they get the number wrong?
    if (userNumber !== guildData.currentNumber) {
        return ruinCount(`You typed **${userNumber}**, but the next number was **${guildData.currentNumber}**!`);
    }

    // 4. THEY GOT IT RIGHT!
    await message.react('✅');
    
    // Update the next expected number and remember who counted
    guildData.currentNumber += 1;
    guildData.lastUserId = message.author.id;
    
    // Save the progress
    fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
});

client.login(process.env.DISCORD_TOKEN);