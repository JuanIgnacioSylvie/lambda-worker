// dtos/matchSummary.dto.js

const GameModeDto = require('./gameMode.dto');

/**
 * Representa el resumen de una partida, incluyendo:
 * - matchId
 * - gameMode (el modo de juego tal cual la API, por ejemplo "CLASSIC")
 * - queueId (para mapear a un GameModeDto más detallado)
 * - gameDuration
 * - participants: array de ParticipantDto
 * - gameModeDto: instancia de GameModeDto con información detallada (map, descripción, notas)
 */
class MatchSummaryDto {
    constructor({ matchId, gameMode, queueId, gameDuration, participants, gameModeDto }) {
        this.matchId = matchId;
        this.gameMode = gameMode;
        this.queueId = queueId;
        this.gameDuration = gameDuration;
        this.participants = participants;
        this.gameModeDto = gameModeDto; // Objeto con información adicional según el queueId
    }
}

module.exports = MatchSummaryDto;
