import {
  DEFAULT_DISCUSSION_SECONDS,
  DEFAULT_ROLE_ABILITY_SECONDS,
  DEFAULT_VOTING_SECONDS,
  GamePhase,
  InformationType,
  type GameState,
  type InformationCard,
  type PlayerGameState
} from '@shadowban/shared';

import { getAlgorithmById, getCrisisForRound, getEvidenceForCrisis } from '../services/contentService.js';

export class RoundManager {
  startRound(game: GameState): void {
    const crisis = getCrisisForRound(game.currentRound);
    const algorithm = getAlgorithmById(game.currentAlgorithmId);

    game.currentCrisisId = crisis.id;
    game.currentAlgorithmId = algorithm.id;
    game.phase = GamePhase.CRISIS_REVEAL;
    game.phaseEndsAt = undefined;
    game.publicEvidence = [];
    game.votes = {};

    for (const playerState of Object.values(game.playerStates)) {
      playerState.vote = undefined;
      playerState.presentedCardId = undefined;
      playerState.abilityUsed = false;
      playerState.privateInspectionResults = [];
      playerState.hand = [];
    }
  }

  revealCrisis(game: GameState): void {
    game.phase = GamePhase.CRISIS_REVEAL;
    game.phaseEndsAt = undefined;
  }

  prepareEvidence(game: GameState): void {
    game.phase = GamePhase.EVIDENCE_PREPARATION;
    game.phaseEndsAt = undefined;
  }

  dealInformation(game: GameState): void {
    const crisis = game.currentCrisisId
      ? getCrisisForRound(game.currentRound)
      : undefined;
    const allEvidence = crisis ? getEvidenceForCrisis(crisis.id) : [];

    game.phase = GamePhase.DEAL_INFORMATION;
    game.phaseEndsAt = undefined;
    game.publicEvidence = allEvidence.slice(0, 1).map((card) => card.id);

    const cardsByPlayer = this.distributeHandsByAlgorithm(
      game,
      allEvidence,
      crisis
    );

    for (const [playerId, cards] of Object.entries(cardsByPlayer)) {
      const playerState = game.playerStates[playerId];

      if (playerState) {
        playerState.hand = cards.map((card) => card.id);
      }
    }
  }

  startRolePhase(game: GameState): void {
    game.phase = GamePhase.ROLE_ABILITY;
    game.phaseEndsAt = Date.now() + DEFAULT_ROLE_ABILITY_SECONDS * 1000;
  }

  startDiscussion(game: GameState): void {
    game.phase = GamePhase.DISCUSSION;
    game.phaseEndsAt = Date.now() + DEFAULT_DISCUSSION_SECONDS * 1000;
  }

  startVoting(game: GameState): void {
    game.phase = GamePhase.VOTING;
    game.phaseEndsAt = Date.now() + DEFAULT_VOTING_SECONDS * 1000;
  }

  resolveRound(game: GameState): void {
    const crisis = game.currentCrisisId ? getCrisisForRound(game.currentRound) : undefined;

    game.phase = GamePhase.RESOLUTION;
    game.phaseEndsAt = undefined;

    if (!crisis) {
      return;
    }

    // Determine the selected response from votes
    const voteCounts: Record<string, number> = {};
    for (const vote of Object.values(game.votes)) {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    }

    let selectedResponseId: string | null = null;
    let maxVotes = 0;

    for (const [responseId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        selectedResponseId = responseId;
      }
    }

    // Score based on whether the selected response matches the correct response
    if (selectedResponseId === crisis.correctResponseId) {
      game.societyScore += 1;
    } else {
      game.algorithmScore += 1;
    }
  }

  startNextRound(game: GameState): void {
    if (game.currentRound >= game.totalRounds) {
      game.phase = GamePhase.GAME_END;
      game.phaseEndsAt = undefined;
      return;
    }

    game.currentRound += 1;
    this.startRound(game);
  }

  private distributeHandsByAlgorithm(game: GameState, allEvidence: InformationCard[], crisis?: any): Record<string, InformationCard[]> {
    const players = Object.keys(game.playerStates);
    const distribution: Record<string, InformationCard[]> = {};

    if (players.length === 0 || !crisis) {
      return distribution;
    }

    const algorithm = getAlgorithmById(game.currentAlgorithmId);
    const cardsPerPlayer = 4;

    // Group evidence by what response they support
    const evidenceByResponse: Record<string, InformationCard[]> = {
      [crisis.responses[0].id]: [],
      [crisis.responses[1].id]: [],
      [crisis.responses[2].id]: [],
      noise: []
    };

    for (const card of allEvidence) {
      if (card.type === InformationType.NOISE) {
        evidenceByResponse.noise?.push(card);
      } else if (card.supportsResponseId) {
        const targetArray = evidenceByResponse[card.supportsResponseId];
        if (targetArray) {
          targetArray.push(card);
        }
      }
    }

    // Shuffle each group
    for (const key of Object.keys(evidenceByResponse)) {
      const group = evidenceByResponse[key];
      if (group) {
        this.shuffleArray(group);
      }
    }

    // Distribute cards to each player based on algorithm weights
    for (const playerId of players) {
      const hand: InformationCard[] = [];
      const weights = algorithm.distribution;
      const totalWeight = weights.response1 + weights.response2 + weights.response3 + weights.noise;

      // Calculate how many cards of each type this player should get
      const response1Count = Math.round((weights.response1 / totalWeight) * cardsPerPlayer);
      const response2Count = Math.round((weights.response2 / totalWeight) * cardsPerPlayer);
      const response3Count = Math.round((weights.response3 / totalWeight) * cardsPerPlayer);
      const noiseCount = cardsPerPlayer - response1Count - response2Count - response3Count;

      // Add cards from each category
      const response1Cards = evidenceByResponse[crisis.responses[0].id] ?? [];
      const response2Cards = evidenceByResponse[crisis.responses[1].id] ?? [];
      const response3Cards = evidenceByResponse[crisis.responses[2].id] ?? [];
      const noiseCards = evidenceByResponse.noise ?? [];

      hand.push(...this.takeCards(response1Cards, response1Count));
      hand.push(...this.takeCards(response2Cards, response2Count));
      hand.push(...this.takeCards(response3Cards, response3Count));
      hand.push(...this.takeCards(noiseCards, noiseCount));

      // Shuffle the final hand
      this.shuffleArray(hand);
      distribution[playerId] = hand;
    }

    return distribution;
  }

  private takeCards(cards: InformationCard[], count: number): InformationCard[] {
    const taken = cards.splice(0, count);
    return taken;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i]!;
      array[i] = array[j]!;
      array[j] = temp;
    }
  }
}
