import { GamePhase } from "@shadowban/shared";
import type {
  RoleDefinition,
  PublicGameState,
  PrivatePlayerState,
  CrisisPublicDTO,
} from "@shadowban/shared";
import { ScoreBoard } from "./ScoreBoard.js";
import { ResponseCard } from "./ResponseCard.js";
import { RoleScreen } from "./RoleScreen.js";

export interface GameSidebarProps {
  currentPhase: GamePhase;
  onNavigate: (phase: GamePhase) => void;
  role?: RoleDefinition;
  abilityUsed?: boolean;
  shadowbanned?: boolean;
  onUseAbility?: () => void;
  activeTab?: "phases" | "role";
  onTabChange?: (tab: "phases" | "role") => void;
  publicState?: PublicGameState;
  privateState?: PrivatePlayerState;
  currentCrisis?: CrisisPublicDTO;
  selectedVote?: string | null;
  onVote?: (responseId: string) => void;
  hasVoted?: boolean;
  onAbilityAction?: (action: string, data: any) => void;
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
  publicState,
  privateState,
  currentCrisis,
  selectedVote,
  onVote,
  hasVoted,
  onAbilityAction,
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

      <ScoreBoard
        societyScore={publicState?.societyScore || 0}
        algorithmScore={publicState?.algorithmScore || 0}
      />

      <div className="sidebar-role-content">
        {role && (
          <RoleScreen
            role={role}
            roundNumber={1}
            abilityUsed={abilityUsed}
            onUseAbility={onUseAbility || (() => {})}
            onViewCards={() => {}}
            handCount={privateState?.hand?.length || 0}
            players={publicState?.players || []}
            onAbilityAction={onAbilityAction || (() => {})}
            crisisResponses={currentCrisis?.responses}
            currentPhase={currentPhase}
            shadowbanned={shadowbanned}
          />
        )}
      </div>
    </aside>
  );
}
