# 🔢 Advanced Counting Bot

A feature-rich, highly customizable Discord bot built with `discord.js` for server counting games. Designed with an emphasis on both simple and advanced rulesets.

## ✨ Features
- **Two Game Modes:**
  - **Basic:** Standard sequential counting (1, 2, 3...).
  - **Advanced:** Supports mathematical equations (e.g., `5+5` instead of `10`).
- **Consecutive Counting Control:** Configurable behaviors to allow, warn, or strictly reset when a user counts twice in a row.
- **Milestones:** Fun dynamic reactions for reaching milestone numbers like 69, 100, 420, and every 1,000.
- **Persistent High Scores:** Tracks and remembers the highest count the server has ever reached.
- **User Stats System:** Tracks individual user accuracy, total counts, ruined counts, and personal bests.

## ⚙️ Commands Profile
- `/setup`: Initialize the text channel, ruleset, and behavior mechanics for the server. (Administrator Only)
- `/reset`: Manage database resets for specific properties like recovering from a broken high score. (Administrator Only)
- `/stats`: View your personal or others' accuracy and overall statistics.
- `/leaderboard`: Display the top 10 most active counters in the server.
- `/ping`: Standard utility response testing command.

## 🚀 Installation & Setup
1. Clone this repository.
2. Run `npm install` to install all dependencies.
3. Configure your environment variables in a `.env` file containing `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID`.
4. Deploy the application commands using `node deploy-commands.js`.
5. Start your instance using `node index.js`.
