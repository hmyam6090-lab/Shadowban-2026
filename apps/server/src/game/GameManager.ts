import { DEFAULT_TOTAL_ROUNDS, AbilityTiming, AbilityType, Faction, GamePhase, InformationType, MAX_PLAYERS, MIN_PLAYERS, type GameState, type InformationCard, type Player, type PrivatePlayerState, type PublicGameState } from '@shadowban/shared';

import { getCrisisById, getEvidenceForCrisis, getRoleById, getAllRoles, getRandomRole } from '../services/contentService.js';
import { RoundManager } from './RoundManager.js';
import { generateGameCode } from '../utils/gameCode.js';

export class GameManager {
  private readonly games = new Map<string, GameState>();
  private readonly roundManager = new RoundManager();

  createGame(hostName?: string, totalRounds = DEFAULT_TOTAL_ROUNDS, avatar?: string): GameState {
    const gameId = crypto.randomUUID();

    const game: GameState = {
      gameId,
      gameCode: generateGameCode(),
      hostPlayerId: '',
      players: [],
      currentRound: 1,
      totalRounds,
      phase: GamePhase.LOBBY,
      societyScore: 0,
      algorithmScore: 0,
      publicEvidence: [],
      votes: {},
      playerStates: {},
      shadowbanVotes: {},
      societyWins: 0,
      algorithmWins: 0,
      publicAnnouncements: []
    };

    this.games.set(gameId, game);

    if (hostName) {
      const host = this.addPlayer(game, hostName, true, avatar);
      game.hostPlayerId = host.id;
    }

    return game;
  }

  joinGame(gameCode: string, playerName: string, avatar?: string): Player {
    const game = this.getGameByCode(gameCode);

    if (game.phase !== GamePhase.LOBBY) {
      throw new Error('Game already started.');
    }

    if (game.players.length >= MAX_PLAYERS) {
      throw new Error('Game is full.');
    }

    if (game.players.some((player) => player.name.toLowerCase() === playerName.toLowerCase())) {
      throw new Error('Player name must be unique.');
    }

    return this.addPlayer(game, playerName, false, avatar);
  }

  startGame(gameId: string): void {
    const game = this.getGame(gameId);

    const connectedPlayers = game.players.filter((player) => player.connected).length;

    if (connectedPlayers < MIN_PLAYERS || connectedPlayers > MAX_PLAYERS) {
      throw new Error('At least 2 connected players are required.');
    }

    // Assign balanced roles to all players
    const allRoles = getAllRoles();
    const algorithmRoles = allRoles.filter(role => role.faction === 'ALGORITHM');
    const societyRoles = allRoles.filter(role => role.faction === 'SOCIETY');

    // Calculate balanced distribution: at least 1 Algorithm, rest Society
    // Society should always outnumber Algorithm
    const playerCount = game.players.length;
    const algorithmCount = Math.max(1, Math.floor(playerCount / 3)); // ~1/3 Algorithm, ~2/3 Society
    const societyCount = playerCount - algorithmCount;

    // Shuffle both role pools
    const shuffledAlgorithmRoles = [...algorithmRoles].sort(() => Math.random() - 0.5);
    const shuffledSocietyRoles = [...societyRoles].sort(() => Math.random() - 0.5);

    // Create the role assignment pool
    const rolePool: string[] = [];
    
    // Add Algorithm roles (with replacement if needed)
    for (let i = 0; i < algorithmCount; i++) {
      const roleIndex = i % shuffledAlgorithmRoles.length;
      const role = shuffledAlgorithmRoles[roleIndex];
      if (role) {
        rolePool.push(role.id);
      }
    }
    
    // Add Society roles (with replacement if needed)
    for (let i = 0; i < societyCount; i++) {
      const roleIndex = i % shuffledSocietyRoles.length;
      const role = shuffledSocietyRoles[roleIndex];
      if (role) {
        rolePool.push(role.id);
      }
    }

    // Shuffle the final pool
    const shuffledPool = rolePool.sort(() => Math.random() - 0.5);

    // Assign roles to players
    game.players.forEach((player, index) => {
      const playerState = game.playerStates[player.id];
      if (playerState && shuffledPool[index]) {
        playerState.roleId = shuffledPool[index];
      }
    });

    game.currentRound = 1;
    game.algorithmScore = 0;
    game.societyScore = 0;
    game.societyWins = 0;
    game.algorithmWins = 0;
    this.roundManager.startRound(game);
  }

  advancePhase(gameId: string): void {
    const game = this.getGame(gameId);
    console.log(`[advancePhase] game=${gameId} currentPhase=${game.phase}`);

    try {
      switch (game.phase) {
      case GamePhase.CRISIS_REVEAL:
        this.roundManager.prepareEvidence(game);
        break;
      case GamePhase.EVIDENCE_PREPARATION:
        this.roundManager.dealInformation(game);
        break;
      case GamePhase.DEAL_INFORMATION:
        this.roundManager.startDiscussion(game);
        break;
      case GamePhase.DISCUSSION:
        this.roundManager.startVoting(game);
        break;
      case GamePhase.VOTING:
        this.roundManager.resolveRound(game);
        break;
      case GamePhase.RESOLUTION:
        this.roundManager.startShadowbanPhase(game);
        break;
      case GamePhase.SHADOWBAN:
        this.roundManager.resolveShadowban(game);
        break;
      default:
        break;
      }

      console.log(`[advancePhase] game=${gameId} endedPhase=${game.phase}`);

      // Reset phase ready status when phase changes
      this.roundManager.resetPhaseReady(game);
    } catch (err) {
      console.error(`[advancePhase] error for game=${gameId}:`, err);
      throw err;
    }
  }

  submitVote(gameId: string, playerId: string, responseId: string): void {
    const game = this.getGame(gameId);

    if (game.phase !== GamePhase.VOTING) {
      throw new Error('Voting is not active.');
    }

    const playerState = game.playerStates[playerId];

    if (!playerState) {
      throw new Error('Player not found.');
    }

    playerState.vote = responseId;
    game.votes[playerId] = responseId;
  }

  getVotingResults(gameId: string): Array<{ responseId: string; votes: number }> {
    const game = this.getGame(gameId);
    const results: Record<string, number> = {};

    for (const vote of Object.values(game.votes)) {
      results[vote] = (results[vote] || 0) + 1;
    }

    return Object.entries(results).map(([responseId, votes]) => ({
      responseId,
      votes
    }));
  }

  getSelectedResponse(gameId: string): string | null {
    const game = this.getGame(gameId);
    const results = this.getVotingResults(gameId);

    if (results.length === 0) {
      return null;
    }

    // Find the response with the most votes
    const sorted = results.sort((a, b) => b.votes - a.votes);
    return sorted[0]?.responseId ?? null;
  }

  presentEvidence(gameId: string, playerId: string, cardId: string): void {
    const game = this.getGame(gameId);
    const playerState = game.playerStates[playerId];

    if (!playerState) {
      throw new Error('Player not found.');
    }

    if (playerState.shadowbanned) {
      throw new Error('Shadowbanned players cannot present evidence.');
    }

    // Check if the player has this card in their hand
    if (!playerState.hand.includes(cardId)) {
      throw new Error('Player does not have this card.');
    }

    // Check if player has already presented 2 cards
    if (playerState.presentedCardIds.length >= 2) {
      throw new Error('You can only present up to 2 cards per discussion.');
    }

    // Add to presented cards
    if (!playerState.presentedCardIds.includes(cardId)) {
      playerState.presentedCardIds.push(cardId);
    }

    // Add to public evidence if not already there
    if (!game.publicEvidence.includes(cardId)) {
      game.publicEvidence.push(cardId);
    }
  }

  getRoundAudit(gameId: string): {
    availableEvidence: InformationCard[];
    playerFeedSummaries: Array<{
      playerId: string;
      playerName: string;
      cardsSeen: number;
      supportingCorrect: number;
      supportingIncorrect: number;
      noiseSeen: number;
    }>;
  } {
    const game = this.getGame(gameId);
    const crisis = game.currentCrisisId ? getCrisisById(game.currentCrisisId) : undefined;

    if (!crisis) {
      return {
        availableEvidence: [],
        playerFeedSummaries: []
      };
    }

    const allEvidence = getEvidenceForCrisis(crisis.id);

    const playerFeedSummaries = Object.entries(game.playerStates).map(([playerId, playerState]) => {
      const player = game.players.find((p) => p.id === playerId);
      const hand = playerState.hand;

      let supportingCorrect = 0;
      let supportingIncorrect = 0;
      let noiseSeen = 0;

      for (const cardId of hand) {
        const card = allEvidence.find((c) => c.id === cardId);
        if (card) {
          if (card.type === InformationType.NOISE) {
            noiseSeen++;
          } else if (card.supportsResponseId === crisis.correctResponseId) {
            supportingCorrect++;
          } else {
            supportingIncorrect++;
          }
        }
      }

      return {
        playerId,
        playerName: player?.name ?? 'Unknown',
        cardsSeen: hand.length,
        supportingCorrect,
        supportingIncorrect,
        noiseSeen
      };
    });

    return {
      availableEvidence: allEvidence,
      playerFeedSummaries
    };
  }

  activateRoleAbility(gameId: string, playerId: string, targetPlayerId?: string, targetCardId?: string, additionalTargetId?: string, responseId?: string): void {
    const game = this.getGame(gameId);
    const playerState = game.playerStates[playerId];

    if (!playerState) {
      throw new Error('Player not found.');
    }

    if (playerState.shadowbanned) {
      throw new Error('Shadowbanned players cannot use abilities.');
    }

    const role = getRoleById(playerState.roleId);

    // Check ability timing - abilities can now be used anytime
    if (role.abilityTiming === AbilityTiming.ANYTIME_BEFORE_DISCUSSION && game.phase !== GamePhase.DEAL_INFORMATION) {
      throw new Error('This ability can only be used before discussion begins.');
    }

    // Check ability usage limits
    if (role.abilityType === AbilityType.ONCE_PER_ROUND && playerState.abilityUsed) {
      throw new Error('Ability already used this round.');
    }
    if (role.abilityType === AbilityType.ONCE_PER_GAME && playerState.abilityUsed) {
      throw new Error('Ability already used this game.');
    }

    // Official: Eyes On You
    if (role.id === 'official') {
      if (!targetPlayerId) {
        throw new Error('Target player required for Official ability.');
      }

      const targetState = game.playerStates[targetPlayerId];
      if (!targetState) {
        throw new Error('Target player not found.');
      }

      if (targetState.hand.length === 0) {
        throw new Error('Target player has no cards to inspect.');
      }

      const randomCardIndex = Math.floor(Math.random() * targetState.hand.length);
      const inspectedCardId = targetState.hand[randomCardIndex];

      if (!inspectedCardId) {
        throw new Error('Failed to select a card for inspection.');
      }

      playerState.privateInspectionResults.push(inspectedCardId);
      playerState.abilityUsed = true;
    }
    // Journalist: On Record
    else if (role.id === 'journalist') {
      if (!targetPlayerId) {
        throw new Error('Target player required for Journalist ability.');
      }

      const targetState = game.playerStates[targetPlayerId];
      if (!targetState) {
        throw new Error('Target player not found.');
      }

      const targetPlayer = game.players.find(p => p.id === targetPlayerId);
      const journalistPlayer = game.players.find(p => p.id === playerId);

      // Add public announcement for all players
      game.publicAnnouncements.push({
        id: crypto.randomUUID(),
        type: 'journalist_claim',
        message: `📰 JOURNALIST ${journalistPlayer?.name || 'Unknown'} has asked ${targetPlayer?.name || 'Unknown'} to answer a question truthfully about their hand.`,
        timestamp: Date.now(),
        playerId: playerId
      });

      // Store the public claim - this will be broadcast to all players
      // The target player's response is stored in a special field
      playerState.privateInspectionResults.push(`JOURNALIST_CLAIM:${targetPlayerId}:${responseId || 'NO_RESPONSE'}`);
      playerState.abilityUsed = true;
    }
    // Analyst: Final Call
    else if (role.id === 'analyst') {
      if (!responseId) {
        throw new Error('Response ID required for Analyst ability.');
      }

      playerState.analystPrediction = responseId;
      playerState.vote = responseId; // Lock the vote
      playerState.abilityUsed = true;
    }
    // Investigator: Crosscheck
    else if (role.id === 'investigator') {
      if (!targetPlayerId || !additionalTargetId) {
        throw new Error('Two target players required for Investigator ability.');
      }

      const targetState1 = game.playerStates[targetPlayerId];
      const targetState2 = game.playerStates[additionalTargetId];

      if (!targetState1 || !targetState2) {
        throw new Error('One or both target players not found.');
      }

      const targetPlayer1 = game.players.find(p => p.id === targetPlayerId);
      const targetPlayer2 = game.players.find(p => p.id === additionalTargetId);
      const investigatorPlayer = game.players.find(p => p.id === playerId);

      const role1 = getRoleById(targetState1.roleId);
      const role2 = getRoleById(targetState2.roleId);

      const sameSide = role1.faction === role2.faction;

      // Add public announcement
      game.publicAnnouncements.push({
        id: crypto.randomUUID(),
        type: 'ability_used',
        message: `🔍 INVESTIGATOR ${investigatorPlayer?.name || 'Unknown'} has crosschecked ${targetPlayer1?.name || 'Unknown'} and ${targetPlayer2?.name || 'Unknown'}. They now know if these players are on the same side.`,
        timestamp: Date.now(),
        playerId: playerId
      });

      playerState.privateInspectionResults.push(`CROSSCHECK:${targetPlayerId}:${additionalTargetId}:${sameSide ? 'SAME_SIDE' : 'DIFFERENT_SIDES'}`);
      playerState.abilityUsed = true;
    }
    // Echo Chamber: Closed Circuit
    else if (role.id === 'echo_chamber') {
      if (!targetPlayerId) {
        throw new Error('Target player required for Echo Chamber ability.');
      }

      const targetPlayer = game.players.find(p => p.id === targetPlayerId);
      const echoPlayer = game.players.find(p => p.id === playerId);

      // Add public announcement
      game.publicAnnouncements.push({
        id: crypto.randomUUID(),
        type: 'ability_used',
        message: `🔇 ECHO CHAMBER: ${echoPlayer?.name || 'Unknown'} has created a private channel with ${targetPlayer?.name || 'Unknown'}. Only they may speak for 30 seconds.`,
        timestamp: Date.now(),
        playerId: playerId
      });

      // This ability requires UI state management for communication restrictions
      // For now, we'll store the restriction in player state
      playerState.privateInspectionResults.push(`CLOSED_CIRCUIT:${targetPlayerId}`);
      playerState.abilityUsed = true;
    }
    // Hacker: Account Breach
    else if (role.id === 'hacker') {
      if (!targetPlayerId) {
        throw new Error('Target player required for Hacker ability.');
      }

      const targetState = game.playerStates[targetPlayerId];
      if (!targetState) {
        throw new Error('Target player not found.');
      }

      const targetPlayer = game.players.find(p => p.id === targetPlayerId);
      const hackerPlayer = game.players.find(p => p.id === playerId);

      const targetRole = getRoleById(targetState.roleId);
      const randomCardIndex = targetState.hand.length > 0 ? Math.floor(Math.random() * targetState.hand.length) : -1;
      const randomCardId = randomCardIndex >= 0 ? targetState.hand[randomCardIndex] : 'NO_CARD';
      const analystPrediction = targetState.analystPrediction || 'NO_PREDICTION';

      // Add public announcement
      game.publicAnnouncements.push({
        id: crypto.randomUUID(),
        type: 'ability_used',
        message: `💻 HACKER ${hackerPlayer?.name || 'Unknown'} has breached ${targetPlayer?.name || 'Unknown'}'s account. They now know their role and private information.`,
        timestamp: Date.now(),
        playerId: playerId
      });

      playerState.privateInspectionResults.push(`ACCOUNT_BREACH:${targetPlayerId}:${targetRole.id}:${randomCardId}:${analystPrediction}`);
      targetState.accountBreached = true;
      playerState.abilityUsed = true;
    }
    // Algorithm: For You
    else if (role.id === 'algorithm') {
      if (!targetPlayerId) {
        throw new Error('Target player required for Algorithm ability.');
      }

      const targetState = game.playerStates[targetPlayerId];
      if (!targetState) {
        throw new Error('Target player not found.');
      }

      const targetPlayer = game.players.find(p => p.id === targetPlayerId);
      const algorithmPlayer = game.players.find(p => p.id === playerId);

      // Give the target an extra card from the crisis evidence
      const crisis = game.currentCrisisId ? getCrisisById(game.currentCrisisId) : undefined;
      if (!crisis) {
        throw new Error('No crisis active.');
      }

      const allEvidence = getEvidenceForCrisis(crisis.id);
      const availableCards = allEvidence.filter(card => !targetState.hand.includes(card.id));
      
      if (availableCards.length === 0) {
        throw new Error('No additional cards available to give.');
      }

      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      if (!randomCard) {
        throw new Error('Failed to select a random card.');
      }

      // Add public announcement
      game.publicAnnouncements.push({
        id: crypto.randomUUID(),
        type: 'ability_used',
        message: `🤖 ALGORITHM ${algorithmPlayer?.name || 'Unknown'} has fed ${targetPlayer?.name || 'Unknown'} an additional information card.`,
        timestamp: Date.now(),
        playerId: playerId
      });

      targetState.hand.push(randomCard.id);
      // Mark delivered card as locked so client can disable presenting it
      targetState.lockedCardIds = targetState.lockedCardIds || [];
      targetState.lockedCardIds.push(randomCard.id);
      playerState.abilityUsed = true;
    }
    else {
      throw new Error('Role ability not implemented yet.');
    }
  }

  setPlayerReady(gameId: string, playerId: string, ready: boolean): void {
    const game = this.getGame(gameId);
    const player = this.getPlayer(game, playerId);
    player.ready = ready;
  }

  setPlayerPhaseReady(gameId: string, playerId: string, ready: boolean): void {
    const game = this.getGame(gameId);
    const playerState = game.playerStates[playerId];
    if (!playerState) {
      throw new Error('Player state not found.');
    }
    playerState.phaseReady = ready;

    // Check if all connected players are ready
    const connectedPlayers = game.players.filter(p => p.connected);
    const allReady = connectedPlayers.every(p => game.playerStates[p.id]?.phaseReady);

    // If all ready, advance phase
    if (allReady && connectedPlayers.length > 0) {
      this.advancePhase(gameId);
    }
  }

  attachPlayerSocket(gameId: string, playerId: string, socketId: string): void {
    const game = this.getGame(gameId);
    const player = this.getPlayer(game, playerId);
    player.socketId = socketId;
    player.connected = true;
  }

  disconnectPlayer(gameId: string, playerId: string): void {
    const game = this.getGame(gameId);
    const player = this.getPlayer(game, playerId);
    player.connected = false;
  }

  removePlayer(gameId: string, playerId: string): void {
    const game = this.getGame(gameId);
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      throw new Error('Player not found.');
    }

    game.players.splice(playerIndex, 1);
    delete game.playerStates[playerId];

    // If host leaves, assign new host
    if (game.hostPlayerId === playerId && game.players.length > 0) {
      const newHost = game.players[0];
      if (newHost) {
        game.hostPlayerId = newHost.id;
      }
    }
  }

  getGameByCode(gameCode: string): GameState {
    return this.getGameByCodeInternal(gameCode);
  }

  getGameOrThrow(gameId: string): GameState {
    return this.getGame(gameId);
  }

  getPublicState(gameId: string): PublicGameState {
    const game = this.getGame(gameId);

    return {
      gameId: game.gameId,
      gameCode: game.gameCode,
      hostPlayerId: game.hostPlayerId,
      players: game.players.map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        connected: player.connected,
        ready: player.ready
      })),
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      phase: game.phase,
      currentCrisisId: game.currentCrisisId,
      societyScore: game.societyScore,
      algorithmScore: game.algorithmScore,
      phaseEndsAt: game.phaseEndsAt,
      publicEvidence: [],
      societyWins: game.societyWins,
      algorithmWins: game.algorithmWins,
      publicAnnouncements: [...game.publicAnnouncements]
      ,
      assetCardCounts: game.assetCardCounts ? { ...game.assetCardCounts } : undefined
    };
  }

  getPrivateState(gameId: string, playerId: string): PrivatePlayerState {
    const game = this.getGame(gameId);
    const player = game.players.find((entry) => entry.id === playerId);

    if (!player) {
      throw new Error('Player not found.');
    }

    const playerState = game.playerStates[playerId];

    if (!playerState) {
      throw new Error('Player state not found.');
    }

    // Fetch actual card data from content service
    const allEvidence = game.currentCrisisId ? getEvidenceForCrisis(game.currentCrisisId) : [];
    const cardMap = new Map(allEvidence.map((card) => [card.id, card]));

    const hand: InformationCard[] = playerState.hand.map((cardId) => {
      const card = cardMap.get(cardId);
      if (card) {
        return card;
      }
      // Fallback for placeholder cards
      return {
        id: cardId,
        crisisId: game.currentCrisisId ?? 'placeholder',
        type: InformationType.NOISE,
        title: 'Placeholder Card',
        text: 'Information will appear in Phase 5.'
      };
    });

    return {
      gameId: game.gameId,
      gameCode: game.gameCode,
      playerId: player.id,
      playerName: player.name,
      role: {
        ...this.getRoleOrPlaceholder(playerState.roleId)
      },
      faction: this.getRoleOrPlaceholder(playerState.roleId).faction,
      hand,
      abilityUsed: playerState.abilityUsed,
      privateInspectionResults: [...playerState.privateInspectionResults],
      presentedCardIds: [...playerState.presentedCardIds],
      vote: playerState.vote,
      shadowbanned: playerState.shadowbanned,
      analystPrediction: playerState.analystPrediction,
      protectedFromShadowban: playerState.protectedFromShadowban,
      mutedNextRound: playerState.mutedNextRound,
      accountBreached: playerState.accountBreached,
      lockedCardIds: [...(playerState.lockedCardIds || [])],
      muted: playerState.muted,
      phaseReady: playerState.phaseReady
    };
  }

  private getGame(gameId: string): GameState {
    const game = this.games.get(gameId);

    if (!game) {
      throw new Error('Game not found.');
    }

    return game;
  }

  private getGameByCodeInternal(gameCode: string): GameState {
    const game = [...this.games.values()].find((entry) => entry.gameCode === gameCode);

    if (!game) {
      throw new Error('Game not found.');
    }

    return game;
  }

  private addPlayer(game: GameState, playerName: string, isHost: boolean, avatar?: string): Player {
    const playerId = crypto.randomUUID();

    const player: Player = {
      id: playerId,
      name: playerName,
      socketId: '',
      isHost,
      connected: true,
      ready: false,
      avatar
    };

    game.players.push(player);

    if (!game.hostPlayerId || isHost) {
      game.hostPlayerId = player.id;
    }

    // All players start with no role - roles assigned randomly when game starts
    game.playerStates[player.id] = {
      roleId: '',
      hand: [],
      presentedCardIds: [],
      abilityUsed: false,
      privateInspectionResults: [],
      shadowbanned: false,
      analystPrediction: undefined,
      protectedFromShadowban: false,
      mutedNextRound: false,
      accountBreached: false,
      lockedCardIds: [],
      phaseReady: false
    };

    return player;
  }

  private getPlayer(game: GameState, playerId: string): Player {
    const player = game.players.find((entry) => entry.id === playerId);

    if (!player) {
      throw new Error('Player not found.');
    }

    return player;
  }

  submitShadowbanVote(gameId: string, playerId: string, targetPlayerId: string): void {
    const game = this.getGame(gameId);
    const player = this.getPlayer(game, playerId);
    const playerState = game.playerStates[playerId];

    if (!playerState) {
      throw new Error('Player state not found.');
    }

    if (game.phase !== GamePhase.SHADOWBAN) {
      throw new Error('Shadowban voting is not active.');
    }

    if (playerState.shadowbanned) {
      throw new Error('Shadowbanned players cannot vote.');
    }

    if (playerId === targetPlayerId) {
      throw new Error('You cannot vote to shadowban yourself.');
    }

    game.shadowbanVotes[playerId] = targetPlayerId;
  }

  resolveShadowban(gameId: string): { shadowbannedPlayerId: string | null; influencerMutedPlayerId: string | null } {
    const game = this.getGame(gameId);
    const voteCounts: Record<string, number> = {};

    // Count votes
    for (const [voterId, targetId] of Object.entries(game.shadowbanVotes)) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    // Find the player with the most votes
    let maxVotes = 0;
    let shadowbannedPlayerId: string | null = null;

    for (const [targetId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        shadowbannedPlayerId = targetId;
      }
    }

    let influencerMutedPlayerId: string | null = null;

    if (shadowbannedPlayerId) {
      const targetState = game.playerStates[shadowbannedPlayerId];
      if (!targetState) {
        throw new Error('Target player state not found.');
      }
      
      const targetRole = getRoleById(targetState.roleId);

      // Check if player is protected from shadowban
      if (targetState.protectedFromShadowban) {
        targetState.protectedFromShadowban = false;
        shadowbannedPlayerId = null;
      } else {
        targetState.shadowbanned = true;

        // Add public announcement about shadowban so clients can show overlays
        game.publicAnnouncements.push({
          id: crypto.randomUUID(),
          type: 'shadowban',
          message: `${game.players.find(p => p.id === shadowbannedPlayerId)?.name || 'A player'} was shadowbanned.`,
          timestamp: Date.now(),
          playerId: shadowbannedPlayerId
        });

        // Check if the shadowbanned player is an Influencer
        if (targetRole.id === 'influencer') {
          // Influencer can mute another player - this requires UI interaction
          // For now, we'll store that the influencer was shadowbanned
          // The actual mute selection will be handled via a separate method
        }
      }
    }

    // Clear shadowban votes for next round
    game.shadowbanVotes = {};

    return { shadowbannedPlayerId, influencerMutedPlayerId };
  }

  setInfluencerMuteTarget(gameId: string, influencerPlayerId: string, targetPlayerId: string): void {
    const game = this.getGame(gameId);
    const targetState = game.playerStates[targetPlayerId];

    if (!targetState) {
      throw new Error('Target player not found.');
    }

    targetState.mutedNextRound = true;
    // Add a public announcement so clients display an overlay
    game.publicAnnouncements.push({
      id: crypto.randomUUID(),
      type: 'ability_used',
      message: `${game.players.find(p => p.id === targetPlayerId)?.name || 'Player'} will be muted next round.`,
      timestamp: Date.now(),
      playerId: targetPlayerId
    });
  }

  checkEliminationVictory(gameId: string): { societyWins: boolean; algorithmWins: boolean } {
    const game = this.getGame(gameId);
    let algorithmPlayersRemaining = 0;
    let societyPlayersRemaining = 0;

    for (const [playerId, playerState] of Object.entries(game.playerStates)) {
      if (!playerState.shadowbanned) {
        const role = getRoleById(playerState.roleId);
        if (role.faction === Faction.ALGORITHM) {
          algorithmPlayersRemaining++;
        } else {
          societyPlayersRemaining++;
        }
      }
    }

    return {
      societyWins: algorithmPlayersRemaining === 0,
      algorithmWins: societyPlayersRemaining === 0
    };
  }

  private getRoleOrPlaceholder(roleId: string) {
    if (!roleId) {
      return {
        id: 'unassigned',
        name: 'Unassigned',
        faction: Faction.SOCIETY,
        description: 'Phase 3 placeholder role.'
      };
    }

    try {
      return getRoleById(roleId);
    } catch {
      return {
        id: roleId,
        name: 'Unassigned',
        faction: Faction.SOCIETY,
        description: 'Phase 3 placeholder role.'
      };
    }
  }
}