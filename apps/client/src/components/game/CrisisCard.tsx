import type { CrisisPublicDTO } from '@shadowban/shared';

export interface CrisisCardProps {
  crisis: CrisisPublicDTO;
}

export function CrisisCard({ crisis }: CrisisCardProps) {
  return (
    <article className="phase-card crisis-card">
      <div className="crisis-card-image">
        <img
          src="/assets/cards/crisis/CrisisCard1.jpg"
          alt={crisis.name}
          className="crisis-card-img"
        />
      </div>
      <div className="crisis-card-content">
        <p className="eyebrow">Crisis</p>
        <h3>{crisis.name}</h3>
        <p>{crisis.description}</p>
      </div>
    </article>
  );
}
