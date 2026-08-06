export interface ConnectionStatusProps {
  status: 'unknown' | 'online' | 'offline';
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return <div className={`connection-status ${status}`}>Server: {status}</div>;
}
