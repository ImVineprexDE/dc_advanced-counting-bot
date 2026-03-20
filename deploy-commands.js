const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands =[];
// Retrieve all command folders.
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // Retrieve command files recursively.
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    // Extract SlashCommandBuilder#toJSON() for deployment.
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.error(`[ERROR] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Initialize the REST module.
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Register slash commands with Discord API.
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The PUT method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // Handle deployment errors.
        console.error(error);
    }
})();