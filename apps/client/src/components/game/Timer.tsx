import { useState, useEffect } from "react";

export interface TimerProps {
  endsAt?: number;
  onExpire?: () => void;
}

export function Timer({ endsAt, onExpire }: TimerProps) {
  const [progress, setProgress] = useState(100);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!endsAt) {
      setProgress(100);
      setIsExpired(false);
      return;
    }

    const now = Date.now();
    const totalDuration = endsAt - now;
    const startTime = now;

    const updateProgress = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const remaining = Math.max(0, endsAt - currentTime);
      const newProgress = (remaining / totalDuration) * 100;
      setProgress(Math.max(0, newProgress));

      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpire?.();
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [endsAt, isExpired, onExpire]);

  if (!endsAt) {
    return (
      <div className="timer-bar-container">
        <div className="timer-bar" style={{ width: "100%" }}></div>
      </div>
    );
  }

  return (
    <div className="timer-bar-container">
      <div className="timer-bar" style={{ width: `${progress}%` }}></div>
    </div>
  );
}
