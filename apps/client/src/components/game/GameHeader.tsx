import type { GamePhase } from '@shadowban/shared';

import { PhaseIndicator } from './PhaseIndicator.js';

export interface GameHeaderProps {
  gameCode: string;
  round: number;
  totalRounds: number;
  phase: GamePhase;
}

export function GameHeader({
  gameCode,
  round,
  totalRounds,
  phase
}: GameHeaderProps) {
  return (
    <header className="game-header card">
      <div>
        <p className="eyebrow">SHADOWBAN</p>
        <h2>Game Code: {gameCode}</h2>
      </div>
      <div className="header-meta">
        <span>
          Round {round} / {totalRounds}
        </span>
        <PhaseIndicator phase={phase} />
      </div>
    </header>
  );
}
