import type { GamePhase } from '@shadowban/shared';

export function getPhaseRoute(phase: GamePhase, gameCode: string): string {
  switch (phase) {
    case 'LOBBY':
      return `/lobby/${gameCode}`;
    case 'CRISIS_REVEAL':
      return `/game/${gameCode}`;
    case 'EVIDENCE_PREPARATION':
      return `/game/${gameCode}/evidence`;
    case 'DEAL_INFORMATION':
    case 'ROLE_ABILITY':
      return `/game/${gameCode}/role`;
    case 'DISCUSSION':
      return `/game/${gameCode}/discussion`;
    case 'VOTING':
      return `/game/${gameCode}/vote`;
    case 'RESOLUTION':
      return `/game/${gameCode}/results`;
    case 'GAME_END':
      return `/game/${gameCode}/end`;
    default:
      return `/game/${gameCode}`;
  }
}