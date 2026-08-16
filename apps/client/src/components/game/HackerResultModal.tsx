import { MouseEvent } from "react";

export interface HackerResult {
  targetId?: string;
  targetName?: string;
  role?: string | null;
  roleImage?: string | null;
}

export function HackerResultModal({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: HackerResult | null;
}) {
  if (!open || !result) return null;

  const { targetName, role, roleImage } = result;

  // Small non-blocking overlay in the bottom-right corner
  return (
    <div className="hacker-result-overlay">
      <div className="hacker-result-card">
        <button className="hacker-result-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="hacker-result-body">
          <div className="hacker-result-title">Breach — {targetName ?? "Unknown"}</div>
          {roleImage ? (
            <img src={roleImage} alt={role ?? "Role image"} className="hacker-role-image" />
          ) : (
            <div className="hacker-role-text">{role ?? "Unknown"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HackerResultModal;
