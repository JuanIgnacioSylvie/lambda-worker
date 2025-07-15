class ChampionDetailedStatsDto {
    constructor({ championName, gamesPlayed, wins, winRate, bestBuild, bestRunes }) {
        this.championName = championName;
        this.gamesPlayed = gamesPlayed;
        this.wins = wins;
        this.winRate = winRate;
        this.bestBuild = bestBuild; // BuildDto
        this.bestRunes = bestRunes; // RunesDto
    }
}

module.exports = ChampionDetailedStatsDto;
