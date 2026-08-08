import { Faction } from '@shadowban/shared';
export class ScoreManager {
    awardSocietyPoint(game) {
        game.societyScore += 1;
    }
    awardAlgorithmPoint(game) {
        game.algorithmScore += 1;
    }
    getWinner(game) {
        if (game.societyScore > game.algorithmScore) {
            return Faction.SOCIETY;
        }
        if (game.algorithmScore > game.societyScore) {
            return Faction.ALGORITHM;
        }
        return null;
    }
}
