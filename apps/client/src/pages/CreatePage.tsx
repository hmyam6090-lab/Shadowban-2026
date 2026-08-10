import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { createGame } from "../services/api.js";
import { useAppStore } from "../stores/appStore.js";
import { AvatarCanvas } from "../components/common/AvatarCanvas.js";

export function CreatePage() {
  const navigate = useNavigate();
  const setSession = useAppStore((state) => state.setSession);
  const [hostName, setHostName] = useState("");
  const [totalRounds, setTotalRounds] = useState(6);
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
      const result = await createGame(
        hostName.trim(),
        totalRounds,
        avatar || undefined,
      );

      setSession({
        gameId: result.gameId,
        gameCode: result.gameCode,
        playerId: result.playerId,
        playerName: hostName.trim(),
        isHost: true,
      });

      navigate(`/lobby/${result.gameCode}`);
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Unable to create game",
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
          {loading ? "Creating..." : "Create Game"}
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
