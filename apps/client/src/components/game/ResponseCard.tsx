import type { Response } from "@shadowban/shared";

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
  disabled,
}: ResponseCardProps) {
  return (
    <button
      type="button"
      className={`response-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <strong>{response.label}</strong>
    </button>
  );
}
