export interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  avatar?: string;
}

export enum Faction {
  SOCIETY = 'SOCIETY',
  ALGORITHM = 'ALGORITHM'
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  CRISIS_REVEAL = 'CRISIS_REVEAL',
  EVIDENCE_PREPARATION = 'EVIDENCE_PREPARATION',
  DEAL_INFORMATION = 'DEAL_INFORMATION',
  ABILITY = 'ABILITY',
  DISCUSSION = 'DISCUSSION',
  VOTING = 'VOTING',
  RESOLUTION = 'RESOLUTION',
  SHADOWBAN = 'SHADOWBAN',
  GAME_END = 'GAME_END'
}

export interface Response {
  id: string;
  label: string;
  description?: string;
}

export interface Crisis {
  id: string;
  name: string;
  description: string;
  responses: [Response, Response, Response];
  correctResponseId: string;
  evidenceIds: string[];
  noiseIds: string[];
}

export enum InformationType {
  EVIDENCE = 'EVIDENCE',
  NOISE = 'NOISE'
}

export interface InformationCard {
  id: string;
  crisisId: string;
  type: InformationType;
  title: string;
  subtitle?: string;
  text: string;
  source?: string;
  sourceType?: string;
  reliability?: number;
  tags?: string[];
  supportsResponseId?: string;
}

export interface AlgorithmSetup {
  id: string;
  name: string;
  description: string;
  distribution: {
    response1: number;
    response2: number;
    response3: number;
    noise: number;
  };
}

export enum AbilityType {
  ONCE_PER_ROUND = 'once_per_round',
  ONCE_PER_GAME = 'once_per_game',
  PASSIVE = 'passive'
}

export enum AbilityTiming {
  ROLE_ABILITY_PHASE = 'role_ability_phase',
  ANYTIME_BEFORE_DISCUSSION = 'anytime_before_discussion',
  ON_SHADOWBAN = 'on_shadowban'
}

export interface RoleDefinition {
  id: string;
  name: string;
  faction: Faction;
  description: string;
  abilityName?: string;
  abilityDescription?: string;
  abilityType?: AbilityType;
  abilityTiming?: AbilityTiming;
}

export interface PlayerGameState {
  playerId: string;
  roleId: string;
  hand: string[];
  presentedCardIds: string[];
  abilityUsed: boolean;
  vote?: string;
  privateInspectionResults: string[];
  shadowbanned: boolean;
  analystPrediction?: string;
  protectedFromShadowban: boolean;
  mutedNextRound: boolean;
  accountBreached: boolean;
  phaseReady: boolean;
}

export interface GameState {
  gameId: string;
  gameCode: string;
  hostPlayerId: string;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  phase: GamePhase;
  currentCrisisId?: string;
  currentAlgorithmId?: string;
  societyScore: number;
  algorithmScore: number;
  societyWins: number;
  algorithmWins: number;
  phaseEndsAt?: number;
  publicEvidence: string[];
  votes: Record<string, string>;
  shadowbanVotes: Record<string, string>;
  shadowbanResult?: {
    shadowbannedPlayerId: string | null;
    shadowbannedPlayerName: string | null;
  };
  publicAnnouncements: Array<{
    id: string;
    type: 'journalist_claim' | 'ability_used' | 'system';
    message: string;
    timestamp: number;
    playerId?: string;
  }>;
  playerStates: Record<string, PlayerGameState>;
}