/**
 * Representa la información de un participante en una partida,
 * incluyendo estadísticas básicas, su AccountDto, sus hechizos de invocador y su build.
 */
class ParticipantDto {
    constructor({ championName, kills, deaths, assists, goldEarned, win, teamId, accountDto, summonerSpellsDto, buildDto, runesDto }) {
        this.championName = championName;
        this.kills = kills;
        this.deaths = deaths;
        this.assists = assists;
        this.goldEarned = goldEarned;
        this.win = win;
        this.teamId = teamId;
        this.accountDto = accountDto; // Instancia de AccountDto
        this.summonerSpellsDto = summonerSpellsDto; // Instancia de SummonerSpellsDto
        this.buildDto = buildDto; // Instancia de BuildDto
        this.runesDto = runesDto; // Instancia de RunesDto
    }
}

module.exports = ParticipantDto;
