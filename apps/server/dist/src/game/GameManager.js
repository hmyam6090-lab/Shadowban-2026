import { DEFAULT_TOTAL_ROUNDS, Faction, GamePhase, InformationType, MAX_PLAYERS, MIN_PLAYERS } from '@shadowban/shared';
import { getCrisisById, getEvidenceForCrisis, getRoleById } from '../services/contentService.js';
import { RoundManager } from './RoundManager.js';
import { generateGameCode } from '../utils/gameCode.js';
export class GameManager {
    games = new Map();
    roundManager = new RoundManager();
    createGame(hostName, totalRounds = DEFAULT_TOTAL_ROUNDS) {
        const gameId = crypto.randomUUID();
        const game = {
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
            playerStates: {}
        };
        this.games.set(gameId, game);
        if (hostName) {
            const host = this.addPlayer(game, hostName, true);
            game.hostPlayerId = host.id;
        }
        return game;
    }
    joinGame(gameCode, playerName) {
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
        return this.addPlayer(game, playerName, false);
    }
    startGame(gameId) {
        const game = this.getGame(gameId);
        const connectedPlayers = game.players.filter((player) => player.connected).length;
        if (connectedPlayers < MIN_PLAYERS || connectedPlayers > MAX_PLAYERS) {
            throw new Error('At least 2 connected players are required.');
        }
        game.currentRound = 1;
        game.algorithmScore = 0;
        game.societyScore = 0;
        this.roundManager.startRound(game);
    }
    advancePhase(gameId) {
        const game = this.getGame(gameId);
        switch (game.phase) {
            case GamePhase.CRISIS_REVEAL:
                this.roundManager.prepareEvidence(game);
                break;
            case GamePhase.EVIDENCE_PREPARATION:
                this.roundManager.dealInformation(game);
                break;
            case GamePhase.DEAL_INFORMATION:
                this.roundManager.startRolePhase(game);
                break;
            case GamePhase.ROLE_ABILITY:
                this.roundManager.startDiscussion(game);
                break;
            case GamePhase.DISCUSSION:
                this.roundManager.startVoting(game);
                break;
            case GamePhase.VOTING:
                this.roundManager.resolveRound(game);
                break;
            case GamePhase.RESOLUTION:
                this.roundManager.startNextRound(game);
                break;
            default:
                break;
        }
    }
    submitVote(gameId, playerId, responseId) {
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
    getVotingResults(gameId) {
        const game = this.getGame(gameId);
        const results = {};
        for (const vote of Object.values(game.votes)) {
            results[vote] = (results[vote] || 0) + 1;
        }
        return Object.entries(results).map(([responseId, votes]) => ({
            responseId,
            votes
        }));
    }
    getSelectedResponse(gameId) {
        const game = this.getGame(gameId);
        const results = this.getVotingResults(gameId);
        if (results.length === 0) {
            return null;
        }
        // Find the response with the most votes
        const sorted = results.sort((a, b) => b.votes - a.votes);
        return sorted[0]?.responseId ?? null;
    }
    presentEvidence(gameId, playerId, cardId) {
        const game = this.getGame(gameId);
        const playerState = game.playerStates[playerId];
        if (!playerState) {
            throw new Error('Player not found.');
        }
        // Check if the player has this card in their hand
        if (!playerState.hand.includes(cardId)) {
            throw new Error('Player does not have this card.');
        }
        // Set the presented card
        playerState.presentedCardId = cardId;
        // Add to public evidence if not already there
        if (!game.publicEvidence.includes(cardId)) {
            game.publicEvidence.push(cardId);
        }
    }
    getRoundAudit(gameId) {
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
                    }
                    else if (card.supportsResponseId === crisis.correctResponseId) {
                        supportingCorrect++;
                    }
                    else {
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
    activateRoleAbility(gameId, playerId, targetPlayerId, targetCardId) {
        const game = this.getGame(gameId);
        const playerState = game.playerStates[playerId];
        if (!playerState) {
            throw new Error('Player not found.');
        }
        if (playerState.abilityUsed) {
            throw new Error('Ability already used this round.');
        }
        if (game.phase !== GamePhase.ROLE_ABILITY) {
            throw new Error('Role abilities can only be used during the Role Ability phase.');
        }
        const role = getRoleById(playerState.roleId);
        // Government Official: Inspect another player's card
        if (role.id === 'government_official') {
            if (!targetPlayerId) {
                throw new Error('Target player required for Government Official ability.');
            }
            const targetState = game.playerStates[targetPlayerId];
            if (!targetState) {
                throw new Error('Target player not found.');
            }
            if (targetState.hand.length === 0) {
                throw new Error('Target player has no cards to inspect.');
            }
            // Inspect a random card from the target's hand
            const randomCardIndex = Math.floor(Math.random() * targetState.hand.length);
            const inspectedCardId = targetState.hand[randomCardIndex];
            if (!inspectedCardId) {
                throw new Error('Failed to select a card for inspection.');
            }
            // Add to inspection results
            playerState.privateInspectionResults.push(inspectedCardId);
            playerState.abilityUsed = true;
        }
        else {
            throw new Error('Role ability not implemented yet.');
        }
    }
    setPlayerReady(gameId, playerId, ready) {
        const game = this.getGame(gameId);
        const player = this.getPlayer(game, playerId);
        player.ready = ready;
    }
    attachPlayerSocket(gameId, playerId, socketId) {
        const game = this.getGame(gameId);
        const player = this.getPlayer(game, playerId);
        player.socketId = socketId;
        player.connected = true;
    }
    disconnectPlayer(gameId, playerId) {
        const game = this.getGame(gameId);
        const player = this.getPlayer(game, playerId);
        player.connected = false;
    }
    getGameByCode(gameCode) {
        return this.getGameByCodeInternal(gameCode);
    }
    getGameOrThrow(gameId) {
        return this.getGame(gameId);
    }
    getPublicState(gameId) {
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
            publicEvidence: [...game.publicEvidence]
        };
    }
    getPrivateState(gameId, playerId) {
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
        const hand = playerState.hand.map((cardId) => {
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
            presentedCardId: playerState.presentedCardId,
            vote: playerState.vote
        };
    }
    getGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found.');
        }
        return game;
    }
    getGameByCodeInternal(gameCode) {
        const game = [...this.games.values()].find((entry) => entry.gameCode === gameCode);
        if (!game) {
            throw new Error('Game not found.');
        }
        return game;
    }
    addPlayer(game, playerName, isHost) {
        const player = {
            id: crypto.randomUUID(),
            name: playerName,
            socketId: '',
            isHost,
            connected: true,
            ready: false
        };
        game.players.push(player);
        if (!game.hostPlayerId || isHost) {
            game.hostPlayerId = player.id;
        }
        const defaultRole = isHost ? 'government_official' : '';
        game.playerStates[player.id] = {
            playerId: player.id,
            roleId: defaultRole,
            hand: [],
            abilityUsed: false,
            privateInspectionResults: []
        };
        return player;
    }
    getPlayer(game, playerId) {
        const player = game.players.find((entry) => entry.id === playerId);
        if (!player) {
            throw new Error('Player not found.');
        }
        return player;
    }
    getRoleOrPlaceholder(roleId) {
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
        }
        catch {
            return {
                id: roleId,
                name: 'Unassigned',
                faction: Faction.SOCIETY,
                description: 'Phase 3 placeholder role.'
            };
        }
    }
}
