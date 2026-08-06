import type { GameState, Player } from '@shadowban/shared';

export type RoleHandler = (game: GameState, actor: Player, payload: Record<string, unknown>) => void;

export const roleHandlers: Record<string, RoleHandler> = {};

export class RoleManager {
  activateRole(): void {
    throw new Error('RoleManager is not implemented in Phase 1/2.');
  }
}