import type { Player } from "@shadowban/shared";

export interface ShadowbanScreenProps {
  shadowbannedPlayer: Player;
  onContinue?: () => void;
}

export function ShadowbanScreen({ shadowbannedPlayer, onContinue }: ShadowbanScreenProps) {
  return (
    <div className="shadowban-overlay">
      <div className="shadowban-content">
        <div className="shadowban-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4ZM12 6C9.79 6 8 7.79 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 7.79 14.21 6 12 6ZM12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8ZM4.5 15C4.5 15 6 17 12 17C18 17 19.5 15 19.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        
        <h1 className="shadowban-title">SHADOWBANNED</h1>
        
        <div className="shadowban-player">
          <p className="shadowban-label">Player Eliminated</p>
          <h2 className="shadowban-name">{shadowbannedPlayer.name}</h2>
        </div>

        <div className="shadowban-message">
          <p className="shadowban-text">
            This player has been removed from the algorithm's influence.
            Their voice has been silenced, but their impact on the information
            landscape remains.
          </p>
        </div>

        <div className="shadowban-stats">
          <div className="stat-item">
            <span className="stat-label">Role</span>
            <span className="stat-value">Hidden</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Faction</span>
            <span className="stat-value">Unknown</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cards Held</span>
            <span className="stat-value">Lost</span>
          </div>
        </div>

        <button className="shadowban-continue-btn" onClick={onContinue}>
          Continue Game
        </button>
      </div>
    </div>
  );
}
