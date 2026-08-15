import type { CrisisPublicDTO } from "@shadowban/shared";

export interface CrisisCardProps {
  crisis: CrisisPublicDTO;
  showResponses?: boolean;
  onResponseSelect?: (responseId: string) => void;
  selectedResponseId?: string;
}

export function CrisisCard({
  crisis,
  showResponses = false,
  onResponseSelect,
  selectedResponseId,
}: CrisisCardProps) {
  const crisisImageMap: Record<string, string> = {
    flood: "/assets/cards/crisis/FLD_CRISIS_CARD.png",
    "missing-child": "/assets/cards/crisis/MSC_CRISIS_CARD.png",
    "ai-deepfake": "/assets/cards/crisis/DPF_CRISIS_CARD.png",
  };

  const crisisImage =
    crisisImageMap[crisis.id] || "/assets/cards/crisis/FLD_CRISIS_CARD.png";

  return (
    <article className="crisis-card-layout">
      <div className="crisis-card-vertical">
        <div className="crisis-card-image">
          <img
            src={crisisImage}
            alt={crisis.name}
            className="crisis-card-img"
          />
        </div>
      </div>

      {showResponses && (
        <div className="crisis-responses">
          <p className="responses-label">Responses</p>
          <div className="response-list">
            {crisis.responses.map((response) => (
              <button
                key={response.id}
                className={`response-option ${selectedResponseId === response.id ? "selected" : ""}`}
                onClick={() => onResponseSelect?.(response.id)}
              >
                <span className="response-label">{response.label}</span>
                <span className="response-desc">{response.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
