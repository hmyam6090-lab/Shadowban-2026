import { Faction, type GameState } from '@shadowban/shared';

export class ScoreManager {
  awardSocietyPoint(game: GameState): void {
    game.societyScore += 1;
  }

  awardAlgorithmPoint(game: GameState): void {
    game.algorithmScore += 1;
  }

  getWinner(game: GameState): Faction | null {
    if (game.societyScore > game.algorithmScore) {
      return Faction.SOCIETY;
    }

    if (game.algorithmScore > game.societyScore) {
      return Faction.ALGORITHM;
    }

    return null;
  }
}