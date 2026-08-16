import { useEffect, useState } from "react";

export interface PrimedAnnouncementProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function PrimedAnnouncement({
  message,
  duration = 3000,
  onClose,
}: PrimedAnnouncementProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className="primed-announcement-overlay">
      <div className="primed-announcement-content">
        <div className="primed-announcement-icon">📢</div>
        <p className="primed-announcement-text">{message}</p>
      </div>
    </div>
  );
}
