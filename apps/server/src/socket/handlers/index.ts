import type { Server } from 'socket.io';

import { GamePhase, type ClientToServerEvents, type InterServerEvents, type ServerToClientEvents, type SocketData } from '@shadowban/shared';

import { getCrisisById, getEvidenceForCrisis } from '../../services/contentService.js';
import { gameManager } from '../../services/gameService.js';

function broadcastGameState(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, gameId: string): void {
  const game = gameManager.getGameOrThrow(gameId);

  io.to(gameId).emit('game:state', gameManager.getPublicState(gameId));

  if (!game.hostPlayerId) {
    return;
  }

  for (const player of game.players) {
    io.to(player.socketId).emit('player:private-state', gameManager.getPrivateState(gameId, player.id));
  }

  if (game.currentCrisisId && [GamePhase.CRISIS_REVEAL, GamePhase.EVIDENCE_PREPARATION, GamePhase.DEAL_INFORMATION, GamePhase.DISCUSSION, GamePhase.VOTING, GamePhase.RESOLUTION, GamePhase.SHADOWBAN, GamePhase.INFORMATION_AUDIT, GamePhase.GAME_END].includes(game.phase)) {
    io.to(gameId).emit('crisis:revealed', {
      crisis: getCrisisById(game.currentCrisisId)
    });
  }

  if (game.phase === GamePhase.DISCUSSION && typeof game.phaseEndsAt === 'number') {
    io.to(gameId).emit('discussion:started', { endsAt: game.phaseEndsAt });
  }

  if (game.phase === GamePhase.VOTING && typeof game.phaseEndsAt === 'number') {
    io.to(gameId).emit('voting:started', { endsAt: game.phaseEndsAt });
  }

  if (game.phase === GamePhase.RESOLUTION && game.currentCrisisId) {
    const crisis = getCrisisById(game.currentCrisisId);
    const selectedResponseId = gameManager.getSelectedResponse(gameId);
    const votingResults = gameManager.getVotingResults(gameId);
    const audit = gameManager.getRoundAudit(gameId);

    io.to(gameId).emit('voting:revealed', {
      results: votingResults,
      selectedResponseId: selectedResponseId ?? crisis.correctResponseId
    });

    io.to(gameId).emit('round:resolved', {
      correctResponseId: crisis.correctResponseId,
      selectedResponseId: selectedResponseId ?? crisis.correctResponseId,
      societyScore: game.societyScore,
      algorithmScore: game.algorithmScore,
      societyWins: game.societyWins,
      algorithmWins: game.algorithmWins
    });

    io.to(gameId).emit('round:audit', {
      availableEvidence: audit.availableEvidence.map((card) => ({
        id: card.id,
        crisisId: card.crisisId,
        type: card.type,
        title: card.title,
        text: card.text
      })),
      playerFeedSummary: audit.playerFeedSummaries
    });
  }

  if (game.phase === GamePhase.SHADOWBAN && typeof game.phaseEndsAt === 'number') {
    io.to(gameId).emit('shadowban:started', { endsAt: game.phaseEndsAt });
  }

  if (game.phase === GamePhase.INFORMATION_AUDIT && typeof game.phaseEndsAt === 'number') {
    const audit = gameManager.getRoundAudit(gameId);
    io.to(gameId).emit('round:audit', {
      availableEvidence: audit.availableEvidence.map((card) => ({
        id: card.id,
        crisisId: card.crisisId,
        type: card.type,
        title: card.title,
        text: card.text
      })),
      playerFeedSummary: audit.playerFeedSummaries
    });
  }

  if (game.phase === GamePhase.GAME_END) {
    const eliminationVictory = gameManager.checkEliminationVictory(gameId);
    const winner = eliminationVictory.societyWins ? 'SOCIETY' : eliminationVictory.algorithmWins ? 'ALGORITHM' : (game.societyWins > game.algorithmWins ? 'SOCIETY' : 'ALGORITHM');
    io.to(gameId).emit('game:ended', {
      winner,
      societyScore: game.societyScore,
      algorithmScore: game.algorithmScore,
      societyWins: game.societyWins,
      algorithmWins: game.algorithmWins,
      eliminationVictory: eliminationVictory.societyWins || eliminationVictory.algorithmWins
    });
  }
}

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
  io.on('connection', (socket) => {
    socket.on('game:join', ({ gameCode, playerId }) => {
      try {
        const game = gameManager.getGameByCode(gameCode);
        const player = game.players.find((entry) => entry.id === playerId);

        if (!player) {
          return;
        }

        socket.data.gameId = game.gameId;
        socket.data.playerId = player.id;
        socket.join(game.gameId);
        gameManager.attachPlayerSocket(game.gameId, player.id, socket.id);

        broadcastGameState(io, game.gameId);
      } catch {
        return;
      }
    });

    socket.on('game:ready', () => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        const game = gameManager.getGameOrThrow(gameId);
        const player = game.players.find((entry) => entry.id === playerId);

        if (!player) {
          return;
        }

        gameManager.setPlayerReady(gameId, playerId, !player.ready);
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('game:start', () => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        const game = gameManager.getGameOrThrow(gameId);

        if (game.hostPlayerId !== playerId) {
          return;
        }

        gameManager.startGame(gameId);
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('host:advance', () => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        const game = gameManager.getGameOrThrow(gameId);

        if (game.hostPlayerId !== playerId) {
          return;
        }

        gameManager.advancePhase(gameId);
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('vote:submit', ({ responseId }) => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        gameManager.submitVote(gameId, playerId, responseId);

        // Send voting updated event to the player
        socket.emit('voting:updated', { hasVoted: true });

        // Broadcast updated game state
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('evidence:present', ({ cardId }) => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        const game = gameManager.getGameOrThrow(gameId);

        // Only allow evidence presentation during discussion or voting
        if (game.phase !== GamePhase.DISCUSSION && game.phase !== GamePhase.VOTING) {
          return;
        }

        gameManager.presentEvidence(gameId, playerId, cardId);

        // Get the card data to broadcast
        const allEvidence = game.currentCrisisId ? getEvidenceForCrisis(game.currentCrisisId) : [];
        const card = allEvidence.find((c) => c.id === cardId);

        if (card) {
          // Broadcast the presented evidence to all players
          io.to(gameId).emit('evidence:presented', {
            playerId,
            card: {
              id: card.id,
              crisisId: card.crisisId,
              title: card.title,
              text: card.text,
              type: card.type
            }
          });
        }

        // Broadcast updated game state
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('role:activate', ({ targetPlayerId, targetCardId, additionalTargetId, responseId }) => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        gameManager.activateRoleAbility(gameId, playerId, targetPlayerId, targetCardId, additionalTargetId, responseId);

        // Broadcast updated game state
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('shadowban:vote', ({ targetPlayerId }) => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        gameManager.submitShadowbanVote(gameId, playerId, targetPlayerId);

        // Broadcast updated game state
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('influencer:mute', ({ targetPlayerId }) => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        gameManager.setInfluencerMuteTarget(gameId, playerId, targetPlayerId);

        // Broadcast updated game state
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('chat:send', ({ message }) => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        const game = gameManager.getGameOrThrow(gameId);
        const player = game.players.find((entry) => entry.id === playerId);

        if (!player) {
          return;
        }

        const playerState = game.playerStates[playerId];
        
        // Check if player is shadowbanned
        if (playerState?.shadowbanned) {
          return;
        }

        // Broadcast chat message to all players in the game
        io.to(gameId).emit('chat:message', {
          playerId: player.id,
          playerName: player.name,
          playerAvatar: player.avatar,
          message,
          timestamp: Date.now()
        });
      } catch {
        return;
      }
    });

    socket.on('disconnect', () => {
      try {
        const { gameId, playerId } = socket.data;

        if (gameId && playerId) {
          gameManager.disconnectPlayer(gameId, playerId);
          broadcastGameState(io, gameId);
        }
      } catch {
        return;
      }
    });
  });
}