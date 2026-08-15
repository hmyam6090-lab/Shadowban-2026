import { useEffect, useState } from "react";
import type { RoleDefinition } from "@shadowban/shared";

interface RoleRevealProps {
  role: RoleDefinition;
  onComplete: () => void;
}

export function RoleReveal({ role, onComplete }: RoleRevealProps) {
  const [showRole, setShowRole] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Animate card reveal
    const timer1 = setTimeout(() => setShowRole(true), 500);
    const timer2 = setTimeout(() => setShowDetails(true), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

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

  const factionColor = role?.faction === "SOCIETY" ? "#10b981" : "#8b5cf6";

  return (
    <div className="role-reveal-overlay">
      <div className={`role-reveal-card ${showRole ? "reveal" : ""}`}>
        <div className="role-reveal-content">
          <h2 className="role-reveal-title">YOUR ROLE</h2>

          <div className={`role-card-display ${showRole ? "flip" : ""}`}>
            <img
              src={roleImage}
              alt={role?.name || "Role Card"}
              className="role-card-image"
              onError={(e) => {
                e.currentTarget.src =
                  "/assets/cards/role/Role_Government_Official.png";
              }}
            />
          </div>

          {showDetails && (
            <div className="role-details-animate">
              <h3 className="role-name">{role?.name || "Unknown Role"}</h3>
              <span
                className="role-faction-badge"
                style={{ color: factionColor }}
              >
                {role?.faction || "Unknown"}
              </span>

              {role?.abilityName && (
                <div className="role-ability">
                  <div className="ability-header">
                    <span className="ability-icon">⚡</span>
                    <span className="ability-name">{role.abilityName}</span>
                  </div>
                </div>
              )}

              <button className="role-reveal-done-btn" onClick={onComplete}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
