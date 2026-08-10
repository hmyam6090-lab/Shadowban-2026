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
  additionalTargetId?: string;
  responseId?: string;
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
  societyWins: number;
  algorithmWins: number;
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

export interface ShadowbanVotePayload {
  targetPlayerId: string;
}

export interface ShadowbanStartedPayload {
  endsAt: number;
}

export interface ShadowbanResolvedPayload {
  shadowbannedPlayerId: string | null;
  influencerMutedPlayerId: string | null;
}

export interface InfluencerMutePayload {
  targetPlayerId: string;
}

export interface ChatSendPayload {
  message: string;
}

export interface ChatMessagePayload {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
}

export interface GameEndedPayload {
  winner: 'SOCIETY' | 'ALGORITHM';
  societyScore: number;
  algorithmScore: number;
  societyWins: number;
  algorithmWins: number;
  eliminationVictory: boolean;
}

export interface ClientToServerEvents {
  'game:join': (payload: JoinGamePayload) => void;
  'game:ready': () => void;
  'game:start': () => void;
  'role:activate': (payload: RoleActivatePayload) => void;
  'evidence:present': (payload: { cardId: string }) => void;
  'vote:submit': (payload: VoteSubmitPayload) => void;
  'shadowban:vote': (payload: ShadowbanVotePayload) => void;
  'influencer:mute': (payload: InfluencerMutePayload) => void;
  'host:advance': () => void;
  'chat:send': (payload: ChatSendPayload) => void;
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
  'shadowban:started': (payload: ShadowbanStartedPayload) => void;
  'shadowban:resolved': (payload: ShadowbanResolvedPayload) => void;
  'round:audit': (payload: RoundAuditPayload) => void;
  'game:ended': (payload: GameEndedPayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  playerId?: string;
  gameId?: string;
  role?: RoleDefinition;
}