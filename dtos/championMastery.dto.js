class ChampionMasteryDto {
    constructor({
        puuid,
        championPointsUntilNextLevel,
        chestGranted,
        championId,
        lastPlayTime,
        championLevel,
        championPoints,
        championPointsSinceLastLevel,
        markRequiredForNextLevel,
        championSeasonMilestone,
        nextSeasonMilestone,
        tokensEarned,
        milestoneGrades
    }) {
        this.puuid = puuid;
        this.championPointsUntilNextLevel = championPointsUntilNextLevel;
        this.chestGranted = chestGranted;
        this.championId = championId;
        this.lastPlayTime = lastPlayTime;
        this.championLevel = championLevel;
        this.championPoints = championPoints;
        this.championPointsSinceLastLevel = championPointsSinceLastLevel;
        this.markRequiredForNextLevel = markRequiredForNextLevel;
        this.championSeasonMilestone = championSeasonMilestone;
        this.nextSeasonMilestone = nextSeasonMilestone;
        this.tokensEarned = tokensEarned;
        this.milestoneGrades = milestoneGrades;
    }
}

module.exports = ChampionMasteryDto;
