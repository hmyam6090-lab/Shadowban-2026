import { useState } from 'react';

export interface AvatarVoteSelectorProps {
  players: Array<{ id: string; name: string; avatar?: string; shadowbanned?: boolean }>;
  votes?: Record<string, string>; // playerId -> targetPlayerId
  onVote: (targetPlayerId: string) => void;
  disabled?: boolean;
}

export function AvatarVoteSelector({
  players,
  votes = {},
  onVote,
  disabled = false
}: AvatarVoteSelectorProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

  const handleVote = (playerId: string) => {
    if (disabled) return;
    setSelectedPlayer(playerId);
    onVote(playerId);
  };

  // Count votes for each player
  const voteCounts = players.reduce((acc, player) => {
    acc[player.id] = Object.values(votes).filter(v => v === player.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="avatar-vote-selector">
      <h3>Vote to Shadowban</h3>
      <p className="vote-instructions">Select a player to shadowban for this round</p>
      
      <div className="avatar-grid">
        {players.map((player) => {
          const voteCount = voteCounts[player.id] || 0;
          const isSelected = selectedPlayer === player.id;
          const isShadowbanned = player.shadowbanned;

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => handleVote(player.id)}
              disabled={disabled || isShadowbanned}
              className={`avatar-vote-card ${isSelected ? 'selected' : ''} ${isShadowbanned ? 'shadowbanned' : ''}`}
              title={player.name}
            >
              <div className="avatar-vote-card-content">
                <div className="avatar-vote-placeholder">
                  {getInitial(player.name)}
                </div>
                <span className="player-name">{player.name}</span>
                {voteCount > 0 && <span className="vote-count-badge">{voteCount}</span>}
                {isShadowbanned && <span className="shadowbanned-badge">Shadowbanned</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
