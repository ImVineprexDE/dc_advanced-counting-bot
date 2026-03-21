const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');

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

// Safely append new feature columns to existing local databases
try { db.exec('ALTER TABLE guild_data ADD COLUMN extra_lives INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE guild_data ADD COLUMN extralife_enabled INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE guild_data ADD COLUMN extralife_interval INTEGER DEFAULT 100'); } catch(e) {}

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

module.exports = db;
