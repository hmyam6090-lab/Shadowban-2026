import type { InformationCard as InformationCardType } from "@shadowban/shared";

export interface InformationCardProps {
  card: InformationCardType;
  accent?: "public" | "private";
  showBack?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function InformationCard({
  card,
  accent = "public",
  showBack = false,
  selected = false,
  onClick,
}: InformationCardProps) {
  if (showBack) {
    return (
      <article className={`info-card ${accent} card-back`}>
        <img
          src="/assets/cards/information/INFORMATION_CARD_BACK.png"
          alt="Card back"
          className="card-back-image"
        />
      </article>
    );
  }

  const cardImage = `/assets/cards/information/${card.id}.png`;

  return (
    <article
      className={`info-card ${accent} ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="card-image-container">
        <img src={cardImage} alt={card.title} className="card-image" />
      </div>
    </article>
  );
}
