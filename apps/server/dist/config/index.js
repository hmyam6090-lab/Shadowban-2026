export function getServerConfig() {
    return {
        port: Number(process.env.PORT ?? 3001),
        clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
        nodeEnv: process.env.NODE_ENV ?? 'development'
    };
}
