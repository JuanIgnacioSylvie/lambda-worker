/**
 * Representa las runas seleccionadas por el participante.
 * Incluye los estilos de runas y las estadísticas de runas.
 */
class RunesDto {
    constructor({ statPerks, styles }) {
        this.statPerks = statPerks; // { defense, flex, offense }
        this.styles = styles;       // array con estilos primario y secundario
    }
}

module.exports = RunesDto;
