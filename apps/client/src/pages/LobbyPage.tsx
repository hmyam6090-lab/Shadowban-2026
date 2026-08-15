import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { socket } from "../socket/socket.js";
import { useAppStore } from "../stores/appStore.js";
import { ConnectionStatus } from "../components/common/ConnectionStatus.js";
import { PlayerList } from "../components/game/PlayerList.js";
import { GameHeader } from "../components/game/GameHeader.js";
import { GameSidebar } from "../components/game/GameSidebar.js";
import { GamePhase } from "@shadowban/shared";

export function LobbyPage() {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((state) => state.session);
  const publicState = useAppStore((state) => state.publicState);
  const currentCrisis = useAppStore((state) => state.currentCrisis);
  const setCurrentCrisis = useAppStore((state) => state.setCurrentCrisis);
  const serverStatus = useAppStore((state) => state.serverStatus);

  useEffect(() => {
    if (!gameCode) {
      return;
    }

    if (session && session.gameCode === gameCode) {
      socket.emit("game:join", { gameCode, playerId: session.playerId });
      return;
    }

    navigate("/join");
  }, [gameCode, navigate, session]);

  useEffect(() => {
    if (!publicState?.currentCrisisId) {
      setCurrentCrisis(undefined);
    }
  }, [publicState?.currentCrisisId, setCurrentCrisis]);

  if (!publicState) {
    return (
      <section className="card">
        <p className="eyebrow">Lobby</p>
        <h2>Loading room...</h2>
      </section>
    );
  }

  const isHost = session?.playerId === publicState.hostPlayerId;
  const me = publicState.players.find(
    (player) => player.id === session?.playerId,
  );

  return (
    <section className="game-layout">
      <GameSidebar
        currentPhase={GamePhase.LOBBY}
        onNavigate={(targetPhase) => {
          // Navigation is controlled by game state, not manual selection
          // This is for visual indication only
        }}
      />
      <div className="game-main-container">
        <div className="game-grid">
          <article className="card room-card">
            <p className="eyebrow">Lobby</p>
            <h2>Game Code: {publicState.gameCode}</h2>
            <p>{session?.playerName ?? "Player"} is in the room.</p>
            <ConnectionStatus status={serverStatus} />
            <div className="stack compact">
              <button type="button" onClick={() => socket.emit("game:ready")}>
                {me?.ready ? "Mark Not Ready" : "Mark Ready"}
              </button>
              {isHost ? (
                <button type="button" onClick={() => socket.emit("game:start")}>
                  START GAME
                </button>
              ) : null}
            </div>
            {currentCrisis ? (
              <p className="lobby-crisis">Next crisis: {currentCrisis.name}</p>
            ) : (
              <p className="lobby-crisis">
                Waiting for the host to begin the first round.
              </p>
            )}
          </article>

          <article className="card">
            <h3>Players</h3>
            <PlayerList
              players={publicState.players}
              hostPlayerId={publicState.hostPlayerId}
            />
          </article>
        </div>
      </div>
    </section>
  );
}
