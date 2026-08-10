import { useEffect } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { ConnectionStatus } from "../components/common/ConnectionStatus.js";
import { useAppStore } from "../stores/appStore.js";
import { useSocketConnection } from "../socket/socket.js";
import { CreatePage } from "../pages/CreatePage.js";
import { GamePage } from "../pages/GamePage.js";
import { GameFlowPage } from "../pages/GameFlowPage.js";
import { JoinPage } from "../pages/JoinPage.js";
import { LobbyPage } from "../pages/LobbyPage.js";
import { getPhaseRoute } from "../utils/phaseRouting.js";

function RouteSync(): null {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAppStore((state) => state.session);
  const publicState = useAppStore((state) => state.publicState);

  useEffect(() => {
    if (!session || !publicState) {
      return;
    }

    const expectedPath = getPhaseRoute(publicState.phase, session.gameCode);

    if (expectedPath && expectedPath !== location.pathname) {
      navigate(expectedPath, { replace: true });
    }
  }, [location.pathname, navigate, publicState, session]);

  return null;
}

function GameRouteGate() {
  const { gameCode } = useParams();
  const session = useAppStore((state) => state.session);

  if (!gameCode) {
    return <Navigate to="/join" replace />;
  }

  if (session && session.gameCode !== gameCode) {
    return <Navigate to="/join" replace />;
  }

  return <GameFlowPage />;
}

export function App() {
  const serverStatus = useAppStore((state) => state.serverStatus);

  useSocketConnection();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SHADOWBAN</p>
          <h1>Algorithm/Game Master</h1>
        </div>
        <ConnectionStatus status={serverStatus} />
      </header>

      <nav className="nav-shell">
        <Link to="/" className="nav-icon" title="Home">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </Link>
        <Link to="/create" className="nav-icon" title="Create Game">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </Link>
        <Link to="/join" className="nav-icon" title="Join Game">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </Link>
      </nav>

      <RouteSync />

      <main className="content-shell">
        <Routes>
          <Route
            path="/"
            element={
              <GamePage
                title="SHADOWBAN"
                subtitle="Initial multiplayer scaffold is online."
              />
            }
          />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/lobby/:gameCode" element={<LobbyPage />} />
          <Route path="/game/:gameCode" element={<GameRouteGate />} />
          <Route path="/game/:gameCode/role" element={<GameFlowPage />} />
          <Route path="/game/:gameCode/evidence" element={<GameFlowPage />} />
          <Route path="/game/:gameCode/discussion" element={<GameFlowPage />} />
          <Route path="/game/:gameCode/vote" element={<GameFlowPage />} />
          <Route path="/game/:gameCode/results" element={<GameFlowPage />} />
          <Route path="/game/:gameCode/end" element={<GameFlowPage />} />
        </Routes>
      </main>
    </div>
  );
}
