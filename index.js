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
    if (userNumber === 69) await message.react('🍆');
    if (userNumber === 100) await message.react('💯');
    if (userNumber === 420) await message.react('😎');
    if (userNumber % 1000 === 0) await message.react('🎉'); // Reacts to 1000, 2000, 3000, etc.

    // Update the current high score.
    if (!guildData.highScore) guildData.highScore = 0;
    if (userNumber > guildData.highScore) {
        guildData.highScore = userNumber;
    }

    // Increment the count and persist the updated game state.
    guildData.currentNumber += 1;
    guildData.lastUserId = message.author.id;
    fs.writeFileSync(dataPath, JSON.stringify(database, null, 4));
});

client.login(process.env.DISCORD_TOKEN);