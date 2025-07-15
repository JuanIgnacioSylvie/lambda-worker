class StatsDto {
    constructor({ summary, champions, roles }) {
        this.summary = summary; // SummaryStatsDto
        this.champions = champions; // Array of ChampionStatsDto
        this.roles = roles; // Array of RoleStatsDto
    }
}

module.exports = StatsDto;
