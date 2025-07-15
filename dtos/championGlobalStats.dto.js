class ChampionGlobalStatsDto {
    constructor({ championName, gamesPlayed, wins, winRate, pickRate, bestBuild, bestRunes, bestSpells, bestSkillOrder, roles, puuids }) {
        this.championName = championName;
        this.gamesPlayed = gamesPlayed;
        this.wins = wins;
        this.winRate = winRate;
        this.pickRate = pickRate;         // porcentaje de partidas donde se jugó el campeón
        this.bestBuild = bestBuild;       // BuildDto
        this.bestRunes = bestRunes;       // RunesDto
        this.bestSpells = bestSpells;     // SummonerSpellsDto
        this.bestSkillOrder = bestSkillOrder; // array de skill slots
        this.roles = roles;               // array de RoleStatsDto
        this.puuids = puuids;             // lista de puuids procesados
    }
}

module.exports = ChampionGlobalStatsDto;
