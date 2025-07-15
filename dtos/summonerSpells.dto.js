/**
 * Representa la información de los hechizos de invocador usados por el participante.
 */
class SummonerSpellsDto {
    constructor({ summoner1Id, summoner2Id, summoner1Casts, summoner2Casts }) {
        this.summoner1Id = summoner1Id;
        this.summoner2Id = summoner2Id;
        this.summoner1Casts = summoner1Casts;
        this.summoner2Casts = summoner2Casts;
    }
}

module.exports = SummonerSpellsDto;
