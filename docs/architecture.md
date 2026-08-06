# Architecture

SHADOWBAN uses a thin client, an authoritative Node.js server, shared TypeScript contracts, and data-driven content.

## Phase boundaries

- Phase 1: monorepo, tooling, client/server shells, Prisma, and PostgreSQL scaffolding.
- Phase 2: shared game-domain types, validation, and static content.
- Later phases will add lobby flow, multiplayer state, timers, voting, and resolution.

## Design rules

- The server owns game state and validation.
- The client renders public and private views from sanitized DTOs.
- Game content lives in JSON under `packages/game-data`.
- Cross-runtime types live in `packages/shared`.
