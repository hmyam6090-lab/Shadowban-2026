export interface ScoreBoardProps {
  societyScore: number;
  algorithmScore: number;
  societyWins?: number;
  algorithmWins?: number;
}

export function ScoreBoard({
  societyScore,
  algorithmScore,
  societyWins,
  algorithmWins,
}: ScoreBoardProps) {
  return (
    <div className="score-board card">
      <div>
        <span>SOCIETY</span>
        <strong>{societyScore}</strong>
        {societyWins !== undefined && <small>({societyWins} wins)</small>}
      </div>
      <div>
        <span>ALGORITHM</span>
        <strong>{algorithmScore}</strong>
        {algorithmWins !== undefined && <small>({algorithmWins} wins)</small>}
      </div>
    </div>
  );
}
