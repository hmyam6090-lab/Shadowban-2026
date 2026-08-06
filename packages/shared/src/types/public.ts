import type { AlgorithmSetup, Crisis, Faction, GamePhase, InformationCard, Player, RoleDefinition } from './domain';

export type PublicPlayer = Pick<Player, 'id' | 'name' | 'isHost' | 'connected' | 'ready'>;

export type PublicInformationCard = Pick<InformationCard, 'id' | 'crisisId' | 'type' | 'title' | 'text'>;

export type CrisisPublicDTO = Omit<Crisis, 'correctResponseId' | 'evidenceIds' | 'noiseIds'>;

export interface PublicGameState {
  gameId: string;
  gameCode: string;
  hostPlayerId: string;
  players: PublicPlayer[];
  currentRound: number;
  totalRounds: number;
  phase: GamePhase;
  currentCrisisId?: string;
  societyScore: number;
  algorithmScore: number;
  phaseEndsAt?: number;
  publicEvidence: string[];
}

export interface PrivatePlayerState {
  gameId: string;
  gameCode: string;
  playerId: string;
  playerName: string;
  role: RoleDefinition;
  faction: Faction;
  hand: InformationCard[];
  abilityUsed: boolean;
  privateInspectionResults: string[];
  presentedCardId?: string;
  vote?: string;
}

export interface HostGameState extends PublicGameState {
  currentAlgorithmId?: string;
  connectedPlayerCount: number;
  readyPlayerCount: number;
  playerConnectionState: Array<Pick<Player, 'id' | 'name' | 'connected' | 'ready' | 'isHost'>>;
  selectedAlgorithm?: AlgorithmSetup;
}