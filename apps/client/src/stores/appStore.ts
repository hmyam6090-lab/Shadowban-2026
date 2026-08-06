import { create } from 'zustand';

import type { CrisisPublicDTO, PrivatePlayerState, PublicGameState, PublicInformationCard } from '@shadowban/shared';

type ServerStatus = 'unknown' | 'online' | 'offline';

interface GameSession {
  gameId: string;
  gameCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
}

interface VotingResults {
  responseId: string;
  votes: number;
}

interface PlayerFeedSummary {
  playerId: string;
  playerName: string;
  cardsSeen: number;
  supportingCorrect: number;
  supportingIncorrect: number;
  noiseSeen: number;
}

interface AppState {
  serverStatus: ServerStatus;
  session?: GameSession;
  publicState?: PublicGameState;
  privateState?: PrivatePlayerState;
  currentCrisis?: CrisisPublicDTO;
  hasVoted: boolean;
  votingResults?: VotingResults[];
  selectedResponseId?: string;
  presentedEvidence: Array<{ playerId: string; card: PublicInformationCard }>;
  roundAudit?: {
    availableEvidence: PublicInformationCard[];
    playerFeedSummary?: PlayerFeedSummary[];
  };
  setServerStatus: (status: ServerStatus) => void;
  setSession: (session: GameSession) => void;
  clearSession: () => void;
  setPublicState: (state: PublicGameState) => void;
  setPrivateState: (state: PrivatePlayerState) => void;
  setCurrentCrisis: (crisis?: CrisisPublicDTO) => void;
  setHasVoted: (hasVoted: boolean) => void;
  setVotingResults: (results: VotingResults[]) => void;
  setSelectedResponseId: (responseId?: string) => void;
  addPresentedEvidence: (evidence: { playerId: string; card: PublicInformationCard }) => void;
  setRoundAudit: (audit?: { availableEvidence: PublicInformationCard[]; playerFeedSummary?: PlayerFeedSummary[] }) => void;
  clearRoundData: () => void;
}

const SESSION_STORAGE_KEY = 'shadowban.session';

function readSessionFromStorage(): GameSession | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue) as GameSession;
  } catch {
    return undefined;
  }
}

export const useAppStore = create<AppState>((set) => ({
  serverStatus: 'unknown',
  session: readSessionFromStorage(),
  hasVoted: false,
  presentedEvidence: [],
  setServerStatus: (status) => set({ serverStatus: status }),
  setSession: (session) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }

    set({ session });
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    set({ session: undefined, publicState: undefined, privateState: undefined, currentCrisis: undefined });
  },
  setPublicState: (publicState) => set({ publicState }),
  setPrivateState: (privateState) => set({ privateState }),
  setCurrentCrisis: (currentCrisis) => set({ currentCrisis }),
  setHasVoted: (hasVoted) => set({ hasVoted }),
  setVotingResults: (votingResults) => set({ votingResults }),
  setSelectedResponseId: (selectedResponseId) => set({ selectedResponseId }),
  addPresentedEvidence: (evidence) => set((state) => ({
    presentedEvidence: [...state.presentedEvidence, evidence]
  })),
  setRoundAudit: (roundAudit) => set({ roundAudit }),
  clearRoundData: () => set({
    hasVoted: false,
    votingResults: undefined,
    selectedResponseId: undefined,
    presentedEvidence: [],
    roundAudit: undefined
  })
}));