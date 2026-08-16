import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { localGameManager } from '../local/LocalGameManager.js';

import type { ServerToClientEvents, ClientToServerEvents } from '@shadowban/shared';

import { useAppStore } from '../stores/appStore.js';

function getServerUrl(): string {
  // Try to use environment variable first (for local development)
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  
  // For production, detect the server URL based on the current origin
  // If we're on the client subdomain, use the server subdomain
  const currentOrigin = window.location.origin;
  if (currentOrigin.includes('shadowban-client')) {
    return currentOrigin.replace('shadowban-client', 'shadowban-server');
  }
  
  // Fallback to localhost for development
  return 'http://localhost:3001';
}

const realSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(getServerUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

export function useSocketConnection(): void {
  const session = useAppStore((state) => state.session);
  const setServerStatus = useAppStore((state) => state.setServerStatus);
  const setPublicState = useAppStore((state) => state.setPublicState);
  const setPrivateState = useAppStore((state) => state.setPrivateState);
  const setCurrentCrisis = useAppStore((state) => state.setCurrentCrisis);
  const setHasVoted = useAppStore((state) => state.setHasVoted);
  const setVotingResults = useAppStore((state) => state.setVotingResults);
  const setSelectedResponseId = useAppStore((state) => state.setSelectedResponseId);
  const addPresentedEvidence = useAppStore((state) => state.addPresentedEvidence);
  const setRoundAudit = useAppStore((state) => state.setRoundAudit);
  const clearRoundData = useAppStore((state) => state.clearRoundData);

  useEffect(() => {
    const handleConnect = () => setServerStatus('online');
    const handleDisconnect = () => setServerStatus('offline');
    const handleGameState: ServerToClientEvents['game:state'] = (state) => setPublicState(state);
    const handlePrivateState: ServerToClientEvents['player:private-state'] = (state) => setPrivateState(state);
    const handleCrisis: ServerToClientEvents['crisis:revealed'] = ({ crisis }) => setCurrentCrisis(crisis);
    const handleVotingUpdated: ServerToClientEvents['voting:updated'] = ({ hasVoted }) => setHasVoted(hasVoted);
    const handleVotingRevealed: ServerToClientEvents['voting:revealed'] = ({ results, selectedResponseId }) => {
      setVotingResults(results);
      setSelectedResponseId(selectedResponseId);
    };
    const handleEvidencePresented: ServerToClientEvents['evidence:presented'] = ({ playerId, card }) => {
      addPresentedEvidence({ playerId, card });
    };
    const handleRoundAudit: ServerToClientEvents['round:audit'] = ({ availableEvidence, playerFeedSummary }) => {
      setRoundAudit({ availableEvidence, playerFeedSummary });
    };

    if (session?.isLocal) {
      // Local mode: subscribe to localGameManager events
      localGameManager.on('game:state', handleGameState);
      localGameManager.on('player:private-state', handlePrivateState);
      localGameManager.on('crisis:revealed', handleCrisis);
      localGameManager.on('voting:updated', handleVotingUpdated);
      localGameManager.on('voting:revealed', handleVotingRevealed);
      localGameManager.on('evidence:presented', handleEvidencePresented);
      localGameManager.on('round:audit', handleRoundAudit);

      // Immediately join if session exists
      if (session) {
        // emit synthetic join by sending current state
        const state = localGameManager['buildPublicState'] ? undefined : undefined;
      }

      return () => {
        localGameManager.off('game:state', handleGameState);
        localGameManager.off('player:private-state', handlePrivateState);
        localGameManager.off('crisis:revealed', handleCrisis);
        localGameManager.off('voting:updated', handleVotingUpdated);
        localGameManager.off('voting:revealed', handleVotingRevealed);
        localGameManager.off('evidence:presented', handleEvidencePresented);
        localGameManager.off('round:audit', handleRoundAudit);
      };
    }

    // Networked mode: use real socket
    realSocket.on('connect', handleConnect);
    realSocket.on('disconnect', handleDisconnect);
    realSocket.on('game:state', handleGameState);
    realSocket.on('player:private-state', handlePrivateState);
    realSocket.on('crisis:revealed', handleCrisis);
    realSocket.on('voting:updated', handleVotingUpdated);
    realSocket.on('voting:revealed', handleVotingRevealed);
    realSocket.on('evidence:presented', handleEvidencePresented);
    realSocket.on('round:audit', handleRoundAudit);

    if (session && !session.isLocal && !realSocket.connected) {
      realSocket.connect();
    }

    if (session && !session.isLocal && realSocket.connected) {
      realSocket.emit('game:join', {
        gameCode: session.gameCode,
        playerId: session.playerId
      });
    }

    if ((!session || session.isLocal) && realSocket.connected) {
      realSocket.disconnect();
    }

    return () => {
      realSocket.off('connect', handleConnect);
      realSocket.off('disconnect', handleDisconnect);
      realSocket.off('game:state', handleGameState);
      realSocket.off('player:private-state', handlePrivateState);
      realSocket.off('crisis:revealed', handleCrisis);
      realSocket.off('voting:updated', handleVotingUpdated);
      realSocket.off('voting:revealed', handleVotingRevealed);
      realSocket.off('evidence:presented', handleEvidencePresented);
      realSocket.off('round:audit', handleRoundAudit);
    };
  }, [session, setServerStatus, setPublicState, setPrivateState, setCurrentCrisis, setHasVoted, setVotingResults, setSelectedResponseId, addPresentedEvidence, setRoundAudit]);
}

// Export a proxy `socket` object that routes emits to localGameManager in local mode
export const socket = {
  emit(event: string, payload?: any) {
    const session = useAppStore.getState().session;
    if (session?.isLocal) {
      switch (event) {
        case 'game:start':
          localGameManager.startGame(payload?.gameId || session.gameId);
          break;
        case 'host:advance':
          localGameManager.advancePhase(payload?.gameId || session.gameId);
          break;
        default:
          // unsupported in local mode for now
          break;
      }
      return;
    }

    (realSocket as any).emit(event, payload);
  },
  on(event: string, fn: (...args: any[]) => void) {
    const session = useAppStore.getState().session;
    if (session?.isLocal) {
      localGameManager.on(event, fn as any);
      return;
    }
    (realSocket as any).on(event, fn);
  },
  off(event: string, fn: (...args: any[]) => void) {
    const session = useAppStore.getState().session;
    if (session?.isLocal) {
      localGameManager.off(event, fn as any);
      return;
    }
    (realSocket as any).off(event, fn);
  },
  connect() {
    return realSocket.connect();
  },
  disconnect() {
    return realSocket.disconnect();
  }
};