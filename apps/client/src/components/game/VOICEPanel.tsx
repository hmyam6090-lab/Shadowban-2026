import type { InformationCard as InformationCardType } from "@shadowban/shared";

export interface VOICEPanelProps {
  card?: InformationCardType;
  onClose?: () => void;
}

export function VOICEPanel({ card, onClose }: VOICEPanelProps) {
  if (!card) {
    return (
      <article className="card voice-panel">
        <div className="voice-header">
          <h3>VOICE Framework</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="soft-copy">
          Select an information card to analyze using the VOICE framework.
        </p>
        <div className="voice-guide">
          <div className="voice-letter">
            <span className="letter">V</span>
            <span className="label">Verification</span>
            <span className="desc">Can this be confirmed?</span>
          </div>
          <div className="voice-letter">
            <span className="letter">O</span>
            <span className="label">Origin</span>
            <span className="desc">Who is the source?</span>
          </div>
          <div className="voice-letter">
            <span className="letter">I</span>
            <span className="label">Intent</span>
            <span className="desc">What's the purpose?</span>
          </div>
          <div className="voice-letter">
            <span className="letter">C</span>
            <span className="label">Context</span>
            <span className="desc">What's the situation?</span>
          </div>
          <div className="voice-letter">
            <span className="letter">E</span>
            <span className="label">Evidence</span>
            <span className="desc">What supports this?</span>
          </div>
        </div>
      </article>
    );
  }

  const reliabilityScore = card.reliability ?? 3;
  const reliabilityColor =
    reliabilityScore >= 4
      ? "var(--success)"
      : reliabilityScore >= 3
        ? "var(--uncertainty-orange)"
        : "var(--danger)";

  return (
    <article className="card voice-panel">
      <div className="voice-header">
        <h3>VOICE Framework</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="voice-card-analysis">
        <div className="voice-card-title">
          <h4>{card.title}</h4>
          <span
            className={`reliability-badge`}
            style={{ color: reliabilityColor }}
          >
            Reliability: {reliabilityScore}/5
          </span>
        </div>

        <div className="voice-analysis-grid">
          <div className="voice-item">
            <span className="voice-item-label">V - Verification</span>
            <div className="voice-item-content">
              <span className="voice-item-value">
                {card.sourceType === "GOVERNMENT ALERT"
                  ? "Official Source"
                  : card.sourceType === "CCTV IMAGE"
                    ? "Visual Evidence"
                    : card.sourceType === "EYEWITNESS REPORT"
                      ? "Witness Account"
                      : card.sourceType === "AI SUMMARIES"
                        ? "AI Analysis"
                        : card.sourceType === "SOCIAL MEDIA POST"
                          ? "Unverified"
                          : "Unknown"}
              </span>
              <span className="voice-item-detail">
                {(card.reliability ?? 3) >= 4
                  ? "High confidence"
                  : (card.reliability ?? 3) >= 3
                    ? "Moderate confidence"
                    : "Low confidence"}
              </span>
            </div>
          </div>

          <div className="voice-item">
            <span className="voice-item-label">O - Origin</span>
            <div className="voice-item-content">
              <span className="voice-item-value">
                {card.source || "Unknown Source"}
              </span>
              <span className="voice-item-detail">
                {card.sourceType || "Unknown Type"}
              </span>
            </div>
          </div>

          <div className="voice-item">
            <span className="voice-item-label">I - Intent</span>
            <div className="voice-item-content">
              <span className="voice-item-value">
                {card.tags?.includes("Official")
                  ? "Informative"
                  : card.tags?.includes("Emotional")
                    ? "Emotional Appeal"
                    : card.tags?.includes("Viral")
                      ? "Engagement"
                      : card.tags?.includes("Technical")
                        ? "Technical Analysis"
                        : "Unknown"}
              </span>
              <span className="voice-item-detail">
                {card.type === "EVIDENCE"
                  ? "Supports investigation"
                  : "Potential distraction"}
              </span>
            </div>
          </div>

          <div className="voice-item">
            <span className="voice-item-label">C - Context</span>
            <div className="voice-item-content">
              <span className="voice-item-value">
                {card.tags?.includes("Local")
                  ? "Local Context"
                  : card.tags?.includes("Technical")
                    ? "Technical Context"
                    : card.tags?.includes("Visual")
                      ? "Visual Context"
                      : "General Context"}
              </span>
              <span className="voice-item-detail">
                {card.tags?.join(", ") || "No specific context tags"}
              </span>
            </div>
          </div>

          <div className="voice-item">
            <span className="voice-item-label">E - Evidence</span>
            <div className="voice-item-content">
              <span className="voice-item-value">
                {card.supportsResponseId
                  ? `Supports: ${card.supportsResponseId}`
                  : "No specific support"}
              </span>
              <span className="voice-item-detail">
                {card.type === "EVIDENCE"
                  ? "Valid evidence card"
                  : "Noise card - use with caution"}
              </span>
            </div>
          </div>
        </div>

        <div className="voice-summary">
          <h5>Summary</h5>
          <p className="soft-copy">
            This {card.type.toLowerCase()} from {card.source} has a reliability
            score of {reliabilityScore}/5.
            {card.type === "EVIDENCE"
              ? " It should be considered as part of your analysis."
              : " It may contain misleading information and should be verified."}
          </p>
        </div>
      </div>
    </article>
  );
}
