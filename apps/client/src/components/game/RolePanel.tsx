import type { RoleDefinition } from "@shadowban/shared";

export interface RolePanelProps {
  role?: RoleDefinition;
  abilityUsed?: boolean;
  shadowbanned?: boolean;
  onUseAbility?: () => void;
}

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

export function RolePanel({
  role,
  abilityUsed = false,
  shadowbanned = false,
  onUseAbility,
}: RolePanelProps) {
  const factionColor =
    role?.faction === "SOCIETY"
      ? "var(--society-green)"
      : "var(--algorithm-red)";
  const canUseAbility = role?.abilityName && !abilityUsed && !shadowbanned;
  const roleImage = role?.id
    ? roleImageMap[role.id]
    : "/assets/cards/role/Role_Government_Official.png";

  return (
    <article className="role-panel">
      <div className="role-panel-header">
        <h4 className="role-panel-title">Your Role</h4>
        <span className="role-faction-badge" style={{ color: factionColor }}>
          {role?.faction || "Unknown"}
        </span>
      </div>

      <div className="role-card-display">
        <div className="role-card-image-wrapper">
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
      </div>

      <div className="role-details">
        <h5 className="role-name">{role?.name || "Unknown Role"}</h5>
        <p className="role-description">{role?.description || ""}</p>
      </div>

      {role?.abilityName && (
        <div className="role-ability">
          <div className="ability-header">
            <span className="ability-icon">⚡</span>
            <span className="ability-name">{role.abilityName}</span>
          </div>
          <p className="ability-description">{role.abilityDescription}</p>
          <button
            className={`ability-btn ${!canUseAbility ? "disabled" : ""}`}
            onClick={onUseAbility}
            disabled={!canUseAbility}
          >
            {abilityUsed
              ? "Ability Used"
              : shadowbanned
                ? "Shadowbanned"
                : "Use Ability"}
          </button>
        </div>
      )}
    </article>
  );
}
