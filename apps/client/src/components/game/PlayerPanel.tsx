import type { Player, RoleDefinition } from "@shadowban/shared";

export interface PlayerPanelProps {
  player: Player;
  role?: RoleDefinition;
  isShadowbanned?: boolean;
  isHost?: boolean;
  currentRound?: number;
  totalRounds?: number;
}

export function PlayerPanel({ 
  player, 
  role, 
  isShadowbanned = false, 
  isHost = false,
  currentRound = 1,
  totalRounds = 5
}: PlayerPanelProps) {
  const factionColor = role?.faction === 'SOCIETY' ? 'var(--society-green)' : 'var(--algorithm-red)';

  return (
    <article className={`card player-panel ${isShadowbanned ? 'shadowbanned' : ''}`}>
      <div className="player-panel-header">
        <div className="player-info">
          <h3 className="player-name">{player.name}</h3>
          {isHost && <span className="host-badge">Host</span>}
        </div>
        <div className="player-status">
          {isShadowbanned ? (
            <span className="status-badge shadowbanned">Shadowbanned</span>
          ) : (
            <span className="status-badge active">Active</span>
          )}
        </div>
      </div>

      <div className="player-panel-content">
        <div className="role-display">
          <div className="role-icon" style={{ color: factionColor }}>
            {role?.faction === 'SOCIETY' ? '👥' : '🤖'}
          </div>
          <div className="role-details">
            <h4 className="role-name">{role?.name || 'Unknown Role'}</h4>
            <span className="role-faction" style={{ color: factionColor }}>
              {role?.faction || 'Unknown Faction'}
            </span>
          </div>
        </div>

        {role?.abilityName && !isShadowbanned && (
          <div className="ability-display">
            <span className="ability-label">Ability:</span>
            <span className="ability-name">{role.abilityName}</span>
          </div>
        )}

        <div className="player-stats">
          <div className="stat-row">
            <span className="stat-label">Round</span>
            <span className="stat-value">{currentRound}/{totalRounds}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Status</span>
            <span className="stat-value">
              {isShadowbanned ? 'Eliminated' : 'In Play'}
            </span>
          </div>
        </div>
      </div>

      {isShadowbanned && (
        <div className="shadowban-notice">
          <span className="notice-icon">⚠️</span>
          <span className="notice-text">This player has been removed from the algorithm</span>
        </div>
      )}
    </article>
  );
}
