const axios = require('axios');
const { get } = axios;

// -----------------------------------------------------------------------------
// Riot API rate limiting helpers
// -----------------------------------------------------------------------------

const { schedule, syncLimits, syncMethod } = require('./riotRateLimiter');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Log every request to Riot's APIs so we can trace which endpoint fails
axios.interceptors.request.use(
    async (config) => {
        if (config && /riotgames\.com|ddragon\.leagueoflegends\.com/.test(config.url)) {
            const method = (config.method || 'get').toUpperCase();
            console.log('[Riot API Request]', method, config.url);
            await schedule(config.url);
        }
        return config;
    },
    (error) => {
        const url = error.config?.url || 'Unknown URL';
        console.error('[Riot API Request Error]', url, error.message);
        return Promise.reject(error);
    }
);

// Log every response from Riot's APIs to help debug issues
axios.interceptors.response.use(
    (response) => {
        if (response.config && /riotgames\.com|ddragon\.leagueoflegends\.com/.test(response.config.url)) {
            console.log('[Riot API]', response.config.url);
            console.log('Response:', JSON.stringify(response.data).slice(0, 2000));
            const header = response.headers['x-app-rate-limit'];
            if (header) syncLimits(header);
            let h;
            if (h = response.headers['x-method-rate-limit']) {
                syncMethod(h, response.config.url);
            }
            if (h = response.headers['x-service-rate-limit']) {
                syncMethod(h, response.config.url);
            }
        }
        return response;
    },
    async (error) => {
        const cfg = error.config || {};
        if (cfg && /riotgames\.com|ddragon\.leagueoflegends\.com/.test(cfg.url)) {
            console.error('[Riot API Error]', cfg.url, error.response ? error.response.data : error.message);
        }
        if (error.response && error.response.status === 429) {
            const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
            cfg.__retryCount = (cfg.__retryCount || 0) + 1;
            if (cfg.__retryCount <= 10) {
                const wait = retryAfter * 1000 * Math.pow(2, cfg.__retryCount);
                await sleep(wait);
                return axios(cfg);
            }
        }
        return Promise.reject(error);
    }
);
const AccountDto = require('../dtos/account.dto');
const ParticipantDto = require('../dtos/participant.dto');
const MatchSummaryDto = require('../dtos/matchSummary.dto');
const ProfileAccountDto = require('../dtos/profile.dto');
const SummonerSpellsDto = require('../dtos/summonerSpells.dto');
const BuildDto = require('../dtos/build.dto');
const RunesDto = require('../dtos/runes.dto');
const GameModeDto = require('../dtos/gameMode.dto');
const { QUEUE_DATA } = require('../dtos/queuedata.js');
const PlayerRankDto = require('../dtos/playerRank.dto');
const RankEntryDto = require('../dtos/rankEntry.dto');
const ChampionMasteryDto = require('../dtos/championMastery.dto');

// Simple in-memory caches for matches and static data
const matchDataCache = new Map();
const timelineDataCache = new Map();
const staticDataCache = {};

// -----------------------------------------------------------------------------
// Funciones de ayuda
// -----------------------------------------------------------------------------

function getGameModeDtoByQueueId(queueId) {
    const found = QUEUE_DATA.find((mode) => mode.queueId === queueId);
    if (!found) {
        return new GameModeDto({
            queueId,
            map: 'Unknown',
            description: null,
            notes: null,
        });
    }
    return new GameModeDto(found);
}

async function getAccountDtoByPuuid(puuid, apiKey) {
    try {
        const response = await get(
            `https://americas.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}?api_key=${apiKey}`
        );
        const data = response.data;
        return new AccountDto({
            puuid: data.puuid,
            gameName: data.gameName,
            tagLine: data.tagLine,
        });
    } catch (error) {
        console.error(`Error fetching account by puuid ${puuid}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

async function getAccountDtoByGameName(gameName, tagLine, apiKey) {
    try {
        const response = await get(
            `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${apiKey}`
        );
        const data = response.data;
        return new AccountDto({
            puuid: data.puuid,
            gameName: data.gameName,
            tagLine: data.tagLine,
        });
    } catch (error) {
        console.error(`Error fetching account by puuid ${gameName}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

async function getProfileDtoByPuuid(puuid, apiKey) {
    try {
        const response = await get(
            `https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}?api_key=${apiKey}`
        );
        const data = response.data;
        return new ProfileAccountDto({
            puuid: data.puuid,
            gameName: data.name,
            tagLine: '', // No se provee tagLine en este endpoint
            profileIconId: data.profileIconId,
            summonerLevel: data.summonerLevel,
        });
    } catch (error) {
        console.error(`Error fetching profile for puuid ${puuid}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

async function getPlayerRanks(puuid, apiKey, region = 'la2') {
    try {
        const response = await get(
            `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${apiKey}`
        );
        const data = response.data || [];
        const soloData = data.find((d) => d.queueType === 'RANKED_SOLO_5x5');
        const flexData = data.find((d) => d.queueType === 'RANKED_FLEX_SR');
        const rankedSoloQ = soloData
            ? new RankEntryDto({
                  tier: soloData.tier,
                  rank: soloData.rank,
                  leaguePoints: soloData.leaguePoints,
                  wins: soloData.wins,
                  losses: soloData.losses,
              })
            : null;
        const rankedFlex = flexData
            ? new RankEntryDto({
                  tier: flexData.tier,
                  rank: flexData.rank,
                  leaguePoints: flexData.leaguePoints,
                  wins: flexData.wins,
                  losses: flexData.losses,
              })
            : null;
        return new PlayerRankDto({ rankedSoloQ, rankedFlex });
    } catch (error) {
        console.error(`Error fetching ranks for puuid ${puuid}:`, error.response ? error.response.data : error.message);
        return new PlayerRankDto({ rankedSoloQ: null, rankedFlex: null });
    }
}

async function enrichParticipant(participant, apiKey) {
    if (!participant || !participant.puuid) return null;
    const accountDto = await getAccountDtoByPuuid(participant.puuid, apiKey);

    const summonerSpellsDto = new SummonerSpellsDto({
        summoner1Id: participant.summoner1Id,
        summoner2Id: participant.summoner2Id,
        summoner1Casts: participant.summoner1Casts,
        summoner2Casts: participant.summoner2Casts
    });

    const buildDto = new BuildDto({
        item0: participant.item0,
        item1: participant.item1,
        item2: participant.item2,
        item3: participant.item3,
        item4: participant.item4,
        item5: participant.item5,
        item6: participant.item6,
        itemsPurchased: participant.itemsPurchased,
        goldSpent: participant.goldSpent
    });

    const runesDto = new RunesDto({
        statPerks: participant.perks?.statPerks,
        styles: participant.perks?.styles
    });

    return new ParticipantDto({
        championName: participant.championName,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        goldEarned: participant.goldEarned,
        win: participant.win,
        teamId: participant.teamId,
        accountDto,
        summonerSpellsDto,
        buildDto,
        runesDto
    });
}

// -----------------------------------------------------------------------------
// Nuevas utilidades para estadísticas globales de campeones
// -----------------------------------------------------------------------------

const summonerCache = {};

async function getLatestPatch() {
    const { data } = await get('https://ddragon.leagueoflegends.com/api/versions.json');
    const version = data[0];
    const patch = version.split('.').slice(0, 2).join('.');
    return { version, patch };
}

async function downloadStaticData(version, championName) {
    const key = `${version}-${championName}`;
    if (staticDataCache[key]) return staticDataCache[key];
    const [itemsResp, champResp] = await Promise.all([
        get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`),
        get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${championName}.json`)
    ]);
    staticDataCache[key] = { items: itemsResp.data, champion: champResp.data };
    return staticDataCache[key];
}

async function getSeedSummonerIds(apiKey, region = 'la2') {
    const endpoints = {
        CHALLENGER: `https://${region}.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`,
        GRANDMASTER: `https://${region}.api.riotgames.com/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`,
        MASTER: `https://${region}.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`
    };

    const puuids = new Set();
    for (const [tier, url] of Object.entries(endpoints)) {
        try {
            const { data } = await get(url);
            for (const entry of data.entries || []) {
                if (entry.puuid) {
                    puuids.add(entry.puuid);
                } else if (entry.summonerId) {
                    const puuid = await summonerIdToPuuid(entry.summonerId, apiKey, region);
                    if (puuid) puuids.add(puuid);
                }
            }
        } catch (err) {
            console.error(`Error fetching ${tier} league entries:`, err.response ? err.response.data : err.message);
        }
    }

    return Array.from(puuids);
}

async function summonerIdToPuuid(summonerId, apiKey, region = 'la2') {
    if (summonerCache[summonerId]) return summonerCache[summonerId];
    try {
        const { data } = await get(
            `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/${summonerId}?api_key=${apiKey}`
        );
        summonerCache[summonerId] = data.puuid;
        return summonerCache[summonerId];
    } catch (err) {
        console.error(`Error converting summonerId ${summonerId}:`, err.response ? err.response.data : err.message);
        return null;
    }
}

async function getMatchIdsByPuuid(puuid, apiKey, limit = Infinity) {
    const ids = [];
    let start = 0;
    while (ids.length < limit) {
        const count = Math.min(100, limit - ids.length);
        const { data } = await get(
            `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?type=ranked&queue=420&start=${start}&count=${count}&api_key=${apiKey}`
        );
        if (!data || !data.length) break;
        ids.push(...data);
        if (data.length < count) break;
        start += data.length;
    }
    return ids.slice(0, limit);
}

async function fetchMatchData(matchId, apiKey) {
    if (matchDataCache.has(matchId)) return matchDataCache.get(matchId);
    const resp = await get(
        `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`
    );
    matchDataCache.set(matchId, resp.data);
    return resp.data;
}

async function fetchMatchTimeline(matchId, apiKey) {
    if (timelineDataCache.has(matchId)) return timelineDataCache.get(matchId);
    const resp = await get(
        `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline?api_key=${apiKey}`
    );
    timelineDataCache.set(matchId, resp.data);
    return resp.data;
}

async function computeChampionStatsForPuuid(puuid, championId, apiKey, patchPrefix, maxMatches = Infinity, includeTimelines = true) {
    const matchIds = await getMatchIdsByPuuid(puuid, apiKey, maxMatches);
    const matchesFetched = matchIds.length;

    const buildStats = {};
    const runeStats = {};
    const spellStats = {};
    const abilityOrderStats = {};
    const roleStats = {};
    let gamesPlayed = 0;
    let wins = 0;
    let totalMatches = 0;

    for (const matchId of matchIds) {
        const matchData = await fetchMatchData(matchId, apiKey);
        if (patchPrefix && !matchData.info.gameVersion.startsWith(patchPrefix)) continue;
        if (matchData.info.queueId !== 420) continue;
        totalMatches += 1;
        const participant = matchData.info.participants.find(p =>
            p.puuid === puuid &&
            p.championId === championId
        );
        if (!participant) continue;

        gamesPlayed += 1;
        if (participant.win) wins += 1;

        const buildKey = [
            participant.item0,
            participant.item1,
            participant.item2,
            participant.item3,
            participant.item4,
            participant.item5
        ].join('-');
        if (!buildStats[buildKey]) {
            buildStats[buildKey] = {
                games: 0,
                wins: 0,
                items: {
                    item0: participant.item0,
                    item1: participant.item1,
                    item2: participant.item2,
                    item3: participant.item3,
                    item4: participant.item4,
                    item5: participant.item5,
                    item6: participant.item6
                }
            };
        }
        buildStats[buildKey].games += 1;
        if (participant.win) buildStats[buildKey].wins += 1;

        const runesKey = JSON.stringify({
            statPerks: participant.perks?.statPerks,
            styles: participant.perks?.styles
        });
        if (!runeStats[runesKey]) {
            runeStats[runesKey] = {
                games: 0,
                wins: 0,
                runes: {
                    statPerks: participant.perks?.statPerks,
                    styles: participant.perks?.styles
                }
            };
        }
        runeStats[runesKey].games += 1;
        if (participant.win) runeStats[runesKey].wins += 1;

        const spellsKey = `${participant.summoner1Id}-${participant.summoner2Id}`;
        if (!spellStats[spellsKey]) {
            spellStats[spellsKey] = {
                games: 0,
                wins: 0,
                spells: {
                    summoner1Id: participant.summoner1Id,
                    summoner2Id: participant.summoner2Id
                }
            };
        }
        spellStats[spellsKey].games += 1;
        if (participant.win) spellStats[spellsKey].wins += 1;

        const role = participant.teamPosition || participant.role || 'UNKNOWN';
        if (!roleStats[role]) {
            roleStats[role] = { games: 0, wins: 0 };
        }
        roleStats[role].games += 1;
        if (participant.win) roleStats[role].wins += 1;

        if (includeTimelines) {
            try {
                const timeline = await fetchMatchTimeline(matchId, apiKey);
                const participantIndex = matchData.metadata.participants.indexOf(puuid) + 1;
                const skillEvents = [];
                for (const frame of timeline.info.frames) {
                    for (const ev of frame.events) {
                        if (ev.type === 'SKILL_LEVEL_UP' && ev.participantId === participantIndex) {
                            skillEvents.push(ev.skillSlot);
                        }
                    }
                }
                const orderKey = skillEvents.join('-');
                if (!abilityOrderStats[orderKey]) {
                    abilityOrderStats[orderKey] = { games: 0, wins: 0, order: skillEvents };
                }
                abilityOrderStats[orderKey].games += 1;
                if (participant.win) abilityOrderStats[orderKey].wins += 1;
            } catch (e) {
                console.error(`Error fetching timeline for ${matchId}:`, e.response ? e.response.data : e.message);
            }
        }
    }

    return { buildStats, runeStats, spellStats, abilityOrderStats, roleStats, gamesPlayed, wins, totalMatches, matchesFetched };
}

async function parseMatchSummary(matchData, apiKey) {
    const enrichedParticipants = await Promise.all(
        matchData.info.participants.map(p => enrichParticipant(p, apiKey))
    );

    const gameModeDto = getGameModeDtoByQueueId(matchData.info.queueId);

    return new MatchSummaryDto({
        matchId: matchData.metadata.matchId,
        gameDuration: matchData.info.gameDuration,
        participants: enrichedParticipants.filter(p => p !== null),
        gameModeDto
    });
}

// -----------------------------------------------------------------------------
// Funciones auxiliares para estadísticas globales
// -----------------------------------------------------------------------------

const championIdCache = {};
const championInfoCache = {};
let championListCache = null;

function normalizeChampionName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

async function getChampionIdByName(championName) {
    const key = normalizeChampionName(championName);
    if (championIdCache[key]) return championIdCache[key];
    try {
        const versionsResp = await get('https://ddragon.leagueoflegends.com/api/versions.json');
        const version = versionsResp.data[0];
        const champsResp = await get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
        const champs = champsResp.data.data || {};
        const found = Object.values(champs).find(c => {
            const nameNorm = normalizeChampionName(c.name);
            const idNorm = normalizeChampionName(c.id);
            return nameNorm === key || idNorm === key;
        });
        if (!found) return null;
        championIdCache[key] = parseInt(found.key, 10);
        return championIdCache[key];
    } catch (err) {
        console.error('Error fetching champion list:', err.response ? err.response.data : err.message);
        return null;
    }
}

async function getChampionInfoByName(championName) {
    const key = normalizeChampionName(championName);
    if (championInfoCache[key]) return championInfoCache[key];
    try {
        const versionsResp = await get('https://ddragon.leagueoflegends.com/api/versions.json');
        const version = versionsResp.data[0];
        const champsResp = await get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
        const champs = champsResp.data.data || {};
        const found = Object.values(champs).find(c => {
            const nameNorm = normalizeChampionName(c.name);
            const idNorm = normalizeChampionName(c.id);
            return nameNorm === key || idNorm === key;
        });
        if (!found) return null;
        const info = { id: parseInt(found.key, 10), fileName: found.id };
        championInfoCache[key] = info;
        return info;
    } catch (err) {
        console.error('Error fetching champion list:', err.response ? err.response.data : err.message);
        return null;
    }
}

async function getAllChampionNames() {
    if (championListCache) return championListCache;
    try {
        const versionsResp = await get('https://ddragon.leagueoflegends.com/api/versions.json');
        const version = versionsResp.data[0];
        const champsResp = await get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
        championListCache = Object.values(champsResp.data.data || {}).map(c => c.id);
        return championListCache;
    } catch (err) {
        console.error('Error fetching champion list:', err.response ? err.response.data : err.message);
        return [];
    }
}


// -----------------------------------------------------------------------------
// Champion mastery helper functions
// -----------------------------------------------------------------------------

async function getChampionMasteriesByPuuid(puuid, apiKey, region = 'la2') {
    const resp = await get(
        `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}?api_key=${apiKey}`
    );
    return (resp.data || []).map(m => new ChampionMasteryDto(m));
}

async function getChampionMasteryByPuuidAndChampion(puuid, championId, apiKey, region = 'la2') {
    const resp = await get(
        `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/by-champion/${championId}?api_key=${apiKey}`
    );
    return new ChampionMasteryDto(resp.data);
}

async function getTopChampionMasteriesByPuuid(puuid, apiKey, count = 3, region = 'la2') {
    const resp = await get(
        `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}&api_key=${apiKey}`
    );
    return (resp.data || []).map(m => new ChampionMasteryDto(m));
}

async function getChampionMasteryScoreByPuuid(puuid, apiKey, region = 'la2') {
    const resp = await get(
        `https://${region}.api.riotgames.com/lol/champion-mastery/v4/scores/by-puuid/${puuid}?api_key=${apiKey}`
    );
    return resp.data;
}

// -----------------------------------------------------------------------------
// Función principal para obtener estadísticas globales de un campeón
// -----------------------------------------------------------------------------

async function getChampionGlobalStats(championName, apiKey, region = 'la2', limit = 500) {
    const { version, patch } = await getLatestPatch();
    const info = await getChampionInfoByName(championName);
    if (!info) return null;
    await downloadStaticData(version, info.fileName);

    const championId = info.id;

    const puuids = await getSeedSummonerIds(apiKey, region);

    const aggregatedBuilds = {};
    const aggregatedRunes = {};
    const aggregatedSpells = {};
    const aggregatedOrders = {};
    const aggregatedRoles = {};
    let totalGames = 0;
    let totalWins = 0;
    let totalMatches = 0;

    let remaining = limit;
    for (const puuid of puuids) {
        if (remaining <= 0) break;
        const stats = await computeChampionStatsForPuuid(puuid, championId, apiKey, patch, remaining, false);
        remaining -= stats.matchesFetched;
        totalMatches += stats.totalMatches;
        totalGames += stats.gamesPlayed;
        totalWins += stats.wins;

        for (const [key, val] of Object.entries(stats.buildStats)) {
            if (!aggregatedBuilds[key]) {
                aggregatedBuilds[key] = { games: 0, wins: 0, items: val.items };
            }
            aggregatedBuilds[key].games += val.games;
            aggregatedBuilds[key].wins += val.wins;
        }

        for (const [key, val] of Object.entries(stats.runeStats)) {
            if (!aggregatedRunes[key]) {
                aggregatedRunes[key] = { games: 0, wins: 0, runes: val.runes };
            }
            aggregatedRunes[key].games += val.games;
            aggregatedRunes[key].wins += val.wins;
        }

        for (const [key, val] of Object.entries(stats.spellStats)) {
            if (!aggregatedSpells[key]) {
                aggregatedSpells[key] = { games: 0, wins: 0, spells: val.spells };
            }
            aggregatedSpells[key].games += val.games;
            aggregatedSpells[key].wins += val.wins;
        }

        for (const [key, val] of Object.entries(stats.abilityOrderStats)) {
            if (!aggregatedOrders[key]) {
                aggregatedOrders[key] = { games: 0, wins: 0, order: val.order };
            }
            aggregatedOrders[key].games += val.games;
            aggregatedOrders[key].wins += val.wins;
        }

        for (const [role, val] of Object.entries(stats.roleStats)) {
            if (!aggregatedRoles[role]) {
                aggregatedRoles[role] = { games: 0, wins: 0 };
            }
            aggregatedRoles[role].games += val.games;
            aggregatedRoles[role].wins += val.wins;
        }
    }

    const buildEntries = Object.values(aggregatedBuilds).map(b => ({
        ...b,
        winRate: b.games > 0 ? (b.wins / b.games) * 100 : 0
    })).sort((a, b) => b.winRate - a.winRate || b.games - a.games);

    const runeEntries = Object.values(aggregatedRunes).map(r => ({
        ...r,
        winRate: r.games > 0 ? (r.wins / r.games) * 100 : 0
    })).sort((a, b) => b.winRate - a.winRate || b.games - a.games);

    const spellEntries = Object.values(aggregatedSpells).map(s => ({
        ...s,
        winRate: s.games > 0 ? (s.wins / s.games) * 100 : 0
    })).sort((a, b) => b.winRate - a.winRate || b.games - a.games);

    const orderEntries = Object.values(aggregatedOrders).map(o => ({
        ...o,
        winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0
    })).sort((a, b) => b.winRate - a.winRate || b.games - a.games);

    const roles = Object.entries(aggregatedRoles).map(([role, val]) => {
        const winRate = val.games > 0 ? (val.wins / val.games) * 100 : 0;
        return { role, gamesPlayed: val.games, wins: val.wins, winRate };
    });

    const bestBuild = buildEntries.length ? buildEntries[0].items : null;
    const bestRunes = runeEntries.length ? runeEntries[0].runes : null;
    const bestSpells = spellEntries.length ? spellEntries[0].spells : null;
    const bestSkillOrder = orderEntries.length ? orderEntries[0].order : [];

    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    const pickRate = totalMatches > 0 ? (totalGames / totalMatches) * 100 : 0;

    return {
        championName,
        gamesPlayed: totalGames,
        wins: totalWins,
        winRate,
        pickRate,
        bestBuild,
        bestRunes,
        bestSpells,
        bestSkillOrder,
        roles,
        puuids
    };
}


module.exports = {
    getGameModeDtoByQueueId,
    getAccountDtoByPuuid,
    getAccountDtoByGameName,
    getProfileDtoByPuuid,
    getPlayerRanks,
    enrichParticipant,
    computeChampionStatsForPuuid,
    parseMatchSummary,
    getChampionIdByName,
    getChampionInfoByName,
    getChampionMasteriesByPuuid,
    getChampionMasteryByPuuidAndChampion,
    getTopChampionMasteriesByPuuid,
    getChampionMasteryScoreByPuuid,
    getLatestPatch,
    downloadStaticData,
    getSeedSummonerIds,
    summonerIdToPuuid,
    getMatchIdsByPuuid,
    getChampionGlobalStats,
    getAllChampionNames
};
