# WebSocket Events

This prototype reserves Socket.IO for gameplay events, but the Phase 1/2 scaffold only mounts the transport and connection plumbing.

## Current status

- Server connection handling exists.
- The gameplay event handlers are placeholders.
- Event payload contracts are defined in `packages/shared/src/events`.

## Future contract

- Client actions will be validated on the server before they mutate game state.
- Sanitized public state and private player state will be emitted separately.
