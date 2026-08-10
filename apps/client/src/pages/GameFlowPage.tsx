import { useEffect, useState } from "react";

import { GamePhase } from "@shadowban/shared";

import { CrisisCard } from "../components/game/CrisisCard.js";
import { GameHeader } from "../components/game/GameHeader.js";
import { InformationCard } from "../components/game/InformationCard.js";
import { PhaseIndicator } from "../components/game/PhaseIndicator.js";
import { PlayerList } from "../components/game/PlayerList.js";
import { ResponseCard } from "../components/game/ResponseCard.js";
import { ScoreBoard } from "../components/game/ScoreBoard.js";
import { Timer } from "../components/game/Timer.js";
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
    subtitle: "Private cards are being dealt.",
  },
  ROLE_ABILITY: {
    title: "Role Ability",
    subtitle: "Hidden abilities can be used now.",
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
  INFORMATION_AUDIT: {
    title: "Information Audit",
    subtitle: "Review what information was available this round.",
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
    // Clear round data when entering a new round
    if (publicState?.phase === GamePhase.CRISIS_REVEAL) {
      clearRoundData();
    }
  }, [publicState?.phase, clearRoundData]);

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

  const handleShadowbanVote = (targetPlayerId: string) => {
    setShadowbanVote(targetPlayerId);
    socket.emit("shadowban:vote", { targetPlayerId });
  };

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
      <GameHeader
        gameCode={publicState.gameCode}
        round={publicState.currentRound}
        totalRounds={publicState.totalRounds}
        phase={phase}
      />
      <div className="game-topline">
        <PhaseIndicator phase={phase} />
        <Timer endsAt={publicState.phaseEndsAt} />
      </div>

      <div className="game-grid">
        <div className="game-main card">
          <div className="game-main-header">
            <p className="eyebrow">{copy.title}</p>
            <h2>{copy.subtitle}</h2>
          </div>

          {phase === "CRISIS_REVEAL" && crisis ? (
            <CrisisCard crisis={crisis} />
          ) : null}

          {phase === "EVIDENCE_PREPARATION" ? (
            <p className="soft-copy">
              The Algorithm is preparing hidden evidence for the round.
            </p>
          ) : null}

          {phase === "DEAL_INFORMATION" ? (
            <div className="card-stack">
              {privateState?.hand?.map((card) => (
                <InformationCard key={card.id} card={card} accent="private" />
              ))}
            </div>
          ) : null}

          {phase === "ROLE_ABILITY" ? (
            <div className="role-panel">
              <h3>{privateState?.role.name ?? "Unassigned Role"}</h3>
              <p>
                {privateState?.role.description ?? "Awaiting role assignment."}
              </p>
              {privateState?.role.abilityName && (
                <>
                  <h4>{privateState.role.abilityName}</h4>
                  <p className="soft-copy">
                    {privateState.role.abilityDescription}
                  </p>
                </>
              )}

              {/* Official: Eyes On You */}
              {privateState?.role.id === "official" &&
              !privateState.abilityUsed &&
              !privateState.shadowbanned ? (
                <div className="role-ability">
                  <h4>Use Ability: Eyes On You</h4>
                  <p className="soft-copy">
                    Select a player to inspect one of their cards.
                  </p>
                  <div className="player-select">
                    <label htmlFor="target-player">
                      Select a player to inspect:
                    </label>
                    <select
                      id="target-player"
                      onChange={(e) => setSelectedTargetPlayer(e.target.value)}
                      value={selectedTargetPlayer || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTargetPlayer &&
                        handleActivateRole(selectedTargetPlayer)
                      }
                      disabled={!selectedTargetPlayer}
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Journalist: On Record */}
              {privateState?.role.id === "journalist" &&
              !privateState.abilityUsed &&
              !privateState.shadowbanned ? (
                <div className="role-ability">
                  <h4>Use Ability: On Record</h4>
                  <p className="soft-copy">
                    Select a player to ask which crisis option they support.
                  </p>
                  <div className="player-select">
                    <label htmlFor="target-player">Select a player:</label>
                    <select
                      id="target-player"
                      onChange={(e) => setSelectedTargetPlayer(e.target.value)}
                      value={selectedTargetPlayer || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <label htmlFor="response-select">
                      Their claimed response:
                    </label>
                    <select
                      id="response-select"
                      onChange={(e) =>
                        setSelectedResponseForAbility(e.target.value)
                      }
                      value={selectedResponseForAbility || ""}
                    >
                      <option value="">-- Select response --</option>
                      {currentCrisis?.responses.map((response) => (
                        <option key={response.id} value={response.id}>
                          {response.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTargetPlayer &&
                        selectedResponseForAbility &&
                        handleActivateRole(
                          selectedTargetPlayer,
                          undefined,
                          selectedResponseForAbility,
                        )
                      }
                      disabled={
                        !selectedTargetPlayer || !selectedResponseForAbility
                      }
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Analyst: Final Call */}
              {privateState?.role.id === "analyst" &&
              !privateState.abilityUsed &&
              !privateState.shadowbanned ? (
                <div className="role-ability">
                  <h4>Use Ability: Final Call</h4>
                  <p className="soft-copy">
                    Commit to a crisis option. Your vote will lock to this
                    choice. If correct, you are protected from the next
                    Shadowban.
                  </p>
                  <div className="player-select">
                    <label htmlFor="response-select">
                      Select your prediction:
                    </label>
                    <select
                      id="response-select"
                      onChange={(e) =>
                        setSelectedResponseForAbility(e.target.value)
                      }
                      value={selectedResponseForAbility || ""}
                    >
                      <option value="">-- Select response --</option>
                      {currentCrisis?.responses.map((response) => (
                        <option key={response.id} value={response.id}>
                          {response.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedResponseForAbility &&
                        handleActivateRole(
                          undefined,
                          undefined,
                          selectedResponseForAbility,
                        )
                      }
                      disabled={!selectedResponseForAbility}
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Investigator: Crosscheck */}
              {privateState?.role.id === "investigator" &&
              !privateState.abilityUsed &&
              !privateState.shadowbanned ? (
                <div className="role-ability">
                  <h4>Use Ability: Crosscheck</h4>
                  <p className="soft-copy">
                    Select two players to compare their factions.
                  </p>
                  <div className="player-select">
                    <label htmlFor="target-player-1">
                      Select first player:
                    </label>
                    <select
                      id="target-player-1"
                      onChange={(e) => setSelectedTargetPlayer(e.target.value)}
                      value={selectedTargetPlayer || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <label htmlFor="target-player-2">
                      Select second player:
                    </label>
                    <select
                      id="target-player-2"
                      onChange={(e) =>
                        setAdditionalTargetPlayer(e.target.value)
                      }
                      value={additionalTargetPlayer || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter(
                          (p) =>
                            p.id !== session?.playerId &&
                            p.id !== selectedTargetPlayer,
                        )
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTargetPlayer &&
                        additionalTargetPlayer &&
                        handleActivateRole(
                          selectedTargetPlayer,
                          additionalTargetPlayer,
                        )
                      }
                      disabled={
                        !selectedTargetPlayer || !additionalTargetPlayer
                      }
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Echo Chamber: Closed Circuit */}
              {privateState?.role.id === "echo_chamber" &&
              !privateState.abilityUsed &&
              !privateState.shadowbanned ? (
                <div className="role-ability">
                  <h4>Use Ability: Closed Circuit</h4>
                  <p className="soft-copy">
                    Select a player. They will choose another player for a
                    30-second private conversation.
                  </p>
                  <div className="player-select">
                    <label htmlFor="target-player">Select a player:</label>
                    <select
                      id="target-player"
                      onChange={(e) => setSelectedTargetPlayer(e.target.value)}
                      value={selectedTargetPlayer || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTargetPlayer &&
                        handleActivateRole(selectedTargetPlayer)
                      }
                      disabled={!selectedTargetPlayer}
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Hacker: Account Breach */}
              {privateState?.role.id === "hacker" &&
              !privateState.abilityUsed &&
              !privateState.shadowbanned ? (
                <div className="role-ability">
                  <h4>Use Ability: Account Breach</h4>
                  <p className="soft-copy">
                    Select a player to reveal their role, a card, and their
                    Analyst prediction.
                  </p>
                  <div className="player-select">
                    <label htmlFor="target-player">
                      Select a player to breach:
                    </label>
                    <select
                      id="target-player"
                      onChange={(e) => setSelectedTargetPlayer(e.target.value)}
                      value={selectedTargetPlayer || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTargetPlayer &&
                        handleActivateRole(selectedTargetPlayer)
                      }
                      disabled={!selectedTargetPlayer}
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Algorithm: For You */}
              {privateState?.role.id === "algorithm" &&
              !privateState.abilityUsed &&
              !privateState.shadowbanned ? (
                <div className="role-ability">
                  <h4>Use Ability: For You</h4>
                  <p className="soft-copy">
                    Select a player to secretly give them an additional
                    Information Card.
                  </p>
                  <div className="player-select">
                    <label htmlFor="target-player">Select a player:</label>
                    <select
                      id="target-player"
                      onChange={(e) => setSelectedTargetPlayer(e.target.value)}
                      value={selectedTargetPlayer || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTargetPlayer &&
                        handleActivateRole(selectedTargetPlayer)
                      }
                      disabled={!selectedTargetPlayer}
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {privateState?.shadowbanned ? (
                <p className="soft-copy">
                  You are shadowbanned and cannot use abilities.
                </p>
              ) : null}

              {privateState?.abilityUsed && !privateState.shadowbanned ? (
                <p className="soft-copy">Ability already used this round.</p>
              ) : null}

              {privateState?.privateInspectionResults &&
              privateState.privateInspectionResults.length > 0 ? (
                <div className="inspection-results">
                  <h4>Ability Results</h4>
                  {privateState.privateInspectionResults.map(
                    (result, index) => {
                      // Parse special result formats
                      if (result.startsWith("JOURNALIST_CLAIM:")) {
                        const parts = result.split(":");
                        const targetPlayerId = parts[1];
                        const responseId = parts[2];
                        const targetPlayer = publicState.players.find(
                          (p) => p.id === targetPlayerId,
                        );
                        const response = currentCrisis?.responses.find(
                          (r) => r.id === responseId,
                        );
                        return (
                          <div key={result} className="inspection-card">
                            <p className="soft-copy">
                              <strong>{targetPlayer?.name}</strong> claims to
                              support:{" "}
                              {response?.label || responseId || "No response"}
                            </p>
                          </div>
                        );
                      }
                      if (result.startsWith("CROSSCHECK:")) {
                        const parts = result.split(":");
                        const player1Id = parts[1];
                        const player2Id = parts[2];
                        const relation = parts[3];
                        const player1 = publicState.players.find(
                          (p) => p.id === player1Id,
                        );
                        const player2 = publicState.players.find(
                          (p) => p.id === player2Id,
                        );
                        return (
                          <div key={result} className="inspection-card">
                            <p className="soft-copy">
                              <strong>{player1?.name}</strong> and{" "}
                              <strong>{player2?.name}</strong> are on the{" "}
                              <strong>{relation}</strong>
                            </p>
                          </div>
                        );
                      }
                      if (result.startsWith("CLOSED_CIRCUIT:")) {
                        const targetPlayerId = result.split(":")[1];
                        const targetPlayer = publicState.players.find(
                          (p) => p.id === targetPlayerId,
                        );
                        return (
                          <div key={result} className="inspection-card">
                            <p className="soft-copy">
                              <strong>{targetPlayer?.name}</strong> must now
                              choose another player for a 30-second private
                              conversation.
                            </p>
                          </div>
                        );
                      }
                      if (result.startsWith("ACCOUNT_BREACH:")) {
                        const parts = result.split(":");
                        const targetPlayerId = parts[1];
                        const roleId = parts[2];
                        const cardId = parts[3];
                        const prediction = parts[4];
                        const targetPlayer = publicState.players.find(
                          (p) => p.id === targetPlayerId,
                        );
                        const role = privateState.role; // This would need to be fetched from role service
                        return (
                          <div key={result} className="inspection-card">
                            <p className="soft-copy">
                              <strong>{targetPlayer?.name}</strong> was
                              breached:
                            </p>
                            <p className="soft-copy">Role: {roleId}</p>
                            <p className="soft-copy">
                              Card: {cardId === "NO_CARD" ? "No card" : cardId}
                            </p>
                            <p className="soft-copy">
                              Analyst Prediction:{" "}
                              {prediction === "NO_PREDICTION"
                                ? "None"
                                : prediction}
                            </p>
                            {privateState.accountBreached && (
                              <p className="soft-copy" style={{ color: "red" }}>
                                YOUR ACCOUNT WAS BREACHED
                              </p>
                            )}
                          </div>
                        );
                      }
                      // Default card display
                      return (
                        <div key={result} className="inspection-card">
                          <p className="soft-copy">
                            Result {index + 1}: {result}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === "DISCUSSION" ? (
            <div className="discussion-panel">
              <p className="soft-copy">
                Public evidence is visible to everyone. Encourage players to put
                their phones down.
              </p>
              {currentCrisis ? <CrisisCard crisis={currentCrisis} /> : null}

              {privateState?.hand && privateState.hand.length > 0 && (
                <div className="card-stack">
                  <h4>Your Private Cards</h4>
                  <p className="soft-copy">
                    Present up to 2 cards to share with the group. (
                    {privateState.presentedCardIds?.length || 0}/2 presented)
                  </p>
                  {privateState.hand.map((card) => (
                    <div key={card.id} className="card-with-action">
                      <InformationCard card={card} accent="private" />
                      <button
                        type="button"
                        onClick={() => handlePresentEvidence(card.id)}
                        disabled={
                          privateState.presentedCardIds?.includes(card.id) ||
                          (privateState.presentedCardIds?.length || 0) >= 2
                        }
                      >
                        {privateState.presentedCardIds?.includes(card.id)
                          ? "Presented"
                          : "Present"}
                      </button>
                    </div>
                  ))}
                </div>
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

          {phase === "SHADOWBAN" ? (
            <div className="shadowban-panel">
              <h3>Shadowban Phase</h3>
              <p className="soft-copy">
                Vote to eliminate a player you suspect is working for the
                Algorithm.
              </p>
              {privateState?.shadowbanned ? (
                <p className="soft-copy">
                  You are shadowbanned and cannot vote.
                </p>
              ) : (
                <>
                  <div className="player-select">
                    <label htmlFor="shadowban-target">
                      Select a player to shadowban:
                    </label>
                    <select
                      id="shadowban-target"
                      onChange={(e) => setShadowbanVote(e.target.value)}
                      value={shadowbanVote || ""}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .filter((p) => {
                          const playerState = privateState;
                          // Can't shadowban protected players
                          return !playerState?.protectedFromShadowban;
                        })
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        shadowbanVote && handleShadowbanVote(shadowbanVote)
                      }
                      disabled={!shadowbanVote}
                    >
                      Submit Shadowban Vote
                    </button>
                  </div>
                  {shadowbanVote && (
                    <p className="soft-copy">
                      Your vote has been submitted for:{" "}
                      {
                        publicState.players.find((p) => p.id === shadowbanVote)
                          ?.name
                      }
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}

          {phase === "INFORMATION_AUDIT" ? (
            <div className="information-audit-panel">
              <h3>Information Audit</h3>
              <p className="soft-copy">
                Review what information was available this round vs. what you
                saw.
              </p>
              {roundAudit && (
                <>
                  <div className="audit-summary">
                    <h4>Round Summary</h4>
                    <p className="soft-copy">
                      Total evidence available:{" "}
                      {roundAudit.availableEvidence.length}
                    </p>
                    <p className="soft-copy">
                      Evidence never shown:{" "}
                      {roundAudit.availableEvidence.length -
                        (roundAudit.playerFeedSummary?.reduce(
                          (sum: number, p: any) => sum + p.cardsSeen,
                          0,
                        ) || 0)}
                    </p>
                  </div>
                  <div className="player-feeds">
                    <h4>Player Information Feeds</h4>
                    {roundAudit.playerFeedSummary?.map((summary: any) => (
                      <div key={summary.playerId} className="player-feed">
                        <p className="eyebrow">{summary.playerName}</p>
                        <p>Cards seen: {summary.cardsSeen}</p>
                        <p>
                          Supporting correct response:{" "}
                          {summary.supportingCorrect}
                        </p>
                        <p>
                          Supporting incorrect responses:{" "}
                          {summary.supportingIncorrect}
                        </p>
                        <p>Noise cards: {summary.noiseSeen}</p>
                      </div>
                    ))}
                  </div>
                  <div className="available-evidence">
                    <h4>All Available Evidence</h4>
                    <div className="card-stack">
                      {roundAudit.availableEvidence.map((card) => (
                        <InformationCard
                          key={card.id}
                          card={card}
                          accent="public"
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {phase === "RESOLUTION" ? (
            <div className="resolution-panel">
              <h3>Round resolved</h3>
              <ScoreBoard
                societyScore={publicState.societyScore}
                algorithmScore={publicState.algorithmScore}
                societyWins={publicState.societyWins}
                algorithmWins={publicState.algorithmWins}
              />

              {votingResults && votingResults.length > 0 && (
                <div className="voting-results">
                  <h4>Voting Results</h4>
                  {votingResults.map((result) => {
                    const response = currentCrisis?.responses.find(
                      (r) => r.id === result.responseId,
                    );
                    return (
                      <div key={result.responseId} className="vote-result">
                        <span>{response?.label || result.responseId}:</span>
                        <span className="vote-count">{result.votes} votes</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {roundAudit && (
                <div className="information-audit">
                  <h4>Information Audit</h4>
                  <p className="soft-copy">
                    What information was available vs. what you saw:
                  </p>

                  {roundAudit.playerFeedSummary &&
                    roundAudit.playerFeedSummary.length > 0 && (
                      <div className="player-feeds">
                        <h5>Player Information Feeds</h5>
                        {roundAudit.playerFeedSummary.map((summary) => (
                          <div key={summary.playerId} className="player-feed">
                            <p className="eyebrow">{summary.playerName}</p>
                            <p>Cards seen: {summary.cardsSeen}</p>
                            <p>
                              Supporting correct response:{" "}
                              {summary.supportingCorrect}
                            </p>
                            <p>
                              Supporting incorrect responses:{" "}
                              {summary.supportingIncorrect}
                            </p>
                            <p>Noise cards: {summary.noiseSeen}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  {roundAudit.availableEvidence &&
                    roundAudit.availableEvidence.length > 0 && (
                      <div className="available-evidence">
                        <h5>All Available Evidence</h5>
                        <div className="card-stack">
                          {roundAudit.availableEvidence.map((card) => (
                            <InformationCard
                              key={card.id}
                              card={card}
                              accent="public"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          ) : null}

          {phase === "GAME_END" ? (
            <div className="resolution-panel">
              <h3>Game complete</h3>
              <ScoreBoard
                societyScore={publicState.societyScore}
                algorithmScore={publicState.algorithmScore}
              />
            </div>
          ) : null}

          {isHost && phase !== "GAME_END" ? (
            <button type="button" onClick={() => socket.emit("host:advance")}>
              Advance Phase
            </button>
          ) : null}
        </div>

        <aside className="game-side stack">
          <ScoreBoard
            societyScore={publicState.societyScore}
            algorithmScore={publicState.algorithmScore}
          />
          <article className="card">
            <h3>Players</h3>
            <PlayerList
              players={publicState.players}
              hostPlayerId={publicState.hostPlayerId}
            />
          </article>
          {crisis ? (
            <article className="card">
              <h3>Responses</h3>
              <div className="response-list">
                {crisis.responses.map((response) => (
                  <ResponseCard
                    key={response.id}
                    response={response}
                    selected={false}
                  />
                ))}
              </div>
            </article>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
