import type { Response } from '@shadowban/shared';

export interface ResponseCardProps {
  response: Response;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function ResponseCard({
  response,
  selected,
  onClick,
  disabled
}: ResponseCardProps) {
  return (
    <button
      type="button"
      className={`phase-card response-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <strong>{response.label}</strong>
      {response.description ? <span>{response.description}</span> : null}
    </button>
  );
}
