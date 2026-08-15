import { useEffect, useState } from "react";

import { GamePhase } from "@shadowban/shared";

import { CrisisCard } from "../components/game/CrisisCard.js";
import { GameHeader } from "../components/game/GameHeader.js";
import { GameSidebar } from "../components/game/GameSidebar.js";
import { InformationCard } from "../components/game/InformationCard.js";
import { InformationCardCarousel } from "../components/game/InformationCardCarousel.js";
import { PhaseIndicator } from "../components/game/PhaseIndicator.js";
import { PlayerList } from "../components/game/PlayerList.js";
import { ResponseCard } from "../components/game/ResponseCard.js";
import { ScoreBoard } from "../components/game/ScoreBoard.js";
import { Timer } from "../components/game/Timer.js";
import { AvatarVotingDisplay } from "../components/game/AvatarVotingDisplay.js";
import { AvatarVoteSelector } from "../components/game/AvatarVoteSelector.js";
import { ChatPanel } from "../components/game/ChatPanel.js";
import { RoleReveal } from "../components/game/RoleReveal.js";
import { CountdownOverlay } from "../components/game/CountdownOverlay.js";
import { socket } from "../socket/socket.js";
import { useAppStore } from "../stores/appStore.js";

const phaseCopy: Record<GamePhase, { title: string; subtitle: string }> = {
  LOBBY: {
    title: "Lobby",
    subtitle: "Waiting for the host to start the game.",
  },
  CRISIS_REVEAL: {
    title: "Crisis Reveal",
    subtitle: "Read the crisis and prepare the table.",
  },
  EVIDENCE_PREPARATION: {
    title: "Evidence Preparation",
    subtitle: "The table is being prepared.",
  },
  DEAL_INFORMATION: {
    title: "Deal Information",
    subtitle: "Review your information cards.",
  },
  ABILITY: {
    title: "Ability Phase",
    subtitle: "Use your role ability if you wish.",
  },
  DISCUSSION: {
    title: "Discussion",
    subtitle: "Put the phones down and talk it through.",
  },
  VOTING: {
    title: "Voting",
    subtitle: "Vote privately for the best response.",
  },
  RESOLUTION: {
    title: "Resolution",
    subtitle: "The round result is being revealed.",
  },
  SHADOWBAN: {
    title: "Shadowban",
    subtitle: "Vote to eliminate a player from the game.",
  },
  GAME_END: { title: "Game End", subtitle: "The final score is locked." },
};

export function GameFlowPage() {
  const session = useAppStore((state) => state.session);
  const publicState = useAppStore((state) => state.publicState);
  const privateState = useAppStore((state) => state.privateState);
  const currentCrisis = useAppStore((state) => state.currentCrisis);
  const hasVoted = useAppStore((state) => state.hasVoted);
  const votingResults = useAppStore((state) => state.votingResults);
  const selectedResponseId = useAppStore((state) => state.selectedResponseId);
  const setSelectedResponseId = useAppStore(
    (state) => state.setSelectedResponseId,
  );
  const presentedEvidence = useAppStore((state) => state.presentedEvidence);
  const roundAudit = useAppStore((state) => state.roundAudit);
  const clearRoundData = useAppStore((state) => state.clearRoundData);

  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<
    string | null
  >(null);
  const [additionalTargetPlayer, setAdditionalTargetPlayer] = useState<
    string | null
  >(null);
  const [selectedResponseForAbility, setSelectedResponseForAbility] = useState<
    string | null
  >(null);
  const [shadowbanVote, setShadowbanVote] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"phases" | "role">(
    "phases",
  );
  const [shadowbannedPlayer, setShadowbannedPlayer] = useState<{
    id: string | null;
    name: string | null;
  }>({ id: null, name: null });
  const [chatMessages, setChatMessages] = useState<
    Array<{
      playerId: string;
      playerName: string;
      playerAvatar?: string;
      message: string;
      timestamp: number;
    }>
  >([]);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [hasSeenRoleReveal, setHasSeenRoleReveal] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasSeenCountdown, setHasSeenCountdown] = useState(false);
  const [abilityResult, setAbilityResult] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    socket.emit("game:join", {
      gameCode: session.gameCode,
      playerId: session.playerId,
    });
  }, [session]);

  useEffect(() => {
    // Show countdown when game starts (phase changes from LOBBY)
    if (
      !hasSeenCountdown &&
      publicState &&
      publicState.phase !== GamePhase.LOBBY &&
      publicState.phase === GamePhase.CRISIS_REVEAL
    ) {
      setShowCountdown(true);
      setHasSeenCountdown(true);
    }
  }, [publicState, hasSeenCountdown]);

  useEffect(() => {
    // Show role reveal only once after countdown completes (not every phase)
    if (
      privateState?.role &&
      !hasSeenRoleReveal &&
      !showCountdown &&
      hasSeenCountdown // Only show after countdown has been seen
    ) {
      setShowRoleReveal(true);
      setHasSeenRoleReveal(true);
    }
  }, [privateState?.role, hasSeenRoleReveal, showCountdown, hasSeenCountdown]);

  useEffect(() => {
    // Clear round data when entering a new round
    if (publicState && publicState.phase === GamePhase.CRISIS_REVEAL) {
      clearRoundData();
    }
  }, [publicState, clearRoundData]);

  const handleVote = (responseId: string) => {
    setSelectedVote(responseId);
    socket.emit("vote:submit", { responseId });
  };

  const handlePresentEvidence = (cardId: string) => {
    socket.emit("evidence:present", { cardId });
  };

  const handleActivateRole = (
    targetPlayerId?: string,
    additionalTargetId?: string,
    responseId?: string,
  ) => {
    socket.emit("role:activate", {
      targetPlayerId,
      additionalTargetId,
      responseId,
    });
  };

  const handleLeaveGame = () => {
    socket.emit("game:leave");
    useAppStore.getState().clearSession();
    window.location.href = "/";
  };

  const handleShadowbanVote = (targetPlayerId: string) => {
    setShadowbanVote(targetPlayerId);
    socket.emit("shadowban:vote", { targetPlayerId });
  };

  const handleSendChatMessage = (message: string) => {
    if (session) {
      socket.emit("chat:send", { message });
    }
  };

  const handleCardClick = (cardId: string) => {
    // Handle card click - could open a modal or show full card
    console.log("Card clicked:", cardId);
  };

  useEffect(() => {
    const handleChatMessage = (data: {
      playerId: string;
      playerName: string;
      playerAvatar?: string;
      message: string;
      timestamp: number;
      cardId?: string;
      cardImage?: string;
    }) => {
      setChatMessages((prev) => [...prev, data]);
    };

    const handleShadowbanResolved = (data: {
      shadowbannedPlayerId: string | null;
      shadowbannedPlayerName?: string | null;
    }) => {
      setShadowbannedPlayer({
        id: data.shadowbannedPlayerId,
        name: data.shadowbannedPlayerName || null,
      });
    };

    const handleAbilityResult = (data: {
      playerId: string;
      roleId: string;
      abilityName: string;
      result: string;
      details?: any;
    }) => {
      // Show ability result in the ability phase panel
      setAbilityResult(data.result);
      console.log("Ability result:", data);
    };

    const handleEvidencePresented = (data: {
      playerId: string;
      card: { id: string; image?: string };
    }) => {
      // Add presented evidence as a chat message with card image
      const player = publicState?.players.find((p) => p.id === data.playerId);
      setChatMessages((prev) => [
        ...prev,
        {
          playerId: data.playerId,
          playerName: player?.name || "Unknown",
          playerAvatar: player?.avatar,
          message: "",
          timestamp: Date.now(),
          cardId: data.card.id,
          cardImage: data.card.image || "",
        },
      ]);
    };

    socket.on("chat:message", handleChatMessage);
    socket.on("shadowban:resolved", handleShadowbanResolved);
    socket.on("ability:result", handleAbilityResult);
    socket.on("evidence:presented", handleEvidencePresented);

    return () => {
      socket.off("chat:message", handleChatMessage);
      socket.off("shadowban:resolved", handleShadowbanResolved);
      socket.off("ability:result", handleAbilityResult);
      socket.off("evidence:presented", handleEvidencePresented);
    };
  }, []);

  if (!publicState) {
    return (
      <section className="card">
        <p className="eyebrow">Game</p>
        <h2>Loading game state...</h2>
      </section>
    );
  }

  const phase = publicState.phase;
  const copy = phaseCopy[phase];
  const crisis = currentCrisis;
  const isHost = session?.playerId === publicState.hostPlayerId;

  return (
    <section className="game-layout">
      {showCountdown && (
        <CountdownOverlay onComplete={() => setShowCountdown(false)} />
      )}
      {showRoleReveal && privateState?.role && (
        <RoleReveal
          role={privateState.role}
          onComplete={() => setShowRoleReveal(false)}
        />
      )}
      <GameSidebar
        currentPhase={phase}
        onNavigate={(targetPhase) => {
          // Navigation is controlled by game state, not manual selection
          // This is for visual indication only
        }}
        role={privateState?.role}
        abilityUsed={privateState?.abilityUsed}
        shadowbanned={privateState?.shadowbanned}
        onUseAbility={() => {
          socket.emit("role:activate", {});
        }}
        activeTab={activeSidebarTab}
        onTabChange={setActiveSidebarTab}
        publicState={publicState}
        privateState={privateState}
        currentCrisis={currentCrisis}
        selectedVote={selectedVote}
        onVote={handleVote}
        hasVoted={hasVoted}
      />
      <div className="game-main-container">
        <div className="game-grid">
          <div className="game-main card">
            <div className="game-main-header">
              <div className="header-left">
                <p className="eyebrow">{copy.title}</p>
                <h2>{copy.subtitle}</h2>
                {shadowbannedPlayer.name && (
                  <p className="shadowban-announcement">
                    {shadowbannedPlayer.name} was shadowbanned!
                  </p>
                )}
              </div>
              <div className="header-buttons">
                {publicState.phaseEndsAt && (
                  <div className="timer-box">
                    <Timer
                      endsAt={publicState.phaseEndsAt}
                      onExpire={() => isHost && socket.emit("host:advance")}
                    />
                  </div>
                )}
                <button
                  className="leave-game-btn"
                  onClick={handleLeaveGame}
                  title="Leave Game"
                >
                  🚪 Leave
                </button>
                {!privateState?.shadowbanned && (
                  <button
                    className="phase-ready-btn"
                    onClick={() => socket.emit("phase:ready")}
                    disabled={privateState?.phaseReady}
                  >
                    {privateState?.phaseReady ? "Ready" : "Mark Ready"}
                  </button>
                )}
              </div>
            </div>

            {phase === "CRISIS_REVEAL" && crisis ? (
              <CrisisCard crisis={crisis} />
            ) : null}

            {phase === "VOTING" && crisis ? (
              <CrisisCard crisis={crisis} showResponses={false} />
            ) : null}

            {phase === "VOTING" ? (
              <div className="vote-panel">
                <h3>Vote privately for the best response.</h3>
                {hasVoted ? (
                  <p className="soft-copy">Your vote has been submitted.</p>
                ) : (
                  <p className="soft-copy">Select a response to vote.</p>
                )}
                {crisis?.responses.map((response) => (
                  <ResponseCard
                    key={response.id}
                    response={response}
                    selected={selectedVote === response.id}
                    onClick={() => !hasVoted && handleVote(response.id)}
                    disabled={hasVoted}
                  />
                ))}
              </div>
            ) : null}

            {phase === "EVIDENCE_PREPARATION" ? (
              <p className="soft-copy">
                The Algorithm is preparing hidden evidence for the round.
              </p>
            ) : null}

            {phase === "DEAL_INFORMATION" ? (
              <InformationCardCarousel
                cards={privateState?.hand || []}
                disabled={privateState?.shadowbanned}
              />
            ) : null}

            {phase === "ABILITY" ? (
              <div className="ability-phase-panel">
                <p className="soft-copy">
                  You may use your role ability during this phase.
                </p>
                {privateState?.role && (
                  <div className="ability-card">
                    <h4>{privateState.role.name}</h4>
                    <p className="ability-name">
                      {privateState.role.abilityName}
                    </p>
                    <p className="ability-description">
                      {privateState.role.abilityDescription}
                    </p>
                    {abilityResult && (
                      <div className="ability-result-feedback">
                        <p className="result-text">{abilityResult}</p>
                      </div>
                    )}
                    <button
                      className="ability-btn"
                      onClick={() => handleActivateRole()}
                      disabled={
                        privateState.abilityUsed || privateState.shadowbanned
                      }
                    >
                      {privateState.abilityUsed
                        ? "Ability Used"
                        : privateState.shadowbanned
                          ? "Shadowbanned"
                          : "Use Ability"}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {phase === "DISCUSSION" ? (
              <div className="discussion-panel">
                <p className="soft-copy">
                  Public evidence is visible to everyone. Encourage players to
                  put their phones down.
                </p>
                {currentCrisis ? <CrisisCard crisis={currentCrisis} /> : null}

                {publicState.publicAnnouncements &&
                  publicState.publicAnnouncements.length > 0 && (
                    <div className="public-announcements">
                      <h4>📢 Announcements</h4>
                      {publicState.publicAnnouncements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className={`announcement ${announcement.type}`}
                        >
                          <p className="announcement-message">
                            {announcement.message}
                          </p>
                          <span className="announcement-time">
                            {new Date(
                              announcement.timestamp,
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                {privateState?.hand && privateState.hand.length > 0 && (
                  <InformationCardCarousel
                    cards={privateState.hand}
                    onPresent={(cardId) =>
                      socket.emit("evidence:present", { cardId })
                    }
                    showPresentButton={true}
                    disabled={privateState.shadowbanned}
                    presentedCardIds={privateState.presentedCardIds || []}
                    maxPresented={2}
                  />
                )}

                {presentedEvidence.length > 0 && (
                  <div className="presented-evidence">
                    <h4>Presented Evidence</h4>
                    {presentedEvidence.map((evidence, index) => (
                      <div
                        key={`${evidence.playerId}-${index}`}
                        className="presented-card"
                      >
                        <p className="eyebrow">
                          {publicState.players.find(
                            (p) => p.id === evidence.playerId,
                          )?.name || "Unknown"}
                        </p>
                        <InformationCard card={evidence.card} accent="public" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {phase === "SHADOWBAN" ? (
              <div className="shadowban-panel">
                <AvatarVoteSelector
                  players={publicState.players.filter(
                    (p) => p.id !== session?.playerId,
                  )}
                  votes={publicState.shadowbanVotes}
                  onVote={(targetPlayerId) => {
                    setShadowbanVote(targetPlayerId);
                    socket.emit("shadowban:vote", { targetPlayerId });
                  }}
                  disabled={privateState?.shadowbanned}
                />
              </div>
            ) : null}

            {phase === "RESOLUTION" && crisis ? (
              <div className="resolution-panel">
                <h3>Round resolved</h3>
                <div className="correct-answer">
                  <p className="correct-answer-label">Correct Response:</p>
                  <p className="correct-answer-value">
                    {crisis.responses.find(
                      (r) => r.id === crisis.correctResponseId,
                    )?.label || "Unknown"}
                  </p>
                </div>
                <AvatarVotingDisplay
                  responses={crisis.responses}
                  votes={publicState.votes}
                  players={publicState.players}
                  selectedResponseId={selectedResponseId}
                />
              </div>
            ) : null}

            {phase === "GAME_END" ? (
              <div className="resolution-panel">
                <h3>Game complete</h3>
              </div>
            ) : null}

            {isHost && phase !== "GAME_END" ? (
              <button type="button" onClick={() => socket.emit("host:advance")}>
                Advance Phase
              </button>
            ) : null}
          </div>

          <aside className="game-side stack">
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              disabled={privateState?.shadowbanned}
              currentPhase={copy.title}
              onCardClick={handleCardClick}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
