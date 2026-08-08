import type { CrisisPublicDTO, PublicGameState } from '@shadowban/shared';

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

const serverUrl = getServerUrl();

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Request failed');
  }

  return (await response.json()) as T;
}

export async function checkHealth(): Promise<boolean> {
  const response = await fetch(`${serverUrl}/api/health`);

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as { status?: string };
  return payload.status === 'ok';
}

export async function createGame(hostName: string, totalRounds?: number): Promise<{ gameId: string; gameCode: string; playerId: string }> {
  const response = await fetch(`${serverUrl}/api/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ hostName, totalRounds })
  });

  return readJson<{ gameId: string; gameCode: string; playerId: string }>(response);
}

export async function joinGame(gameCode: string, playerName: string): Promise<{ gameId: string; playerId: string }> {
  const response = await fetch(`${serverUrl}/api/games/${gameCode}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ playerName })
  });

  return readJson<{ gameId: string; playerId: string }>(response);
}

export async function fetchGame(gameCode: string): Promise<PublicGameState> {
  const response = await fetch(`${serverUrl}/api/games/${gameCode}`);
  return readJson<PublicGameState>(response);
}

export async function fetchCrises(): Promise<CrisisPublicDTO[]> {
  const response = await fetch(`${serverUrl}/api/crises`);
  return readJson<CrisisPublicDTO[]>(response);
}