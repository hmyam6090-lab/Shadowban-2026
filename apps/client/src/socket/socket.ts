import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';

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

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(getServerUrl(), {
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

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('game:state', handleGameState);
    socket.on('player:private-state', handlePrivateState);
    socket.on('crisis:revealed', handleCrisis);
    socket.on('voting:updated', handleVotingUpdated);
    socket.on('voting:revealed', handleVotingRevealed);
    socket.on('evidence:presented', handleEvidencePresented);
    socket.on('round:audit', handleRoundAudit);

    if (session && !socket.connected) {
      socket.connect();
    }

    if (session && socket.connected) {
      socket.emit('game:join', {
        gameCode: session.gameCode,
        playerId: session.playerId
      });
    }

    if (!session && socket.connected) {
      socket.disconnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('game:state', handleGameState);
      socket.off('player:private-state', handlePrivateState);
      socket.off('crisis:revealed', handleCrisis);
      socket.off('voting:updated', handleVotingUpdated);
      socket.off('voting:revealed', handleVotingRevealed);
      socket.off('evidence:presented', handleEvidencePresented);
      socket.off('round:audit', handleRoundAudit);
    };
  }, [session, setServerStatus, setPublicState, setPrivateState, setCurrentCrisis, setHasVoted, setVotingResults, setSelectedResponseId, addPresentedEvidence, setRoundAudit]);
}

export { socket };