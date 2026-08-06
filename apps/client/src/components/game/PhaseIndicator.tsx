import type { GamePhase } from '@shadowban/shared';

export interface PhaseIndicatorProps {
  phase: GamePhase;
}

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  return (
    <span className={`phase-indicator ${phase}`}>
      {phase.replaceAll('_', ' ')}
    </span>
  );
}
