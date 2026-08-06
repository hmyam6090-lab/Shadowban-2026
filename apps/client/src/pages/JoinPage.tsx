import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { joinGame } from '../services/api.js';
import { useAppStore } from '../stores/appStore.js';

export function JoinPage() {
  const navigate = useNavigate();
  const setSession = useAppStore((state) => state.setSession);
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const code = gameCode.trim().toUpperCase();
      const result = await joinGame(code, playerName.trim());

      setSession({
        gameId: result.gameId,
        gameCode: code,
        playerId: result.playerId,
        playerName: playerName.trim(),
        isHost: false
      });

      navigate(`/lobby/${code}`);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : 'Unable to join game'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card form-card">
      <p className="eyebrow">Join</p>
      <h2>Enter a game code</h2>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Game code
          <input
            value={gameCode}
            onChange={(event) => setGameCode(event.target.value.toUpperCase())}
            placeholder="K7P4Q"
            maxLength={5}
          />
        </label>
        <label>
          Player name
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Sarah"
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="submit"
          disabled={
            loading ||
            gameCode.trim().length === 0 ||
            playerName.trim().length === 0
          }
        >
          {loading ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </section>
  );
}
