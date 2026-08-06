interface PlayerItem {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  isHost: boolean;
}

export interface PlayerListProps {
  players: PlayerItem[];
  hostPlayerId: string;
}

export function PlayerList({ players, hostPlayerId }: PlayerListProps) {
  return (
    <ul className="player-list">
      {players.map((player) => (
        <li key={player.id} className="player-list-item">
          <div>
            <strong>{player.name}</strong>
            {player.id === hostPlayerId || player.isHost ? (
              <span className="pill">HOST</span>
            ) : null}
          </div>
          <span className={player.connected ? 'status ok' : 'status'}>
            {player.connected ? 'connected' : 'disconnected'}
          </span>
          <span className={player.ready ? 'status ok' : 'status'}>
            {player.ready ? 'ready' : 'waiting'}
          </span>
        </li>
      ))}
    </ul>
  );
}
