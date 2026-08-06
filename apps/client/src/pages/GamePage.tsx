import { useEffect, useState } from 'react';

import { checkHealth } from '../services/api.js';

export interface GamePageProps {
  title: string;
  subtitle: string;
}

export function GamePage({ title, subtitle }: GamePageProps) {
  const [connected, setConnected] = useState<'checking' | 'online' | 'offline'>(
    'checking'
  );

  useEffect(() => {
    let active = true;

    void checkHealth().then((isOnline) => {
      if (active) {
        setConnected(isOnline ? 'online' : 'offline');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card">
      <p className="eyebrow">{title}</p>
      <h2>{subtitle}</h2>
      <p>The server is {connected}.</p>
      <p>This shell is ready for the lobby and game flow phases.</p>
    </section>
  );
}
