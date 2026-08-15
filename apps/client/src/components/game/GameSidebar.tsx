import { GamePhase } from "@shadowban/shared";
import type { RoleDefinition } from "@shadowban/shared";

export interface GameSidebarProps {
  currentPhase: GamePhase;
  onNavigate: (phase: GamePhase) => void;
  role?: RoleDefinition;
  abilityUsed?: boolean;
  shadowbanned?: boolean;
  onUseAbility?: () => void;
  activeTab?: "phases" | "role";
  onTabChange?: (tab: "phases" | "role") => void;
}

export function GameSidebar({
  currentPhase,
  onNavigate,
  role,
  abilityUsed = false,
  shadowbanned = false,
  onUseAbility,
  activeTab = "phases",
  onTabChange,
}: GameSidebarProps) {
  const sections = [
    { id: "lobby", label: "Lobby", phase: GamePhase.LOBBY },
    { id: "crisis", label: "Crisis", phase: GamePhase.CRISIS_REVEAL },
    { id: "evidence", label: "Evidence", phase: GamePhase.DEAL_INFORMATION },
    { id: "discussion", label: "Discussion", phase: GamePhase.DISCUSSION },
    { id: "voting", label: "Voting", phase: GamePhase.VOTING },
    { id: "resolution", label: "Resolution", phase: GamePhase.RESOLUTION },
    { id: "shadowban", label: "Shadowban", phase: GamePhase.SHADOWBAN },
  ];

  const factionColor =
    role?.faction === "SOCIETY"
      ? "var(--society-green)"
      : "var(--algorithm-red)";
  const canUseAbility = role?.abilityName && !abilityUsed && !shadowbanned;

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
    <aside className="game-sidebar">
      <div className="sidebar-header">
        <h3>SHADOWBAN</h3>
        <p className="sidebar-subtitle">Game Manager</p>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === "phases" ? "active" : ""}`}
          onClick={() => onTabChange?.("phases")}
        >
          Phases
        </button>
        <button
          className={`sidebar-tab ${activeTab === "role" ? "active" : ""}`}
          onClick={() => onTabChange?.("role")}
        >
          Role
        </button>
      </div>

      {activeTab === "phases" ? (
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`sidebar-nav-item ${
                currentPhase === section.phase ? "active" : ""
              }`}
              onClick={() => onNavigate(section.phase)}
              disabled={currentPhase === section.phase}
            >
              {section.label}
            </button>
          ))}
        </nav>
      ) : (
        <div className="sidebar-role-content">
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
            <span
              className="role-faction-badge"
              style={{ color: factionColor }}
            >
              {role?.faction || "Unknown"}
            </span>
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
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot"></span>
          <span className="status-text">Connected</span>
        </div>
      </div>
    </aside>
  );
}
