export interface ServerConfig {
  port: number;
  clientOrigin: string;
  nodeEnv: string;
}

export function getServerConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    nodeEnv: process.env.NODE_ENV ?? 'development'
  };
}