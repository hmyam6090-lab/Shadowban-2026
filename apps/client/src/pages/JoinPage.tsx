import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { joinGame } from "../services/api.js";
import { useAppStore } from "../stores/appStore.js";
import { AvatarCanvas } from "../components/common/AvatarCanvas.js";

export function JoinPage() {
  const navigate = useNavigate();
  const setSession = useAppStore((state) => state.setSession);
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showAvatarCanvas, setShowAvatarCanvas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load saved avatar from localStorage
  useEffect(() => {
    const savedAvatar = localStorage.getItem("shadowban_avatar");
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const code = gameCode.trim().toUpperCase();
      const result = await joinGame(
        code,
        playerName.trim(),
        avatar || undefined,
      );

      setSession({
        gameId: result.gameId,
        gameCode: code,
        playerId: result.playerId,
        playerName: playerName.trim(),
        isHost: false,
      });

      navigate(`/lobby/${code}`);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Unable to join game",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarSave(avatarData: string) {
    setAvatar(avatarData);
    localStorage.setItem("shadowban_avatar", avatarData);
    setShowAvatarCanvas(false);
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
        <label>
          Avatar
          <div className="avatar-section">
            {avatar ? (
              <img
                src={avatar}
                alt="Your avatar"
                className="avatar-preview"
                onClick={() => setShowAvatarCanvas(true)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAvatarCanvas(true)}
                className="secondary-btn"
              >
                Create Avatar
              </button>
            )}
          </div>
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
          {loading ? "Joining..." : "Join Game"}
        </button>
      </form>
      {showAvatarCanvas && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create Your Avatar</h3>
            <AvatarCanvas
              onSave={handleAvatarSave}
              initialData={avatar || undefined}
            />
            <button
              type="button"
              onClick={() => setShowAvatarCanvas(false)}
              className="secondary-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
