import { useState } from "react";
import type { RoleDefinition } from "@shadowban/shared";
import { AbilityFlow } from "./AbilityFlow";

interface RoleScreenProps {
  role: RoleDefinition;
  roundNumber: number;
  abilityUsed: boolean;
  onUseAbility: () => void;
  onViewCards: () => void;
  handCount: number;
  players: any[];
  onAbilityAction: (action: string, data: any) => void;
  crisisResponses?: any[];
  currentPhase?: string;
  shadowbanned?: boolean;
  abilityHandCards?: any[] | null;
  abilityResultData?: any | null;
  currentPlayerId?: string | null;
}

export function RoleScreen({
  role,
  roundNumber,
  abilityUsed,
  onUseAbility,
  onViewCards,
  handCount,
  players,
  onAbilityAction,
  crisisResponses,
  currentPhase,
  shadowbanned = false,
  abilityHandCards = null,
  abilityResultData = null,
  currentPlayerId = null,
  currentVote = null,
  analystPrediction = null,
  protectedFromShadowban = false,
}: RoleScreenProps) {
  const [showAbilityFlow, setShowAbilityFlow] = useState(false);

  const handleUseAbility = () => {
    setShowAbilityFlow(true);
    onUseAbility();
  };

  const handleAbilityAction = (action: string, data: any) => {
    onAbilityAction(action, data);
  };

  const canUseAbilityInPhase = () => {
    if (!currentPhase || abilityUsed) return false;

    switch (role.id) {
      case "official":
      case "journalist":
      case "echo_chamber":
        return (
          currentPhase === "DEAL_INFORMATION" || currentPhase === "DISCUSSION"
        );
      case "analyst":
        return (
          currentPhase !== "VOTING" &&
          currentPhase !== "RESOLUTION" &&
          currentPhase !== "SHADOWBAN" &&
          currentPhase !== "GAME_END"
        );
      case "investigator":
      case "hacker":
        return true; // Can use any phase, once per round
      case "algorithm":
        return currentPhase === "EVIDENCE_PREPARATION";
      case "influencer":
        return shadowbanned; // Only when shadowbanned
      default:
        return false;
    }
  };

  const roleImageMap: Record<string, string> = {
    algorithm: "/assets/cards/role/Role_Algorithm.png",
    analyst: "/assets/cards/role/Role_Analyst.png",
    echo_chamber: "/assets/cards/role/Role_Echo_Chamber.png",
    official: "/assets/cards/role/Role_Government_Official.png",
    hacker: "/assets/cards/role/Role_Hacker.png",
    influencer: "/assets/cards/role/Role_Influencer.png",
    investigator: "/assets/cards/role/Role_Investigator.png",
    journalist: "/assets/cards/role/Role_Journalist.png",
  };

  const roleImage = role?.id
    ? roleImageMap[role.id]
    : "/assets/cards/role/Role_Government_Official.png";

  return (
    <div className="role-screen compact">
      <div className="role-card-image-container">
        <img
          src={roleImage}
          alt={role.name}
          className="role-card-image"
          onError={(e) => {
            e.currentTarget.src =
              "/assets/cards/role/Role_Government_Official.png";
          }}
        />
      </div>

      <div className="role-screen-role">
        <h2 className="role-name">{role.name}</h2>
        <div className={`role-status ${abilityUsed ? "inactive" : "active"}`}>
          {abilityUsed ? "○ INACTIVE" : "● ACTIVE"}
        </div>
      </div>

      <div className="role-screen-divider" />

      <div className="role-screen-section">
        <h3 className="role-screen-section-title">ABILITY</h3>

        <div className="ability-card compact">
          <div className="ability-card-header">
            <span className="ability-icon">⚡</span>
            <span className="ability-name">{role.abilityName}</span>
          </div>
          <button
            className="ability-use-btn"
            onClick={handleUseAbility}
            disabled={abilityUsed || !canUseAbilityInPhase()}
          >
            {abilityUsed
              ? "USED"
              : !canUseAbilityInPhase()
                ? "UNAVAILABLE"
                : "USE"}
          </button>
        </div>
      </div>

      <div className="role-screen-section">
        <h3 className="role-screen-section-title">INFORMATION</h3>
        <button className="role-screen-btn" onClick={onViewCards}>
          Cards ({handCount})
        </button>
      </div>

      {showAbilityFlow && (
        <AbilityFlow
          role={role}
          players={players}
          onClose={() => setShowAbilityFlow(false)}
          onAction={handleAbilityAction}
          crisisResponses={crisisResponses}
          currentPhase={currentPhase}
          targetHandCards={abilityHandCards}
          abilityResultData={abilityResultData}
          currentPlayerId={currentPlayerId}
          currentVote={currentVote}
          analystPrediction={analystPrediction}
          protectedFromShadowban={protectedFromShadowban}
        />
      )}
    </div>
  );
}
