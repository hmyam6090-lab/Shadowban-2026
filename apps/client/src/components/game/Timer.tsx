export interface TimerProps {
  endsAt?: number;
}

export function Timer({ endsAt }: TimerProps) {
  if (!endsAt) {
    return <span className="timer">Timer paused</span>;
  }

  const remainingSeconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

  return <span className="timer">{remainingSeconds}s remaining</span>;
}
