class SummaryStatsDto {
    constructor({ totalGames, wins, losses, winRate }) {
        this.totalGames = totalGames;
        this.wins = wins;
        this.losses = losses;
        this.winRate = winRate;
    }
}

module.exports = SummaryStatsDto;
