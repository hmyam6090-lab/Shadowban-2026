import type { Server } from 'socket.io';

import { GamePhase, type ClientToServerEvents, type InterServerEvents, type ServerToClientEvents, type SocketData } from '@shadowban/shared';

import { getCrisisById, getEvidenceForCrisis, getRoleById } from '../../services/contentService.js';
import { gameManager } from '../../services/gameService.js';

function broadcastGameState(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, gameId: string): void {
  const game = gameManager.getGameOrThrow(gameId);
  // Auto-expire echo chamber if its time has passed
  if (game.echoChamberActive && typeof game.echoChamberEndsAt === 'number' && Date.now() > game.echoChamberEndsAt) {
    game.echoChamberActive = false;
    game.echoChamberAllowedPlayers = [];
    game.echoChamberEndsAt = undefined;
  }

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
    // Add a public announcement so clients show the shadowban as an overlay
    const sb = game.shadowbanResult;
    game.publicAnnouncements.push({
      id: crypto.randomUUID(),
      type: 'system',
      message: sb.shadowbannedPlayerId ? `${sb.shadowbannedPlayerName || 'A player'} was shadowbanned.` : 'No player was shadowbanned this round.',
      timestamp: Date.now()
    });

    io.to(gameId).emit('shadowban:resolved', {
      shadowbannedPlayerId: sb.shadowbannedPlayerId,
      influencerMutedPlayerId: null,
      shadowbannedPlayerName: sb.shadowbannedPlayerName || undefined
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

        console.log(`[host:advance] host=${playerId} game=${gameId} currentPhase=${game.phase}`);
        try {
          gameManager.advancePhase(gameId);
          console.log(`[host:advance] afterAdvance game=${gameId} newPhase=${game.phase}`);
        } catch (err) {
          console.error('[host:advance] advancePhase error:', err);
          throw err;
        }
        broadcastGameState(io, gameId);
      } catch {
        // Log and return to aid debugging
        console.error('[host:advance] handler caught an error');
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
          // Broadcast the presented evidence to all players (includes card image)
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

        // Don't execute the ability server-side here — the client opens the ability UI
        // and will call specific `role:action` events to perform the ability with parameters.
        // Acknowledge the activation so the client has confirmation.
        if (role) {
          socket.emit('ability:result', {
            playerId,
            roleId: role.id,
            abilityName: role.abilityName || 'Unknown',
            result: 'Ability UI opened',
            details: {}
          });
        }

        // Broadcast game state in case anything changed
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
        let abilityAnnouncement: { message: string; type?: string } | null = null;
        switch (action) {
          case 'get_player_hand':
            // Request the target player's hand (for Official ability UI)
            if (targetId) {
              const targetState = game.playerStates[targetId];
              if (targetState) {
                const allEvidence = game.currentCrisisId ? getEvidenceForCrisis(game.currentCrisisId) : [];
                const cardMap = new Map(allEvidence.map((c) => [c.id, c]));
                const handCards = targetState.hand.map((cardId) => cardMap.get(cardId)).filter(Boolean);

                // Send only to requesting socket (private)
                socket.emit('player:hand', { targetId, hand: handCards });
              }
            }
            break;
          case 'spy_card':
            // Government Official: Spy on a player's card
            if (targetId && typeof cardIndex === 'number') {
              const targetState = game.playerStates[targetId];
              if (targetState && targetState.hand && targetState.hand[cardIndex]) {
                const allEvidence = game.currentCrisisId ? getEvidenceForCrisis(game.currentCrisisId) : [];
                const cardMap = new Map(allEvidence.map((c) => [c.id, c]));
                const cardObj = cardMap.get(targetState.hand[cardIndex]);

                // Persist the inspection result in the caller's private inspection results
                if (playerState && playerState.privateInspectionResults) {
                  playerState.privateInspectionResults.push(`CARD_SPY:${targetId}:${cardObj?.id || targetState.hand[cardIndex]}`);
                }

                socket.emit('ability:result', {
                  playerId,
                  roleId: role.id,
                  abilityName: role.abilityName || 'Unknown',
                  result: 'Card revealed',
                  details: { card: cardObj || { id: targetState.hand[cardIndex] } }
                });
                // Public, non-revealing announcement
                abilityAnnouncement = { message: `${role.name || 'Official'} inspected ${game.players.find(p=>p.id===targetId)?.name || 'a player'}.`, type: 'ability_used' };
              }
            }
            break;

            case 'spy_random':
              // Government Official: inspect a random card from a player's hand
              if (targetId) {
                const targetState = game.playerStates[targetId];
                if (targetState && targetState.hand && targetState.hand.length > 0) {
                  const allEvidence = game.currentCrisisId ? getEvidenceForCrisis(game.currentCrisisId) : [];
                  const cardMap = new Map(allEvidence.map((c) => [c.id, c]));
                  const randomIndex = Math.floor(Math.random() * targetState.hand.length);
                  const cardId = targetState.hand[randomIndex];
                  const cardObj = cardMap.get(cardId);

                  if (playerState && playerState.privateInspectionResults) {
                    playerState.privateInspectionResults.push(`CARD_SPY:${targetId}:${cardId}`);
                  }

                  socket.emit('ability:result', {
                    playerId,
                    roleId: role.id,
                    abilityName: role.abilityName || 'Unknown',
                    result: 'Card revealed',
                    details: { card: cardObj || { id: cardId } }
                  });
                  // Public, non-revealing announcement
                  abilityAnnouncement = { message: `${role.name || 'Official'} inspected ${game.players.find(p=>p.id===targetId)?.name || 'a player'}.`, type: 'ability_used' };
                }
              }
              break;

          case 'ask_question':
            // Journalist: Ask a player about a response
            if (targetId && responseId) {
              const targetPlayer = game.players.find(p => p.id === targetId);
              if (targetPlayer) {
                // Find the response label from the crisis
                const crisis = game.currentCrisisId ? getCrisisById(game.currentCrisisId) : undefined;
                const responseLabel = crisis?.responses?.find(r => r.id === responseId)?.label;

                // Broadcast announcement to all players including the asked question
                game.publicAnnouncements.push({
                  id: crypto.randomUUID(),
                  type: 'journalist_claim',
                  message: `${role.name || 'Journalist'} asked ${targetPlayer.name} whether they support: "${responseLabel || 'Unknown'}"`,
                  timestamp: Date.now(),
                  playerId: playerId
                });

                io.to(gameId).emit('ability:result', {
                  playerId,
                  roleId: role.id,
                  abilityName: role.abilityName || 'Unknown',
                  result: 'Question sent',
                  details: { targetId, responseId }
                });
                // journalist already created a public announcement above
              }
            }
            break;

          case 'lock_vote':
            // Analyst: Lock vote on a response
            if (responseId && playerState) {
              // Persist locked vote and mirror fields used by round resolution
              playerState.lockedVote = responseId;
              playerState.analystPrediction = responseId;
              playerState.vote = responseId;

              socket.emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Vote locked',
                details: { responseId }
              });
              abilityAnnouncement = { message: `${game.players.find(p=>p.id===playerId)?.name || 'Analyst'} has locked their vote.`, type: 'ability_used' };
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
              abilityAnnouncement = { message: `${game.players.find(p=>p.id===playerId)?.name || 'Investigator'} performed a crosscheck.`, type: 'ability_used' };
            }
            break;

          case 'breach':
            // Hacker: Reveal a player's role
            if (targetId) {
              const targetState = game.playerStates[targetId];
              const targetRole = targetState?.roleId ? getRoleById(targetState.roleId) : null;
              // Include a random card/info snippet if available
              const allEvidence = game.currentCrisisId ? getEvidenceForCrisis(game.currentCrisisId) : [];
              const randomCardIndex = targetState && targetState.hand.length > 0 ? Math.floor(Math.random() * targetState.hand.length) : -1;
              const randomCardId = randomCardIndex >= 0 ? targetState.hand[randomCardIndex] : null;
              const randomCard = randomCardId ? allEvidence.find((c) => c.id === randomCardId) : null;

              // Mark target as account-breached in persistent state
              if (targetState) {
                targetState.accountBreached = true;
              }

              // Persist a private inspection result for the hacker
              if (playerState && playerState.privateInspectionResults) {
                playerState.privateInspectionResults.push(`ACCOUNT_BREACH:${targetId}:${targetRole?.id || 'unknown'}:${randomCardId || 'NO_CARD'}`);
              }

              // Log breach for server-side debugging (no sensitive broadcast)
              console.log(`[ability:breach] hacker=${playerId} target=${targetId} role=${targetRole?.name || targetRole?.id || 'unknown'}`);

              socket.emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Account breached',
                details: {
                  targetId,
                  role: targetRole?.name || null,
                  roleId: targetRole?.id || null,
                  roleImage: targetRole?.image || null,
                  randomInfo: randomCard ? randomCard.text : null
                }
              });
              abilityAnnouncement = { message: `${game.players.find(p=>p.id===playerId)?.name || 'Hacker'} has breached an account.`, type: 'ability_used' };
            }
            break;

          case 'select_algorithm':
            // Algorithm: Select algorithm to shadowban cards
            if (algorithmId) {
              game.selectedAlgorithm = algorithmId;
              // Also set currentAlgorithmId so RoundManager and distribution logic see selection
              // Some code paths use currentAlgorithmId instead of selectedAlgorithm
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (game as any).currentAlgorithmId = algorithmId;
              // Broadcast to all players
              io.to(gameId).emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Algorithm selected',
                details: { algorithmId }
              });
              abilityAnnouncement = { message: `${game.players.find(p=>p.id===playerId)?.name || 'Algorithm'} selected an algorithm.`, type: 'ability_used' };
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
              // echo_chamber already pushed an explicit public announcement above
            }
            break;

          case 'mute':
            // Influencer: Mute a player next round
            if (targetId) {
              // Only allow Influencer to mute if they are currently shadowbanned
              if (!playerState?.shadowbanned) {
                // Ignore or optionally send error result
                socket.emit('ability:result', {
                  playerId,
                  roleId: role.id,
                  abilityName: role.abilityName || 'Unknown',
                  result: 'Mute failed: influencer must be shadowbanned to use this ability.',
                  details: { targetId }
                });
                break;
              }

              game.influencerMutedPlayerId = targetId;
              const targetPlayer = game.players.find(p => p.id === targetId);
              const targetState = game.playerStates[targetId];
              if (targetState) {
                targetState.mutedNextRound = true;
              }

              // Push a public announcement so clients can show overlays
              game.publicAnnouncements.push({
                id: crypto.randomUUID(),
                type: 'ability_used',
                message: `${targetPlayer?.name || 'Player'} was muted by ${game.players.find(p=>p.id===playerId)?.name || 'Influencer'}.`,
                timestamp: Date.now(),
                playerId: playerId
              });

              io.to(gameId).emit('ability:result', {
                playerId,
                roleId: role.id,
                abilityName: role.abilityName || 'Unknown',
                result: 'Player muted',
                details: { targetId, playerName: targetPlayer?.name || 'Unknown' }
              });

              // Send a private notification to the muted player's socket so they know immediately
              if (targetPlayer?.socketId) {
                io.to(targetPlayer.socketId).emit('ability:result', {
                  playerId: targetPlayer.id,
                  roleId: role.id,
                  abilityName: role.abilityName || 'Unknown',
                  result: 'You were muted',
                  details: { targetId: targetPlayer.id }
                });
              }
              // mute already pushed an explicit public announcement above
            }
            break;

          default:
            console.log('Unknown ability action:', action);
        }

        // If we created a short public announcement message, push it now
        if (abilityAnnouncement) {
          game.publicAnnouncements.push({
            id: crypto.randomUUID(),
            type: abilityAnnouncement.type || 'ability_used',
            message: abilityAnnouncement.message,
            timestamp: Date.now(),
            playerId: playerId
          });
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

        // Echo chamber enforcement: if echo chamber active and player not allowed, block chat
        if (game.echoChamberActive && Array.isArray(game.echoChamberAllowedPlayers) && !game.echoChamberAllowedPlayers.includes(playerId)) {
          return;
        }

        // If discussion phase and player is actively muted for this round, block chat
        if (game.phase === GamePhase.DISCUSSION && playerState?.muted) {
          return;
        }

        // Block shadowbanned players from chatting
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