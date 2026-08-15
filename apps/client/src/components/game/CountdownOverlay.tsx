import { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  onComplete: () => void;
  duration?: number;
}

export function CountdownOverlay({ onComplete, duration = 5 }: CountdownOverlayProps) {
  const [count, setCount] = useState(duration);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      onComplete();
    }, duration * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, onComplete]);

  return (
    <div className={`countdown-overlay ${show ? 'show' : ''}`}>
      <div className="countdown-content">
        <h1 className="countdown-number">{count}</h1>
        <p className="countdown-text">
          {count === 0 ? 'GO!' : count === 1 ? 'GET READY' : 'GAME STARTING'}
        </p>
      </div>
    </div>
  );
}
