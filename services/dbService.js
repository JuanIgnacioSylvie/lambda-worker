const mysql = require('mysql2/promise');

const championsEnabled = process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;
const usersEnabled     = process.env.DB_HOST && process.env.DB_USER && process.env.DB_USERS_NAME;

let championPool = null;
let usersPool = null;

if (championsEnabled) {
    championPool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
    });
}

if (usersEnabled) {
    usersPool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_USERS_NAME,
        waitForConnections: true,
        connectionLimit: 10,
    });
}

async function saveChampionStats(championName, stats) {
    if (!championPool) return;
    const data = JSON.stringify(stats);
    await championPool.query(
        `REPLACE INTO champion_stats (champion_name, data, updated_at) VALUES (?, ?, NOW())`,
        [championName, data]
    );
}

async function getChampionStats(championName) {
    if (!championPool) return null;
    const [rows] = await championPool.query(
        `SELECT data FROM champion_stats WHERE champion_name = ?`,
        [championName]
    );
    if (rows.length) return JSON.parse(rows[0].data);
    return null;
}

async function saveUserStats(puuid, stats) {
    if (!usersPool) return;
    const data = JSON.stringify(stats);
    await usersPool.query(
        `REPLACE INTO users (puuid, data, updated_at) VALUES (?, ?, NOW())`,
        [puuid, data]
    );
}

async function getUserStats(puuid) {
    if (!usersPool) return null;
    const [rows] = await usersPool.query(
        `SELECT data FROM users WHERE puuid = ?`,
        [puuid]
    );
    if (rows.length) return JSON.parse(rows[0].data);
    return null;
}

async function closePools() {
    if (championPool) {
        await championPool.end();
        championPool = null;
    }
    if (usersPool) {
        await usersPool.end();
        usersPool = null;
    }
}

module.exports = {
    championPool,
    usersPool,
    saveChampionStats,
    getChampionStats,
    saveUserStats,
    getUserStats,
    closePools
};
