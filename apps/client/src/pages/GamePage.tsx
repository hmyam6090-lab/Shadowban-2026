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
          <h1 className="main-title">
            <span className="sr-only">SHADOWBAN</span>
            <img
              className="main-brand-logo"
              src="/assets/Logo_Real.png"
              alt="SHADOWBAN"
              loading="eager"
            />
          </h1>
          <p className="main-subtitle">{subtitle}</p>
        </div>

        <div className="status-indicator">
          <span className={`status-dot ${connected}`}></span>
          <span className="status-text">
            {connected === "checking"
              ? "Waiting on the wire..."
              : connected === "online"
                ? "Wire live"
                : "Wire down"}
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
          <Link to="/create" className="menu-btn tertiary-menu-btn">
            <span className="menu-btn-icon">🏠</span>
            <span className="menu-btn-text">Start Local Game</span>
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
