/**
 * Representa la información de la build (ítems y gasto) del participante.
 */
class BuildDto {
    constructor({ item0, item1, item2, item3, item4, item5, item6, itemsPurchased, goldSpent }) {
        this.item0 = item0;
        this.item1 = item1;
        this.item2 = item2;
        this.item3 = item3;
        this.item4 = item4;
        this.item5 = item5;
        this.item6 = item6;
        this.itemsPurchased = itemsPurchased;
        this.goldSpent = goldSpent;
    }
}

module.exports = BuildDto;
