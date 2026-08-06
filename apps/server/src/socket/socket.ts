import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '@shadowban/shared';

import { getServerConfig } from '../config/index.js';
import { registerSocketHandlers } from './handlers/index.js';

export function createSocketServer(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const config = getServerConfig();

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: config.clientOrigin,
      credentials: true
    }
  });

  registerSocketHandlers(io);

  return io;
}