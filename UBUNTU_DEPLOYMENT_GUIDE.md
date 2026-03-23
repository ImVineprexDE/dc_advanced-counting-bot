# Ubuntu Auto-Start Deployment Guide

This guide details exactly how to deploy your Advanced Counting Bot as an indestructible, auto-starting background service on your Ubuntu VPS using native `systemd`.

## Step 1: Install Prerequisites 📦
First, make sure your server has Node.js and Git installed. Log into your Ubuntu server terminal and run:
```bash
sudo apt update
sudo apt install nodejs npm git -y
```

## Step 2: Download the Bot 👇
Let's store the bot in the standard `/opt/` repository directory.
```bash
cd /opt/
sudo git clone https://github.com/ImVineprexDE/dc_advanced-counting-bot.git
cd dc_advanced-counting-bot
```

## Step 3: Install Dependencies 🔧
Install only the packages strictly necessary for running the bot.
```bash
sudo npm install --omit=dev
```

## Step 4: Configure the Environment 🔐
Create your `.env` file right there in the folder.
```bash
sudo nano .env
```
Paste in your credentials identically to how it was setup on your local machine:
```env
DISCORD_TOKEN="YOUR_BOT_TOKEN_HERE"
CLIENT_ID="YOUR_APPLICATION_ID_HERE"
GUILD_ID="YOUR_SERVER_ID_HERE"
```
*(Press `CTRL + O` to save, `Enter` to confirm, and `CTRL + X` to exit Nano.)*

## Step 5: Deploy Commands 🚀
Register your slash commands to your server API. 
```bash
sudo node deploy-commands.js
```
You should see a green success message confirming they are securely synced.

## Step 6: Create the SystemD Service 🛠️
To make the bot run 24/7 and automatically start if your server reboots, we will create a systemd service file.

Create the file using Nano:
```bash
sudo nano /etc/systemd/system/countingbot.service
```

Copy and exactly paste the following configuration into the file:
```ini
[Unit]
Description=Advanced Discord Counting Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/dc_advanced-counting-bot
ExecStart=/usr/bin/node /opt/dc_advanced-counting-bot/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```
*(Press `CTRL + O` to save, `Enter` to confirm, and `CTRL + X` to exit.)*

## Step 7: Launch the Bot into the Background! 💫
Finally, we just need to tell Ubuntu to recognize our new service, enable it to start on boot, and start it immediately.

Run these three commands:
```bash
sudo systemctl daemon-reload
sudo systemctl enable countingbot
sudo systemctl start countingbot
```

**You're done!** 
The bot is now fully operational securely in the background! You can disconnect entirely from your SSH terminal, and the bot will continue running indefinitely without interruption.

### Useful Commands to Remember
If you ever want to check if the bot is running smoothly:
```bash
sudo systemctl status countingbot
```
To read the live raw terminal logs directly out of index.js (helpful for seeing when migration finishes!):
```bash
sudo journalctl -u countingbot -f
```
To safely stop the bot completely:
```bash
sudo systemctl stop countingbot
```
To restart the bot (e.g. if you did a `git pull` to update the codebase):
```bash
sudo systemctl restart countingbot
```
