import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { createGame } from '../services/api.js';
import { useAppStore } from '../stores/appStore.js';

export function CreatePage() {
  const navigate = useNavigate();
  const setSession = useAppStore((state) => state.setSession);
  const [hostName, setHostName] = useState('');
  const [totalRounds, setTotalRounds] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createGame(hostName.trim(), totalRounds);

      setSession({
        gameId: result.gameId,
        gameCode: result.gameCode,
        playerId: result.playerId,
        playerName: hostName.trim(),
        isHost: true
      });

      navigate(`/lobby/${result.gameCode}`);
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : 'Unable to create game'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card form-card">
      <p className="eyebrow">Create</p>
      <h2>Start a new game</h2>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Host name
          <input
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            placeholder="Quan"
          />
        </label>
        <label>
          Total rounds
          <input
            type="number"
            min="2"
            max="6"
            value={totalRounds}
            onChange={(event) => setTotalRounds(Number(event.target.value))}
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || hostName.trim().length === 0}
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </section>
  );
}
