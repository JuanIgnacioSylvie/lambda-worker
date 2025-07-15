// dtos/gameMode.dto.js

/**
 * Representa la información detallada de un modo de juego,
 * mapeada a partir del queueId (map, description, notes, etc.)
 */
class GameModeDto {
    constructor({ queueId, map, description, notes }) {
        this.queueId = queueId;
        this.map = map;
        this.description = description;
        this.notes = notes;
    }
}

module.exports = GameModeDto;
