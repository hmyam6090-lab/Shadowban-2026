import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

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
  useSocketConnection();

  return (
    <div className="app-shell">
      <RouteSync />

      <main className="content-shell">
        <Routes>
          <Route
            path="/"
            element={
              <GamePage
                title="SHADOWBAN"
                subtitle="The press is hot, the paper is live."
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
