import { describe, expect, it } from 'vitest';

import { GamePhase } from '@shadowban/shared';

import { GameManager } from '../src/game/GameManager.js';

describe('game flow', () => {
  it('creates a lobby, accepts joins, and keeps names unique', () => {
    const gameManager = new GameManager();
    const game = gameManager.createGame('Host Player', 6);

    expect(game.gameCode).toHaveLength(5);
    expect(game.hostPlayerId).toBeTruthy();

    const secondPlayer = gameManager.joinGame(game.gameCode, 'Second Player');

    expect(secondPlayer.name).toBe('Second Player');
    expect(game.players).toHaveLength(2);

    expect(() => gameManager.joinGame(game.gameCode, 'Second Player')).toThrow('Player name must be unique.');
  });

  it('advances through the current round phases and ends after the last round', () => {
    const gameManager = new GameManager();
    const game = gameManager.createGame('Host Player', 1);

    gameManager.joinGame(game.gameCode, 'Second Player');
    gameManager.startGame(game.gameId);

    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.CRISIS_REVEAL);

    gameManager.advancePhase(game.gameId);
    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.EVIDENCE_PREPARATION);

    gameManager.advancePhase(game.gameId);
    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.DEAL_INFORMATION);

    gameManager.advancePhase(game.gameId);
    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.ROLE_ABILITY);

    gameManager.advancePhase(game.gameId);
    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.DISCUSSION);

    gameManager.advancePhase(game.gameId);
    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.VOTING);

    gameManager.advancePhase(game.gameId);
    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.RESOLUTION);

    gameManager.advancePhase(game.gameId);
    expect(gameManager.getGameOrThrow(game.gameId).phase).toBe(GamePhase.GAME_END);
  });
});