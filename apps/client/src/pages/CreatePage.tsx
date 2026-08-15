import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { createGame } from "../services/api.js";
import { useAppStore } from "../stores/appStore.js";
import { EmojiAvatarSelector } from "../components/common/EmojiAvatarSelector.js";

export function CreatePage() {
  const navigate = useNavigate();
  const setSession = useAppStore((state) => state.setSession);
  const [hostName, setHostName] = useState("");
  const [totalRounds, setTotalRounds] = useState(6);
  const [avatar, setAvatar] = useState<string | null>(null);
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

  function handleAvatarSelect(emoji: string) {
    setAvatar(emoji);
    localStorage.setItem("shadowban_avatar", emoji);
  }

  return (
    <div className="page-layout">
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
            <EmojiAvatarSelector
              selectedAvatar={avatar}
              onSelect={handleAvatarSelect}
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
            {loading ? "Creating..." : "Create Game"}
          </button>
        </form>
      </section>
    </div>
  );
}
