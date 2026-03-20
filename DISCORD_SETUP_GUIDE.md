# Discord Bot Setup Guide

To get this bot running perfectly on your own server, you'll need to configure an Application on the Discord Developer Portal and retrieve three important pieces of information.

## Step 1: Create the Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** in the top right corner and give your bot a name.
3. Once created, look at the **General Information** page. Here you will find your **Application ID**.
4. Copy your **Application ID**. You will need to save this as your `CLIENT_ID`.

## Step 2: Configure the Bot
1. On the left sidebar, click on **Bot**.
2. Scroll down until you see **Privileged Gateway Intents**.
3. **CRITICAL:** You absolutely *must* turn ON the **Message Content Intent**. The advanced counting bot needs this turned on to mathematically evaluate the numbers users type. If you forget this, the bot will not read incoming messages!
4. Click **Reset Token** to generate your bot's password. 
5. Copy this token immediately. You will need to save this as your `DISCORD_TOKEN`. (Never share this with anyone!)

## Step 3: Invite the Bot to Your Server
1. On the left sidebar, click **OAuth2** and then select **URL Generator**.
2. Under **Scopes**, check `bot` and `applications.commands`.
3. Under **Bot Permissions**, check **Administrator** (or explicitly grant Read Messages, Send Messages, Manage Messages, Add Reactions, and Read Message History).
4. Copy the Generated URL at the bottom of the page.
5. Paste that URL into a new browser tab to invite your shiny new bot to your server!

## Step 4: Get Your Server ID
1. Open your Discord App. Go to User Settings -> Advanced -> Turn ON **Developer Mode**.
2. Right-click your Server's Icon on the left side of Discord, and click **Copy Server ID**.
3. Save this ID. It will be your `GUILD_ID`.

## Step 5: Start the Engine
Create a file named `.env` in the same directory as the bot code (right next to `index.js`), and open it in a text editor. Format it exactly like this:

```env
DISCORD_TOKEN="YOUR_NEW_BOT_TOKEN_FROM_STEP_2"
CLIENT_ID="YOUR_APPLICATION_ID_FROM_STEP_1"
GUILD_ID="YOUR_SERVER_ID_FROM_STEP_4"
```

Once the `.env` file is saved, open your server terminal:
1. Run `npm install` to natively download the required modules.
2. Run `node deploy-commands.js` to formally register `/setup`, `/stats`, `/leaderboard`, and `/reset` to your server's Discord API.
3. Run `node index.js` to boot the bot online!

You're done! You can now navigate to your server and type `/setup` to activate the counting logic!
