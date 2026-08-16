import { useState, useEffect } from "react";
import type {
  RoleDefinition,
  PublicPlayer,
  PublicInformationCard,
} from "@shadowban/shared";

export interface AbilityFlowProps {
  role: RoleDefinition;
  players: PublicPlayer[];
  onClose: () => void;
  onAction: (action: string, data: any) => void;
  crisisResponses?: any[];
  currentPhase?: string;
  targetHandCards?: any[] | null;
  abilityResultData?: any | null;
  currentPlayerId?: string | null;
}

type FlowStep =
  | "select"
  | "confirm"
  | "result"
  | "complete"
  | "card_reveal"
  | "breach_anim"
  | "crosscheck_result"
  | "card_spy";

export function AbilityFlow({
  role,
  players,
  onClose,
  onAction,
  crisisResponses,
  currentPhase,
  targetHandCards: initialTargetHandCards = null,
  abilityResultData = null,
  currentPlayerId = null,
  currentVote = null,
  analystPrediction = null,
  protectedFromShadowban = false,
}: AbilityFlowProps) {
  const [step, setStep] = useState<FlowStep>("select");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [inspectedCard, setInspectedCard] =
    useState<PublicInformationCard | null>(null);
  const [abilityDetails, setAbilityDetails] = useState<any>(null);
  const [breachProgress, setBreachProgress] = useState(0);
  const [targetHandCards, setTargetHandCards] = useState<any[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null,
  );
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  const handleSelectTarget = (playerId: string) => {
    if (role.id === "investigator") {
      // Investigator needs 2 targets
      if (selectedTargets.length < 2 && !selectedTargets.includes(playerId)) {
        setSelectedTargets([...selectedTargets, playerId]);
      }
    } else if (role.id === "official") {
      // Government Official - select a player to inspect (server will reveal a random card)
      setSelectedTargets([playerId]);
      setStep("confirm");
    } else if (role.id === "journalist") {
      // Journalist - select player then response
      setSelectedTargets([playerId]);
      setStep("confirm");
    } else {
      // Most abilities need 1 target
      setSelectedTargets([playerId]);
      if (role.id === "hacker") {
        // Immediately perform the breach when the hacker selects a target.
        // This ensures the server only resolves the target role after the
        // player has actively chosen whom to breach.
        onAction("breach", { targetId: playerId });
        setStep("breach_anim");
        // start breach animation progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setBreachProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setStep("result");
          }
        }, 100);
      }
    }
  };

  const handleSetPlayerHand = (cards: any[]) => {
    setTargetHandCards(cards);
  };

  const handleCardSelect = (cardIndex: number) => {
    setSelectedCardIndex(cardIndex);
    onAction("spy_card", {
      targetId: selectedTargets[0],
      cardIndex,
    });
    setStep("card_reveal");
  };

  // Sync incoming hand cards from parent/socket
  useEffect(() => {
    if (initialTargetHandCards && initialTargetHandCards.length > 0) {
      setTargetHandCards(initialTargetHandCards);
    }
  }, [initialTargetHandCards]);

  // Listen for incoming ability result data that matches our selected target
  useEffect(() => {
    if (!abilityResultData) return;
    const details = abilityResultData.details || {};
    // Match by targetId when present
    if (
      details.targetId &&
      selectedTargets[0] &&
      details.targetId === selectedTargets[0]
    ) {
      setAbilityDetails(details);
      // if we're on reveal step, ensure result shows
      if (step === "breach_anim" || step === "card_reveal") {
        // leave the step handling; result will render when available
      }
    }
    // Some abilities may return role info without targetId; if this result is for the current player (actor), accept it
    else if (
      abilityResultData.playerId &&
      abilityResultData.playerId === currentPlayerId &&
      details.role
    ) {
      setAbilityDetails(details);
    }
  }, [abilityResultData, selectedTargets, step]);

  const handleSelectAlgorithm = (algorithmId: string) => {
    onAction("select_algorithm", { algorithmId });
    setStep("result");
  };

  const handleConfirm = () => {
    // Map confirmation to server actions per role
    switch (role.id) {
      case "official":
        // Official: request the target player's hand so the user can pick a card to inspect
        onAction("get_player_hand", { targetId: selectedTargets[0] });
        setStep("card_spy");
        break;
      case "hacker":
        onAction("breach", { targetId: selectedTargets[0] });
        setStep("breach_anim");
        // Simulate breach animation
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setBreachProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setStep("result");
          }
        }, 100);
        break;
      case "investigator":
        onAction("crosscheck", { targetIds: selectedTargets });
        setStep("crosscheck_result");
        break;
      default:
        setStep("result");
        break;
    }
  };

  const handleComplete = () => {
    onClose();
  };

  const handleAction = (action: string, data: any) => {
    console.log("Ability action:", action, data);
    onAction(action, data);
  };

  const handleReset = () => {
    setStep("select");
    setSelectedTargets([]);
    setResult(null);
    setInspectedCard(null);
    setBreachProgress(0);
  };

  const renderStep = () => {
    switch (step) {
      case "select":
        return renderSelectStep();
      case "confirm":
        return renderConfirmStep();
      case "result":
        return renderResultStep();
      case "card_spy":
        return renderCardSpyStep();
      case "card_reveal":
        return renderCardRevealStep();
      case "breach_anim":
        return renderBreachAnimationStep();
      case "crosscheck_result":
        return renderCrosscheckResultStep();
      case "complete":
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const renderSelectStep = () => {
    const selectedPlayer = players.find((p) => p.id === selectedTargets[0]);

    switch (role.id) {
      case "official":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">EYES ON YOU</h2>
            <p className="ability-step-description">
              Select a player to inspect one of their cards.
            </p>
            <div className="player-selector">
              {players.map((player) => (
                <button
                  key={player.id}
                  className={`player-select-btn ${selectedTargets.includes(player.id) ? "selected" : ""}`}
                  onClick={() => handleSelectTarget(player.id)}
                >
                  ○ {player.name}
                </button>
              ))}
            </div>
            {selectedPlayer && (
              <button className="ability-step-btn" onClick={handleConfirm}>
                CONFIRM
              </button>
            )}
          </div>
        );

      case "journalist":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">ON RECORD</h2>
            <p className="ability-step-description">
              Choose a player to question.
            </p>
            <div className="player-selector">
              {players.map((player) => (
                <button
                  key={player.id}
                  className={`player-select-btn ${selectedTargets.includes(player.id) ? "selected" : ""}`}
                  onClick={() => handleSelectTarget(player.id)}
                >
                  [ {player.name} ]
                </button>
              ))}
            </div>
            {selectedTargets.length > 0 && (
              <button className="ability-step-btn" onClick={handleConfirm}>
                NEXT
              </button>
            )}
          </div>
        );

      case "investigator":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">CROSSCHECK</h2>
            <p className="ability-step-description">Select two players.</p>
            <div className="player-selector">
              {players.map((player) => (
                <button
                  key={player.id}
                  className={`player-select-btn ${selectedTargets.includes(player.id) ? "selected" : ""}`}
                  onClick={() => handleSelectTarget(player.id)}
                >
                  {selectedTargets.includes(player.id)
                    ? `✓ ${player.name}`
                    : `○ ${player.name}`}
                </button>
              ))}
            </div>
            {selectedTargets.length === 2 && (
              <button className="ability-step-btn" onClick={handleConfirm}>
                CROSSCHECK
              </button>
            )}
          </div>
        );

      case "hacker":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">ACCOUNT BREACH</h2>
            <p className="ability-step-description">
              Select a player to breach.
            </p>
            <div className="player-selector">
              {players.map((player) => (
                <div key={player.id} className="player-card">
                  <span className="player-avatar">👤</span>
                  <span className="player-name">{player.name}</span>
                  <button
                    className="breach-btn"
                    onClick={() => handleSelectTarget(player.id)}
                  >
                    BREACH
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case "algorithm":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">ALGORITHM SELECTION</h2>
            <p className="ability-step-description">
              Choose an algorithm to shadowban cards with specific tags.
            </p>
            <div className="algorithm-selector">
              <div
                className="algorithm-card"
                onClick={() => handleSelectAlgorithm("ALGO-1")}
              >
                <h4>ENGAGEMENT ENGINE</h4>
                <p className="algo-boost">BOOST: Emotional, Viral, Visual</p>
                <p className="algo-filter">FILTER: Official, Technical</p>
              </div>
              <div
                className="algorithm-card"
                onClick={() => handleSelectAlgorithm("ALGO-2")}
              >
                <h4>AUTHORITY ENGINE</h4>
                <p className="algo-boost">BOOST: Official, Technical</p>
                <p className="algo-filter">FILTER: Viral, Opinion</p>
              </div>
              <div
                className="algorithm-card"
                onClick={() => handleSelectAlgorithm("ALGO-3")}
              >
                <h4>AI CURATOR</h4>
                <p className="algo-boost">BOOST: AI, Technical</p>
                <p className="algo-filter">FILTER: Opinion, Emotional, Local</p>
              </div>
              <div
                className="algorithm-card"
                onClick={() => handleSelectAlgorithm("ALGO-4")}
              >
                <h4>HUMAN STORIES</h4>
                <p className="algo-boost">BOOST: Opinion, Emotional, Local</p>
                <p className="algo-filter">FILTER: AI, Technical</p>
              </div>
              <div
                className="algorithm-card"
                onClick={() => handleSelectAlgorithm("ALGO-5")}
              >
                <h4>EVIDENCE MODE</h4>
                <p className="algo-boost">BOOST: Technical, Visual, Official</p>
                <p className="algo-filter">FILTER: Opinion, Emotional</p>
              </div>
            </div>
          </div>
        );

      case "echo_chamber":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">CLOSED CIRCUIT</h2>
            <p className="ability-step-description">
              Choose two players to allow speaking.
            </p>
            <p className="ability-step-subtitle">
              All other players will be muted for 30 seconds during discussion.
            </p>
            <div className="player-selector">
              {players.map((player) => (
                <button
                  key={player.id}
                  className={`player-select-btn ${selectedTargets.includes(player.id) ? "selected" : ""}`}
                  onClick={() => {
                    if (selectedTargets.includes(player.id)) {
                      setSelectedTargets(
                        selectedTargets.filter((id) => id !== player.id),
                      );
                    } else if (selectedTargets.length < 2) {
                      setSelectedTargets([...selectedTargets, player.id]);
                    }
                  }}
                >
                  [ {player.name} ]
                </button>
              ))}
            </div>
            {selectedTargets.length === 2 && (
              <button
                className="ability-step-btn"
                onClick={() => {
                  onAction("closed_circuit", { targetIds: selectedTargets });
                  setStep("result");
                }}
              >
                ACTIVATE
              </button>
            )}
          </div>
        );

      case "influencer":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">MUTE</h2>
            <p className="ability-step-description">
              Choose someone to mute next round.
            </p>
            <p className="ability-step-subtitle">
              Muted player cannot use chat next round.
            </p>
            <div className="player-selector">
              {players.map((player) => (
                <button
                  key={player.id}
                  className={`player-select-btn ${selectedTargets.includes(player.id) ? "selected" : ""}`}
                  onClick={() => handleSelectTarget(player.id)}
                >
                  [ {player.name} ]
                </button>
              ))}
            </div>
            {selectedTargets.length > 0 && (
              <button
                className="ability-step-btn"
                onClick={() => {
                  onAction("mute", { targetId: selectedTargets[0] });
                  setStep("result");
                }}
              >
                MUTE
              </button>
            )}
          </div>
        );

      case "analyst":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">FINAL CALL</h2>
            <p className="ability-step-description">⚠ LOCK YOUR VOTE</p>
            <p className="ability-step-subtitle">
              Choose the response you believe is correct.
            </p>
            <div className="response-selector">
              {crisisResponses?.map((response) => {
                const isSelected =
                  selectedTargets.includes(response.id) ||
                  currentVote === response.id ||
                  analystPrediction === response.id;
                return (
                  <button
                    key={response.id}
                    className={`response-select-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedTargets([response.id])}
                  >
                    {response.label}
                    {isSelected ? " · CHOSEN" : ""}
                  </button>
                );
              })}
            </div>
            {selectedTargets.length > 0 && (
              <>
                <p className="ability-step-warning">
                  If correct: Immunity from shadowban this round
                </p>
                <p className="ability-step-warning">
                  If wrong: Instant shadowban after voting results
                </p>
                <button
                  className="ability-step-btn"
                  onClick={() => {
                    onAction("lock_vote", { responseId: selectedTargets[0] });
                    setStep("result");
                  }}
                >
                  LOCK VOTE
                </button>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderConfirmStep = () => {
    const selectedPlayer = players.find((p) => p.id === selectedTargets[0]);
    const selectedResponseObj = crisisResponses?.find(
      (r) => r.id === selectedResponse,
    );

    switch (role.id) {
      case "official":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">EYES ON YOU</h2>
            <p className="ability-step-description">
              Inspect {selectedPlayer?.name}'s card?
            </p>
            <div className="ability-step-actions">
              <button
                className="ability-step-btn secondary"
                onClick={() => setStep("select")}
              >
                BACK
              </button>
              <button
                className="ability-step-btn primary"
                onClick={handleConfirm}
              >
                CONFIRM
              </button>
            </div>
          </div>
        );

      case "journalist":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">ON RECORD</h2>
            <p className="ability-step-description">
              Ask about a specific crisis response.
            </p>
            <p className="ability-step-subtitle">
              Questioning {selectedPlayer?.name}
            </p>
            <div className="response-selector">
              {crisisResponses?.map((response) => (
                <button
                  key={response.id}
                  className={`response-select-btn ${selectedResponse === response.id ? "selected" : ""}`}
                  onClick={() => setSelectedResponse(response.id)}
                >
                  {response.label}
                </button>
              ))}
            </div>
            {selectedResponse && (
              <button
                className="ability-step-btn"
                onClick={() => {
                  onAction("ask_question", {
                    targetId: selectedTargets[0],
                    responseId: selectedResponse,
                  });
                  setStep("result");
                }}
              >
                ASK
              </button>
            )}
          </div>
        );

      case "analyst":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">FINAL CALL</h2>
            <p className="ability-step-description">
              Lock your vote to {selectedResponseObj?.label}?
            </p>
            <div className="ability-step-actions">
              <button
                className="ability-step-btn secondary"
                onClick={() => setStep("select")}
              >
                BACK
              </button>
              <button
                className="ability-step-btn primary"
                onClick={() => {
                  onAction("lock_vote", { responseId: selectedTargets[0] });
                  setStep("result");
                }}
              >
                LOCK VOTE
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderCardSpyStep = () => {
    const selectedPlayer = players.find((p) => p.id === selectedTargets[0]);

    return (
      <div className="ability-step">
        <h2 className="ability-step-title">EYES ON YOU</h2>
        <p className="ability-step-description">SELECT A CARD TO INSPECT</p>
        <p className="ability-step-subtitle">
          {selectedPlayer?.name}'s information cards
        </p>
        <div className="card-fan-container">
          {targetHandCards.map((card, index) => (
            <div
              key={index}
              className="card-fan-item"
              onClick={() => handleCardSelect(index)}
              style={{
                transform: `rotate(${(index - targetHandCards.length / 2) * 5}deg) translateY(${Math.abs(index - targetHandCards.length / 2) * 10}px)`,
              }}
            >
              <img
                src="/assets/cards/backs/INFORMATION_CARD_BACK.png"
                alt="Card Back"
                className="card-fan-back"
              />
            </div>
          ))}
        </div>
        <p className="ability-step-subtitle">
          Click a card to reveal its contents
        </p>
      </div>
    );
  };

  const renderCardRevealStep = () => {
    const selectedPlayer = players.find((p) => p.id === selectedTargets[0]);
    // Prefer server-provided inspected card details if available
    const revealedCard =
      abilityResultData?.details?.card ||
      targetHandCards[selectedCardIndex || 0];

    return (
      <div className="ability-step">
        <h2 className="ability-step-title">EYES ON YOU</h2>
        <p className="ability-step-description">INFORMATION CARD</p>
        <div className="inspected-card">
          <div className="inspected-card-header">
            <p className="inspected-card-label">
              {revealedCard?.type || "EVIDENCE"}
            </p>
          </div>
          <div className="inspected-card-content">
            <p className="inspected-card-title">
              {revealedCard?.title || "Unknown"}
            </p>
            <p className="inspected-card-text">
              {revealedCard?.text || "Hospital capacity has fallen by 18%."}
            </p>
          </div>
        </div>
        <p className="ability-step-subtitle">
          This information is visible only to you.
        </p>
        <button className="ability-step-btn" onClick={handleComplete}>
          DONE
        </button>
      </div>
    );
  };

  const renderBreachAnimationStep = () => {
    const selectedPlayer = players.find((p) => p.id === selectedTargets[0]);
    const steps = ["CONNECTING...", "BYPASSING SECURITY...", "ACCESS GRANTED."];
    const currentStep = steps[Math.floor(breachProgress / 34)];

    return (
      <div className="ability-step">
        <h2 className="ability-step-title">ACCOUNT BREACH</h2>
        <div className="breach-animation">
          <p className="breach-status">{currentStep}</p>
          <div className="breach-progress-bar">
            <div
              className="breach-progress-fill"
              style={{ width: `${breachProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCrosscheckResultStep = () => {
    const player1 = players.find((p) => p.id === selectedTargets[0]);
    const player2 = players.find((p) => p.id === selectedTargets[1]);
    const isSameSide = abilityResultData?.details?.isSameSide ?? null;

    return (
      <div className="ability-step">
        <h2 className="ability-step-title">CROSSCHECK</h2>
        <div className="crosscheck-result">
          <p className="crosscheck-player">{player1?.name}</p>
          <p className="crosscheck-divider">{isSameSide ? "=" : "≠"}</p>
          <p className="crosscheck-player">{player2?.name}</p>
        </div>
        <p
          className={`crosscheck-result-text ${isSameSide ? "same-side" : "different-side"}`}
        >
          {isSameSide === null
            ? "RESULT PENDING"
            : isSameSide
              ? "SAME SIDE"
              : "DIFFERENT SIDES"}
        </p>
        <p className="ability-step-subtitle">
          You do not know their exact roles.
        </p>
        <button className="ability-step-btn" onClick={handleComplete}>
          DONE
        </button>
      </div>
    );
  };

  const renderResultStep = () => {
    const selectedPlayer = players.find((p) => p.id === selectedTargets[0]);

    switch (role.id) {
      case "hacker":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">ACCOUNT BREACHED</h2>
            <p className="ability-step-description">{selectedPlayer?.name}</p>
            <div className="breach-result">
              <p className="breach-result-label">ROLE</p>
              <p className="breach-result-value">
                {abilityDetails?.role ||
                  abilityResultData?.details?.role ||
                  "Unknown"}
              </p>
              <p className="breach-result-label">RANDOM INFORMATION</p>
              <div className="breach-info-card">
                <p>
                  {abilityDetails?.randomInfo ||
                    abilityResultData?.details?.randomInfo ||
                    "No additional info."}
                </p>
              </div>
            </div>
            <button className="ability-step-btn" onClick={handleComplete}>
              EXIT
            </button>
          </div>
        );

      case "algorithm":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">FOR YOU</h2>
            <p className="ability-step-description">
              Card delivered to {selectedPlayer?.name}.
            </p>
            <button className="ability-step-btn" onClick={handleComplete}>
              DONE
            </button>
          </div>
        );

      case "journalist":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">ON RECORD</h2>
            <p className="ability-step-description">
              Question sent to {selectedPlayer?.name}.
            </p>
            <button className="ability-step-btn" onClick={handleComplete}>
              DONE
            </button>
          </div>
        );

      case "echo_chamber":
        const player1 = players.find((p) => p.id === selectedTargets[0]);
        const player2 = players.find((p) => p.id === selectedTargets[1]);
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">CLOSED CIRCUIT</h2>
            <p className="ability-step-description">
              {player1?.name} + {player2?.name} may speak for 30 seconds.
            </p>
            <p className="ability-step-subtitle">Everyone else: LISTEN ONLY</p>
            <button className="ability-step-btn" onClick={handleComplete}>
              DONE
            </button>
          </div>
        );

      case "influencer":
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">MUTE</h2>
            <p className="ability-step-description">
              {selectedPlayer?.name} will be muted next round.
            </p>
            <button className="ability-step-btn" onClick={handleComplete}>
              DONE
            </button>
          </div>
        );

      default:
        return (
          <div className="ability-step">
            <h2 className="ability-step-title">ABILITY USED</h2>
            <p className="ability-step-description">
              Your ability has been activated.
            </p>
            <button className="ability-step-btn" onClick={handleComplete}>
              DONE
            </button>
          </div>
        );
    }
  };

  const renderCompleteStep = () => {
    return null;
  };

  return (
    <div className="ability-flow-overlay">
      <div className="ability-flow">
        <button className="ability-flow-close" onClick={onClose}>
          ✕
        </button>
        {renderStep()}
      </div>
    </div>
  );
}
