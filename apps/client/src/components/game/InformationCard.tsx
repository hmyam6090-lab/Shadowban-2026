import type { InformationCard as InformationCardType } from "@shadowban/shared";

export interface InformationCardProps {
  card: InformationCardType;
  accent?: "public" | "private";
  showBack?: boolean;
}

export function InformationCard({
  card,
  accent = "public",
  showBack = false,
}: InformationCardProps) {
  if (showBack) {
    return (
      <article className={`info-card ${accent} card-back`}>
        <div className="card-back-image">
          <div className="card-back-pattern">
            <div className="pattern-circle"></div>
            <div className="pattern-circle"></div>
            <div className="pattern-circle"></div>
          </div>
          <p className="card-back-text">SHADOWBAN</p>
        </div>
      </article>
    );
  }

  return (
    <article className={`info-card ${accent}`}>
      <div className="card-header">
        <p className="tag">{card.type}</p>
        <div className="card-decoration"></div>
      </div>
      <div className="info-card-content">
        <h4>{card.title}</h4>
        <p>{card.text}</p>
      </div>
    </article>
  );
}
