import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { createServer } from 'node:http';
import { getServerConfig } from './config/index.js';
import { healthController } from './controllers/healthController.js';
import { getContentCatalog } from './services/contentService.js';
import { gameManager } from './services/gameService.js';
import { createSocketServer } from './socket/socket.js';
const config = getServerConfig();
const app = express();
const httpServer = createServer(app);
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.get('/api/health', healthController);
app.post('/api/games', (request, response) => {
    const hostName = typeof request.body?.hostName === 'string' ? request.body.hostName.trim() : '';
    const totalRounds = Number.isInteger(request.body?.totalRounds) ? Number(request.body.totalRounds) : undefined;
    if (!hostName) {
        response.status(400).json({ error: 'hostName is required' });
        return;
    }
    const game = gameManager.createGame(hostName, totalRounds ?? 6);
    response.status(201).json({
        gameId: game.gameId,
        gameCode: game.gameCode,
        playerId: game.hostPlayerId
    });
});
app.post('/api/games/:gameCode/join', (request, response) => {
    const gameCode = String(request.params.gameCode).trim().toUpperCase();
    const playerName = typeof request.body?.playerName === 'string' ? request.body.playerName.trim() : '';
    if (!playerName) {
        response.status(400).json({ error: 'playerName is required' });
        return;
    }
    try {
        const player = gameManager.joinGame(gameCode, playerName);
        const game = gameManager.getGameByCode(gameCode);
        response.status(201).json({
            gameId: game.gameId,
            playerId: player.id
        });
    }
    catch (error) {
        response.status(404).json({ error: error instanceof Error ? error.message : 'Unable to join game' });
    }
});
app.get('/api/games/:gameCode', (request, response) => {
    try {
        const gameCode = String(request.params.gameCode).trim().toUpperCase();
        const game = gameManager.getGameByCode(gameCode);
        response.json(gameManager.getPublicState(game.gameId));
    }
    catch (error) {
        response.status(404).json({ error: error instanceof Error ? error.message : 'Game not found' });
    }
});
app.get('/api/crises', (_request, response) => {
    const crises = getContentCatalog().crises.map((crisis) => {
        return {
            id: crisis.id,
            name: crisis.name,
            description: crisis.description,
            responses: crisis.responses,
            evidenceIds: crisis.evidenceIds,
            noiseIds: crisis.noiseIds
        };
    });
    response.json(crises);
});
app.get('/', (_request, response) => {
    response.json({ status: 'shadowban-server-ready' });
});
createSocketServer(httpServer);
httpServer.listen(config.port, () => {
    console.log(`ShadowBan server listening on http://localhost:${config.port}`);
});
