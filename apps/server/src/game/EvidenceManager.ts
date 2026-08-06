import type { AlgorithmSetup, Crisis, InformationCard, Player } from '@shadowban/shared';

export class EvidenceManager {
  buildDeck(_crisis: Crisis, _algorithm: AlgorithmSetup): InformationCard[] {
    throw new Error('EvidenceManager is not implemented in Phase 1/2.');
  }

  shuffleDeck(cards: InformationCard[]): InformationCard[] {
    return [...cards].sort(() => Math.random() - 0.5);
  }

  deal(_deck: InformationCard[], _players: Player[]): Record<string, InformationCard[]> {
    throw new Error('EvidenceManager is not implemented in Phase 1/2.');
  }

  validateCardOwnership(_playerId: string, _cardId: string): boolean {
    throw new Error('EvidenceManager is not implemented in Phase 1/2.');
  }
}