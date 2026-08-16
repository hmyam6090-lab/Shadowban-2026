import type { Server } from 'socket.io';

import { GamePhase, type ClientToServerEvents, type InterServerEvents, type ServerToClientEvents, type SocketData } from '@shadowban/shared';

import { getCrisisById, getEvidenceForCrisis, getRoleById } from '../../services/contentService.js';
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

  if (game.currentCrisisId && [GamePhase.CRISIS_REVEAL, GamePhase.EVIDENCE_PREPARATION, GamePhase.DEAL_INFORMATION, GamePhase.DISCUSSION, GamePhase.VOTING, GamePhase.RESOLUTION, GamePhase.SHADOWBAN, GamePhase.GAME_END].includes(game.phase)) {
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

  if (game.shadowbanResult) {
    io.to(gameId).emit('shadowban:resolved', {
      shadowbannedPlayerId: game.shadowbanResult.shadowbannedPlayerId,
      influencerMutedPlayerId: null,
      shadowbannedPlayerName: game.shadowbanResult.shadowbannedPlayerName || undefined
    });
    // Clear the result after broadcasting
    game.shadowbanResult = undefined;
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

    socket.on('phase:ready', () => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        gameManager.setPlayerPhaseReady(gameId, playerId, true);
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

    socket.on('game:leave', () => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        // Remove player from game
        gameManager.removePlayer(gameId, playerId);
        socket.leave(gameId);
        socket.data.gameId = undefined;
        socket.data.playerId = undefined;

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
              type: card.type,
              image: card.image
            }
          });

          // Also send as a chat message with card embed
          const player = game.players.find(p => p.id === playerId);
          io.to(gameId).emit('chat:message', {
            playerId,
            playerName: player?.name || 'Unknown',
            playerAvatar: player?.avatar,
            message: `presented evidence: ${card.title}`,
            timestamp: Date.now(),
            cardId: card.id,
            cardImage: card.image
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

        const game = gameManager.getGameOrThrow(gameId);
        const playerState = game.playerStates[playerId];
        const role = playerState?.roleId ? getRoleById(playerState.roleId) : null;

        gameManager.activateRoleAbility(gameId, playerId, targetPlayerId, targetCardId, additionalTargetId, responseId);

        // Emit ability result to the player who used it
        if (role) {
          socket.emit('ability:result', {
            playerId,
            roleId: role.id,
            abilityName: role.abilityName || 'Unknown',
            result: 'Ability activated successfully. Check your private state for details.',
            details: { targetPlayerId }
          });
        }

        // Broadcast updated game state
        broadcastGameState(io, gameId);
      } catch {
        return;
      }
    });

    socket.on('role:action', ({ action, targetId, targetIds, cardIndex, responseId, algorithmId }) => {
      try {
        const { gameId, playerId } = socket.data;

        if (!gameId || !playerId) {
          return;
        }

        const game = gameManager.getGameOrThrow(gameId);
        const playerState = game.playerStates[playerId];
        const role = playerState?.roleId ? getRoleById(playerState.roleId) : null;

        if (!role) {
          return;
        }

        // Handle different ability actions
        switch (action) {
          case 'spy_card':
            // Government Official: Spy on a player's card
            if (targetId && typeof cardIndex === 'number') {
              const targetState = game.playerStates[targetId];
              if (targetState && targetState.hand && targetState.hand[cardIndex]) {
                socket.emit('ability:result', {
                  playerId,
                  roleId: role.id,
                  abilityName: role.abilityName || 'Unknown',
                  result: 'Card revealed',
                  details: { card: targetState.hand[cardIndex] }
                });
              }
            }
            break;

          case 'ask_question':
            // Journalist: Ask a player about a response
            if (targetId && responseId) {
              const targetPlayer = game.players.find(p => p.id === targetId);
              if (targetPlayer) {
                // Broadcast announcement to all players
                game.publicAnnouncements.push({
                  id: crypto.randomUUID(),
                  type: 'journalist',
                  message: `${role.name || 'Journalist'} asked ${targetPlayer.name} about their evidence.`,
                  timestamp: Date.now()
                });
                io.to(gameId).emit('ability:result', {
                  playerId,
                  roleId: role.id,
                  abilityName: role.abilityName || 'Unknown',
                  result: 'Question sent',
                  details: { targetId, responseId }
                });
              }
            }
            break;

          case 'lock_vote':
            // Analyst: Lock vote on a response
            if (responseId && playerState) {
              playerState.lockedVote = responseId;
              socket.emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Vote locked',
                details: { responseId }
              });
            }
            break;

          case 'crosscheck':
            // Investigator: Check if two players are on same side
            if (targetIds && targetIds.length === 2 && targetIds[0] && targetIds[1]) {
              const player1 = game.playerStates[targetIds[0]];
              const player2 = game.playerStates[targetIds[1]];
              const role1 = player1?.roleId ? getRoleById(player1.roleId) : null;
              const role2 = player2?.roleId ? getRoleById(player2.roleId) : null;
              const isSameSide = role1?.faction === role2?.faction;
              
              socket.emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: isSameSide ? 'SAME SIDE' : 'DIFFERENT SIDES',
                details: { targetIds, isSameSide }
              });
            }
            break;

          case 'breach':
            // Hacker: Reveal a player's role
            if (targetId) {
              const targetState = game.playerStates[targetId];
              const targetRole = targetState?.roleId ? getRoleById(targetState.roleId) : null;
              
              socket.emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Account breached',
                details: { targetId, role: targetRole?.name || 'Unknown' }
              });
            }
            break;

          case 'select_algorithm':
            // Algorithm: Select algorithm to shadowban cards
            if (algorithmId) {
              game.selectedAlgorithm = algorithmId;
              // Broadcast to all players
              io.to(gameId).emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Algorithm selected',
                details: { algorithmId }
              });
            }
            break;

          case 'closed_circuit':
            // Echo Chamber: Mute all except selected players for 30s
            if (targetIds && targetIds.length === 2) {
              game.echoChamberActive = true;
              game.echoChamberAllowedPlayers = targetIds;
              game.echoChamberEndsAt = Date.now() + 30000;
              
              // Broadcast announcement
              const player1 = game.players.find(p => p.id === targetIds[0]);
              const player2 = game.players.find(p => p.id === targetIds[1]);
              game.publicAnnouncements.push({
                id: crypto.randomUUID(),
                type: 'echo_chamber',
                message: `CLOSED CIRCUIT: Only ${player1?.name || 'Player 1'} and ${player2?.name || 'Player 2'} may speak for 30 seconds.`,
                timestamp: Date.now()
              });
              
              io.to(gameId).emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Closed circuit activated',
                details: { targetIds, endsAt: game.echoChamberEndsAt }
              });
            }
            break;

          case 'mute':
            // Influencer: Mute a player next round
            if (targetId) {
              game.influencerMutedPlayerId = targetId;
              const targetPlayer = game.players.find(p => p.id === targetId);
              
              socket.emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Player muted',
                details: { targetId, playerName: targetPlayer?.name || 'Unknown' }
              });
            }
            break;

          default:
            console.log('Unknown ability action:', action);
        }

        // Mark ability as used
        if (playerState) {
          playerState.abilityUsed = true;
        }

        // Broadcast updated game state
        broadcastGameState(io, gameId);
      } catch (error) {
        console.error('Error handling role action:', error);
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