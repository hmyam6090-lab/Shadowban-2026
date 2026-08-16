import {
  DEFAULT_DISCUSSION_SECONDS,
  DEFAULT_INFORMATION_AUDIT_SECONDS,
  DEFAULT_ROLE_ABILITY_SECONDS,
  DEFAULT_SHADOWBAN_SECONDS,
  DEFAULT_VOTING_SECONDS,
  GamePhase,
  InformationType,
  type GameState,
  type InformationCard,
  type PlayerGameState
} from '@shadowban/shared';

import { getAlgorithmById, getCrisisForRound, getEvidenceForCrisis, getRoleById } from '../services/contentService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible directory of this file
const serverDir = path.dirname(fileURLToPath(import.meta.url));

export class RoundManager {
  startRound(game: GameState): void {
    const crisis = getCrisisForRound(game.currentRound);
    const algorithm = getAlgorithmById(game.currentAlgorithmId);

    game.currentCrisisId = crisis.id;
    game.currentAlgorithmId = algorithm.id;
    game.phase = GamePhase.CRISIS_REVEAL;
    game.phaseEndsAt = undefined;
    game.publicEvidence = [];
    game.votes = game.votes || {};
    game.shadowbanVotes = game.shadowbanVotes || {};

    for (const playerState of Object.values(game.playerStates)) {
      playerState.vote = undefined;
      playerState.presentedCardIds = [];
      playerState.abilityUsed = false;
      playerState.privateInspectionResults = [];
      playerState.hand = [];
      playerState.phaseReady = false;
      // Apply any mutedNextRound as an active mute for this round
      if (playerState.mutedNextRound) {
        playerState.muted = true;
        playerState.mutedNextRound = false;
      } else {
        playerState.muted = false;
      }
    }
  }

  resetPhaseReady(game: GameState): void {
    for (const playerState of Object.values(game.playerStates)) {
      playerState.phaseReady = false;
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
    console.log(`[dealInformation] entry game=${game.gameId} currentPhase=${game.phase} currentCrisisId=${game.currentCrisisId}`);
    try {
      const crisis = game.currentCrisisId
        ? getCrisisForRound(game.currentRound)
        : undefined;
    const allEvidence = crisis ? getEvidenceForCrisis(crisis.id) : [];
    // Filter out cards that do not have a corresponding image asset in the client public folder
    // Asset path: apps/client/public/assets/cards/information/{card.id}.png
    const evidenceWithAssets: InformationCard[] = [];
    let withAssetCount = 0;
    let withoutAssetCount = 0;
    // Resolve candidate asset directories in case server process cwd differs
    const candidates = [
      // When running from repo root
      path.join(process.cwd(), 'apps', 'client', 'public', 'assets', 'cards', 'information'),
      // When running from apps/server folder (source)
      path.join(serverDir, '..', '..', '..', 'client', 'public', 'assets', 'cards', 'information'),
      // When running from apps/server/dist (compiled)
      path.join(serverDir, '..', '..', 'client', 'public', 'assets', 'cards', 'information')
    ];

    for (const card of allEvidence) {
      let found = false;
      for (const base of candidates) {
        try {
          const assetPath = path.join(base, `${card.id}.png`);
          if (fs.existsSync(assetPath)) {
            evidenceWithAssets.push(card);
            withAssetCount += 1;
            found = true;
            break;
          }
        } catch (err) {
          // ignore and try next candidate
        }
      }
      if (!found) {
        withoutAssetCount += 1;
      }
    }

    // Attach counts to game state for UI visibility
    game.assetCardCounts = { withAsset: withAssetCount, withoutAsset: withoutAssetCount };

    console.log(`[dealInformation] crisis=${crisis?.id || 'none'} withAsset=${withAssetCount} withoutAsset=${withoutAssetCount} players=${game.players.length}`);

    // If no assets found, fall back to using all evidence so dealing can proceed
    if (withAssetCount === 0 && allEvidence.length > 0) {
      console.warn(`[dealInformation] No client assets found for evidence; falling back to allEvidence for dealing.`);
      // use the original evidence set
      evidenceWithAssets.push(...allEvidence);
      // update counts to reflect fallback
      game.assetCardCounts = { withAsset: allEvidence.length, withoutAsset: 0 };
    }

    // If no cards with assets were found, fall back to using all available evidence
    if (evidenceWithAssets.length === 0 && allEvidence.length > 0) {
      console.warn(`[dealInformation] no evidence assets found; falling back to all evidence (${allEvidence.length}) to avoid blocking the round`);
      evidenceWithAssets.push(...allEvidence);
    }

    game.phase = GamePhase.DEAL_INFORMATION;
    game.phaseEndsAt = undefined;
    // Use only cards that have assets for dealing
    game.publicEvidence = evidenceWithAssets.slice(0, 1).map((card) => card.id);

    const cardsByPlayer = this.distributeHandsByAlgorithm(
      game,
      evidenceWithAssets,
      crisis
    );

    for (const [playerId, cards] of Object.entries(cardsByPlayer)) {
      const playerState = game.playerStates[playerId];

      if (playerState) {
        playerState.hand = cards.map((card) => card.id);
      }
    }
    } catch (err) {
      console.error(`[dealInformation] error for game=${game.gameId}:`, err);
      throw err;
    }
  }

  startAbilityPhase(game: GameState): void {
    game.phase = GamePhase.ABILITY;
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
      if (vote) {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      }
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
      game.societyWins += 1;
    } else {
      game.algorithmScore += 1;
      game.algorithmWins += 1;
    }

    // Check Analyst predictions for shadowban protection
    for (const playerState of Object.values(game.playerStates)) {
      if (playerState.analystPrediction === selectedResponseId) {
        playerState.protectedFromShadowban = true;
      }
      // Clear analyst prediction for next round
      playerState.analystPrediction = undefined;
    }
  }

  startShadowbanPhase(game: GameState): void {
    game.phase = GamePhase.SHADOWBAN;
    game.phaseEndsAt = Date.now() + DEFAULT_SHADOWBAN_SECONDS * 1000;
  }

  resolveShadowban(game: GameState): void {
    // Calculate who got shadowbanned based on votes
    const voteCounts: Record<string, number> = {};
    
    for (const vote of Object.values(game.shadowbanVotes || {})) {
      if (vote) {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      }
    }

    // Find the player with the most votes
    let maxVotes = 0;
    let shadowbannedPlayerId: string | null = null;
    
    for (const [playerId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        shadowbannedPlayerId = playerId;
      }
    }

    // Mark the player as shadowbanned
    let shadowbannedPlayerName: string | null = null;
    if (shadowbannedPlayerId) {
      const playerState = game.playerStates[shadowbannedPlayerId];
      const player = game.players.find(p => p.id === shadowbannedPlayerId);
      if (playerState && !playerState.protectedFromShadowban) {
        playerState.shadowbanned = true;
        shadowbannedPlayerName = player?.name || null;
      }
    }

    // Clear shadowban votes for next round
    game.shadowbanVotes = {};

    // Store shadowban result for broadcasting
    game.shadowbanResult = {
      shadowbannedPlayerId,
      shadowbannedPlayerName
    };

    // Go directly to next round instead of INFORMATION_AUDIT phase
    this.startNextRound(game);
  }

  startNextRound(game: GameState): void {
    const playerCount = game.players.length;
    const requiredWins = playerCount <= 6 ? 2 : 3; // 6-player: best of 3 (2 wins), 8-player: best of 5 (3 wins)

    // Check for best-of victory
    if (game.societyWins >= requiredWins || game.algorithmWins >= requiredWins) {
      game.phase = GamePhase.GAME_END;
      game.phaseEndsAt = undefined;
      return;
    }

    // Check for elimination victory (handled in GameManager, but we can also check here)
    let algorithmPlayersRemaining = 0;
    let societyPlayersRemaining = 0;

    for (const [playerId, playerState] of Object.entries(game.playerStates)) {
      if (!playerState.shadowbanned) {
        const role = getRoleById(playerState.roleId);
        if (role.faction === 'ALGORITHM') {
          algorithmPlayersRemaining++;
        } else {
          societyPlayersRemaining++;
        }
      }
    }

    if (algorithmPlayersRemaining === 0 || societyPlayersRemaining === 0) {
      game.phase = GamePhase.GAME_END;
      game.phaseEndsAt = undefined;
      return;
    }

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
