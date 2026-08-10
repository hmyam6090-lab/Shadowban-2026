import { useEffect, useState, useRef } from 'react';

export interface CircularTimerProps {
  endsAt: number;
  totalTime?: number;
}

export function CircularTimer({ endsAt, totalTime = 60 }: CircularTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('low');
  const animationRef = useRef<number>();

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
      setTimeLeft(remaining);

      // Set urgency based on time remaining
      if (remaining <= 10) {
        setUrgency('high');
      } else if (remaining <= 30) {
        setUrgency('medium');
      } else {
        setUrgency('low');
      }

      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(updateTimer);
      }
    };

    animationRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [endsAt]);

  const progress = timeLeft / totalTime;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference * (1 - progress);

  const getUrgencyColor = () => {
    switch (urgency) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffd93d';
      case 'low':
      default:
        return '#4ecdc4';
    }
  };

  return (
    <div className="circular-timer">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={getUrgencyColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          className={`timer-progress urgency-${urgency}`}
        />
      </svg>
      <div className="timer-text">
        <span className="timer-value">{timeLeft}</span>
        <span className="timer-label">SEC</span>
      </div>
    </div>
  );
}
