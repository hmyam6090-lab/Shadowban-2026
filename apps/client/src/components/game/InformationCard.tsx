import type { InformationCard as InformationCardType } from '@shadowban/shared';

export interface InformationCardProps {
  card: InformationCardType;
  accent?: 'public' | 'private';
  showBack?: boolean;
}

export function InformationCard({
  card,
  accent = 'public',
  showBack = false
}: InformationCardProps) {
  if (showBack) {
    return (
      <article className={`info-card ${accent} card-back`}>
        <div className="card-back-image">
          <img
            src="/assets/cards/backs/card_back_cyan.png"
            alt="Card back"
            className="card-back-img"
          />
        </div>
      </article>
    );
  }

  return (
    <article className={`info-card ${accent}`}>
      <div className="info-card-image">
        <img
          src="/assets/cards/information/info_card_1.png"
          alt={card.title}
          className="info-card-img"
        />
      </div>
      <div className="info-card-content">
        <p className="tag">{card.type}</p>
        <h4>{card.title}</h4>
        <p>{card.text}</p>
      </div>
    </article>
  );
}
