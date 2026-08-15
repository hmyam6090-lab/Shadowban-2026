import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { checkHealth } from "../services/api.js";

export interface GamePageProps {
  title: string;
  subtitle: string;
}

export function GamePage({ title, subtitle }: GamePageProps) {
  const [connected, setConnected] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  useEffect(() => {
    let active = true;

    void checkHealth().then((isOnline) => {
      if (active) {
        setConnected(isOnline ? "online" : "offline");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="main-menu-layout">
      <div className="main-menu-content">
        <div className="main-menu-header">
          <h1 className="main-title">SHADOWBAN</h1>
          <p className="main-subtitle">A Social Deduction Game</p>
        </div>

        <div className="status-indicator">
          <span className={`status-dot ${connected}`}></span>
          <span className="status-text">
            {connected === "checking"
              ? "Connecting..."
              : connected === "online"
                ? "Server Online"
                : "Server Offline"}
          </span>
        </div>

        <div className="main-menu-actions">
          <Link to="/create" className="menu-btn primary-menu-btn">
            <span className="menu-btn-icon">🎮</span>
            <span className="menu-btn-text">Create Game</span>
          </Link>
          <Link to="/join" className="menu-btn secondary-menu-btn">
            <span className="menu-btn-icon">🔗</span>
            <span className="menu-btn-text">Join Game</span>
          </Link>
        </div>

        <div className="main-menu-footer">
          <p className="footer-text">
            Navigate the information landscape. Trust no one. Survive the
            algorithm.
          </p>
        </div>
      </div>
    </div>
  );
}
