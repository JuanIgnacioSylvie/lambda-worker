class RoleStatsDto {
    constructor({ role, gamesPlayed, wins, winRate }) {
        this.role = role;
        this.gamesPlayed = gamesPlayed;
        this.wins = wins;
        this.winRate = winRate;
    }
}

module.exports = RoleStatsDto;
