# Project State

This file is the current handoff for SHADOWBAN. It is meant to help another agent pick up work quickly without needing to reconstruct the whole project.

## Snapshot

- Monorepo scaffold is in place with `apps/client`, `apps/server`, and shared packages under `packages/*`.
- The client is a React + Vite app with socket-driven lobby and gameplay routes.
- The server is an authoritative Express + Socket.IO backend.
- Prisma schema and Docker Compose are present for persistence scaffolding.
- Game content is loaded from JSON under `packages/game-data`.
- The current browser smoke test passes through create, join, and phase advance.

## What Is Implemented

- Room creation and join flows.
- Socket session join and reconnect handling.
- Authoritative lobby state and round-phase progression.
- Crisis reveal, evidence preparation, private hand display, role display, discussion, voting, resolution, and end screens.
- Shared domain types and socket event contracts.
- Content loading for crises, evidence, roles, and algorithm setups.
- Base design system with responsive card layouts and shared UI components.

## Infrastructure

- Package manager: npm workspaces.
- Frontend: React, React Router, Zustand, Socket.IO client, Vite.
- Backend: Node.js, Express, Socket.IO, tsx watch mode.
- Validation: TypeScript, ESLint, Vitest.
- Persistence scaffolding: Prisma + PostgreSQL via Docker Compose.
- Shared code: `packages/shared`.
- Static content: `packages/game-data`.

## Current UI References And Assets

- Reference mockups are in `reference_and_assets/reference`.
- Physical card assets are in `reference_and_assets/assets`.
- The UI should stay close to the reference language: bold headers, high-contrast panels, card-like surfaces, and strong colored callouts.

## Current Code Areas

- `apps/client/src/app/App.tsx` controls the shell, routing, and session sync.
- `apps/client/src/pages/CreatePage.tsx` and `JoinPage.tsx` handle room entry.
- `apps/client/src/pages/LobbyPage.tsx` handles pre-game readiness and host start.
- `apps/client/src/pages/GameFlowPage.tsx` renders phase-specific game screens.
- `apps/client/src/styles.css` holds the shared visual system.
- `apps/server/src/game/GameManager.ts` owns game state and validation.
- `apps/server/src/game/RoundManager.ts` controls round progression.
- `apps/server/src/services/contentService.ts` loads JSON content from the repo.
- `apps/server/src/socket/handlers/index.ts` handles game events defensively.

## Known Work Remaining

- Phase gameplay is still mostly scaffolded and should be expanded into real mechanics.
- Voting, resolution, and scoring logic are placeholder-level and need deeper rules.
- Private information and physical card interactions still need fuller implementation.
- The layout is now more responsive, but individual game screens can still be refined further with the reference assets.
- Persistence is scaffolded but not yet wired into the live flow.

## How To Resume

1. Run `npm install` if dependencies are not present.
2. Start the stack with `npm run dev`.
3. Use `http://localhost:5173/create` to create a host room and `http://localhost:5173/join` for a second client.
4. Verify the game advances from lobby into the crisis reveal screen.
5. Continue from the server round manager and client phase views for the next mechanics pass.

## Validation That Has Been Done

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- Browser smoke test for create, join, and host phase advance

## Notes For The Next Agent

- Hidden game data must stay server-owned until it is explicitly sent in private player payloads.
- The repository root matters for content loading; the server resolves `packages/game-data` from the repo, not from the current working directory alone.
- Socket handlers should stay defensive so stale browser sessions do not crash the server.
