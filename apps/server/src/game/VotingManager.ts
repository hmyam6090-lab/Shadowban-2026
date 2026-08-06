import type { GameState } from '@shadowban/shared';

export interface VoteResult {
  selectedResponseId: string;
  results: Array<{ responseId: string; votes: number }>;
}

export class VotingManager {
  submitVote(_game: GameState, _playerId: string, _responseId: string): void {
    throw new Error('VotingManager is not implemented in Phase 1/2.');
  }

  allVotesSubmitted(_game: GameState): boolean {
    throw new Error('VotingManager is not implemented in Phase 1/2.');
  }

  calculateResult(_game: GameState): VoteResult {
    throw new Error('VotingManager is not implemented in Phase 1/2.');
  }

  resolveTie(_game: GameState): void {
    throw new Error('VotingManager is not implemented in Phase 1/2.');
  }
}