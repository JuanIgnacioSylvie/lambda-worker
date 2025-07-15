class ChampionStatsDto {
    constructor({ championName, gamesPlayed, wins, winRate }) {
        this.championName = championName;
        this.gamesPlayed = gamesPlayed;
        this.wins = wins;
        this.winRate = winRate;
    }
}

module.exports = ChampionStatsDto;
