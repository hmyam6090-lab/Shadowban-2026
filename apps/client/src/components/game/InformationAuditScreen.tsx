import type { InformationCard as InformationCardType } from "@shadowban/shared";

export interface InformationAuditScreenProps {
  availableEvidence: InformationCardType[];
  playerFeeds: Array<{
    playerId: string;
    playerName: string;
    cardsSeen: number;
    cardsPresented: number;
  }>;
  onContinue?: () => void;
}

export function InformationAuditScreen({ 
  availableEvidence, 
  playerFeeds, 
  onContinue 
}: InformationAuditScreenProps) {
  const evidenceCount = availableEvidence.length;
  const noiseCount = availableEvidence.filter(c => c.type === 'NOISE').length;
  const evidenceReliable = availableEvidence.filter(c => c.type === 'EVIDENCE' && (c.reliability ?? 3) >= 4).length;
  const totalCardsSeen = playerFeeds.reduce((sum, p) => sum + p.cardsSeen, 0);
  const coveragePercentage = Math.round((totalCardsSeen / (evidenceCount * playerFeeds.length)) * 100);

  return (
    <div className="audit-overlay">
      <div className="audit-content">
        <div className="audit-header">
          <h1 className="audit-title">Information Audit</h1>
          <p className="audit-subtitle">Review what information was available this round</p>
        </div>

        <div className="audit-stats-grid">
          <div className="audit-stat-card">
            <span className="audit-stat-value">{evidenceCount}</span>
            <span className="audit-stat-label">Total Cards</span>
          </div>
          <div className="audit-stat-card">
            <span className="audit-stat-value">{noiseCount}</span>
            <span className="audit-stat-label">Noise Cards</span>
          </div>
          <div className="audit-stat-card">
            <span className="audit-stat-value">{evidenceReliable}</span>
            <span className="audit-stat-label">High Reliability</span>
          </div>
          <div className="audit-stat-card">
            <span className="audit-stat-value">{coveragePercentage}%</span>
            <span className="audit-stat-label">Coverage</span>
          </div>
        </div>

        <div className="audit-section">
          <h3 className="audit-section-title">Information Distribution</h3>
          <div className="audit-distribution">
            {playerFeeds.map((feed) => (
              <div key={feed.playerId} className="audit-player-row">
                <span className="audit-player-name">{feed.playerName}</span>
                <div className="audit-player-stats">
                  <span className="audit-stat">{feed.cardsSeen} seen</span>
                  <span className="audit-stat">{feed.cardsPresented} presented</span>
                </div>
                <div className="audit-progress-bar">
                  <div 
                    className="audit-progress-fill" 
                    style={{ width: `${(feed.cardsSeen / evidenceCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="audit-section">
          <h3 className="audit-section-title">Source Analysis</h3>
          <div className="audit-source-breakdown">
            {getSourceBreakdown(availableEvidence).map((source) => (
              <div key={source.type} className="audit-source-item">
                <span className="audit-source-type">{source.type}</span>
                <span className="audit-source-count">{source.count}</span>
                <div className="audit-source-bar">
                  <div 
                    className="audit-source-fill" 
                    style={{ width: `${(source.count / evidenceCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="audit-educational">
          <h3 className="audit-section-title">Key Insights</h3>
          <div className="audit-insights">
            <div className="audit-insight">
              <span className="insight-icon">📊</span>
              <p className="insight-text">
                {noiseCount > evidenceCount / 2 
                  ? "High noise level this round - algorithm was actively distorting information."
                  : "Moderate noise level - some distortion present but manageable."}
              </p>
            </div>
            <div className="audit-insight">
              <span className="insight-icon">🎯</span>
              <p className="insight-text">
                {coveragePercentage > 70 
                  ? "Good information coverage - players had access to most evidence."
                  : "Limited coverage - some evidence may have been missed."}
              </p>
            </div>
            <div className="audit-insight">
              <span className="insight-icon">🔍</span>
              <p className="insight-text">
                {evidenceReliable > evidenceCount / 2 
                  ? "Strong reliable evidence available - good for fact-based decisions."
                  : "Mixed reliability - cross-reference sources for accuracy."}
              </p>
            </div>
          </div>
        </div>

        <button className="audit-continue-btn" onClick={onContinue}>
          Continue to Next Round
        </button>
      </div>
    </div>
  );
}

function getSourceBreakdown(cards: InformationCardType[]) {
  const breakdown: Record<string, number> = {};
  cards.forEach(card => {
    const source = card.sourceType || 'Unknown';
    breakdown[source] = (breakdown[source] || 0) + 1;
  });
  
  return Object.entries(breakdown)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}
