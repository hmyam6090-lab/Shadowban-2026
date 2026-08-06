export interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
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
  ROLE_ABILITY = 'ROLE_ABILITY',
  DISCUSSION = 'DISCUSSION',
  VOTING = 'VOTING',
  RESOLUTION = 'RESOLUTION',
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
  text: string;
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

export interface RoleDefinition {
  id: string;
  name: string;
  faction: Faction;
  description: string;
}

export interface PlayerGameState {
  playerId: string;
  roleId: string;
  hand: string[];
  presentedCardId?: string;
  abilityUsed: boolean;
  vote?: string;
  privateInspectionResults: string[];
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
  phaseEndsAt?: number;
  publicEvidence: string[];
  votes: Record<string, string>;
  playerStates: Record<string, PlayerGameState>;
}