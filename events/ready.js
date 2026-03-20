const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(readyClient) {
        console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
    },
};
