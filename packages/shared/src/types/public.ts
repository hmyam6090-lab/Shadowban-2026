import type { AlgorithmSetup, Crisis, Faction, GamePhase, InformationCard, Player, RoleDefinition } from './domain';

export type PublicPlayer = Pick<Player, 'id' | 'name' | 'isHost' | 'connected' | 'ready' | 'avatar'>;

export type PublicInformationCard = Pick<InformationCard, 'id' | 'crisisId' | 'type' | 'title' | 'text' | 'image'>;

export type CrisisPublicDTO = Omit<Crisis, 'evidenceIds' | 'noiseIds'>;

export interface PublicGameState {
  gameId: string;
  gameCode: string;
  hostPlayerId: string;
  currentRound: number;
  totalRounds: number;
  phase: GamePhase;
  currentCrisisId?: string;
  currentAlgorithmId?: string;
  societyScore: number;
  algorithmScore: number;
  phaseEndsAt?: number;
  publicEvidence: Array<{
    playerId: string;
    card: InformationCard;
  }>;
  players: PublicPlayer[];
  votes?: Record<string, string>;
  shadowbanVotes?: Record<string, string>;
  societyWins: number;
  algorithmWins: number;
  publicAnnouncements: Array<{
    id: string;
    type: 'journalist_claim' | 'ability_used' | 'system' | 'journalist' | 'echo_chamber';
    message: string;
    timestamp: number;
    playerId?: string;
  }>;
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
  presentedCardIds: string[];
  vote?: string;
  shadowbanned: boolean;
  analystPrediction?: string;
  protectedFromShadowban: boolean;
  mutedNextRound: boolean;
  accountBreached: boolean;
  phaseReady: boolean;
}

export interface HostGameState extends PublicGameState {
  currentAlgorithmId?: string;
  connectedPlayerCount: number;
  readyPlayerCount: number;
  playerConnectionState: Array<Pick<Player, 'id' | 'name' | 'connected' | 'ready' | 'isHost'>>;
  selectedAlgorithm?: AlgorithmSetup;
}