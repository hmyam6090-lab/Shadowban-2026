import type {
  CrisisPublicDTO,
  PrivatePlayerState,
  PublicGameState,
  PublicInformationCard,
  RoleDefinition
} from '../types';

export interface JoinGamePayload {
  gameCode: string;
  playerId: string;
}

export interface RoleActivatePayload {
  targetPlayerId?: string;
  targetCardId?: string;
}

export interface VoteSubmitPayload {
  responseId: string;
}

export interface DiscussionStartedPayload {
  endsAt: number;
}

export interface VotingStartedPayload {
  endsAt: number;
}

export interface VotingUpdatedPayload {
  hasVoted: boolean;
}

export interface VotingRevealedPayload {
  results: Array<{
    responseId: string;
    votes: number;
  }>;
  selectedResponseId: string;
}

export interface RoundResolvedPayload {
  correctResponseId: string;
  selectedResponseId: string;
  societyScore: number;
  algorithmScore: number;
}

export interface RoundAuditPayload {
  availableEvidence: PublicInformationCard[];
  playerFeedSummary?: Array<{
    playerId: string;
    playerName: string;
    cardsSeen: number;
    supportingCorrect: number;
    supportingIncorrect: number;
    noiseSeen: number;
  }>;
}

export interface GameEndedPayload {
  winner: 'SOCIETY' | 'ALGORITHM';
  societyScore: number;
  algorithmScore: number;
}

export interface ClientToServerEvents {
  'game:join': (payload: JoinGamePayload) => void;
  'game:ready': () => void;
  'game:start': () => void;
  'role:activate': (payload: RoleActivatePayload) => void;
  'evidence:present': (payload: { cardId: string }) => void;
  'vote:submit': (payload: VoteSubmitPayload) => void;
  'host:advance': () => void;
}

export interface ServerToClientEvents {
  'game:state': (payload: PublicGameState) => void;
  'player:private-state': (payload: PrivatePlayerState) => void;
  'crisis:revealed': (payload: { crisis: CrisisPublicDTO }) => void;
  'discussion:started': (payload: DiscussionStartedPayload) => void;
  'evidence:presented': (payload: { playerId: string; card: PublicInformationCard }) => void;
  'voting:started': (payload: VotingStartedPayload) => void;
  'voting:updated': (payload: VotingUpdatedPayload) => void;
  'voting:revealed': (payload: VotingRevealedPayload) => void;
  'round:resolved': (payload: RoundResolvedPayload) => void;
  'round:audit': (payload: RoundAuditPayload) => void;
  'game:ended': (payload: GameEndedPayload) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  playerId?: string;
  gameId?: string;
  role?: RoleDefinition;
}