import type { Response } from "@shadowban/shared";

export interface AvatarVotingDisplayProps {
  responses: Response[];
  votes?: Record<string, string>; // playerId -> responseId
  players: Array<{ id: string; name: string; avatar?: string }>;
  correctResponseId?: string;
  selectedResponseId?: string;
}

export function AvatarVotingDisplay({
  responses,
  votes = {},
  players,
  correctResponseId,
  selectedResponseId,
}: AvatarVotingDisplayProps) {
  const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

  // Group players by their vote
  const votesByResponse = responses.reduce(
    (acc, response) => {
      acc[response.id] = players.filter(
        (player) => votes[player.id] === response.id,
      );
      return acc;
    },
    {} as Record<string, Array<{ id: string; name: string; avatar?: string }>>,
  );

  return (
    <div className="avatar-voting-display">
      {responses.map((response) => {
        const voters = votesByResponse[response.id] || [];
        const isCorrect = correctResponseId
          ? response.id === correctResponseId
          : false;
        const isSelected = selectedResponseId
          ? response.id === selectedResponseId
          : false;

        return (
          <div
            key={response.id}
            className={`vote-option ${isCorrect ? "correct" : ""} ${isSelected ? "selected" : ""}`}
          >
            <div className="vote-option-header">
              <strong>{response.label}</strong>
              {isCorrect && <span className="correct-badge">✓ Correct</span>}
              {isSelected && !isCorrect && (
                <span className="selected-badge">Selected</span>
              )}
            </div>
            {response.description && (
              <p className="vote-description">{response.description}</p>
            )}

            <div className="avatar-cluster">
              {voters.length > 0 ? (
                voters.map((player) => (
                  <div
                    key={player.id}
                    className="avatar-voter"
                    title={player.name}
                  >
                    <div className="avatar-voter-placeholder">
                      {getInitial(player.name)}
                    </div>
                  </div>
                ))
              ) : (
                <span className="no-votes">No votes</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
