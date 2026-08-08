import { Server } from 'socket.io';
import { getServerConfig } from '../config/index.js';
import { registerSocketHandlers } from './handlers/index.js';
export function createSocketServer(httpServer) {
    const config = getServerConfig();
    const io = new Server(httpServer, {
        cors: {
            origin: config.clientOrigin,
            credentials: true
        }
    });
    registerSocketHandlers(io);
    return io;
}
