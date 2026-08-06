export interface ScoreBoardProps {
  societyScore: number;
  algorithmScore: number;
}

export function ScoreBoard({ societyScore, algorithmScore }: ScoreBoardProps) {
  return (
    <div className="score-board card">
      <div>
        <span>SOCIETY</span>
        <strong>{societyScore}</strong>
      </div>
      <div>
        <span>ALGORITHM</span>
        <strong>{algorithmScore}</strong>
      </div>
    </div>
  );
}
