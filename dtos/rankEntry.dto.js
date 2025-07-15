class RankEntryDto {
    constructor({ tier, rank, leaguePoints, wins, losses }) {
        this.tier = tier;
        this.rank = rank;
        this.leaguePoints = leaguePoints;
        this.wins = wins;
        this.losses = losses;
    }
}

module.exports = RankEntryDto;
