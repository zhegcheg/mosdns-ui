
export enum View {
  DASHBOARD = 'DASHBOARD',
  CONFIG = 'CONFIG',
  UPSTREAMS = 'UPSTREAMS',
  LOGS = 'LOGS',
  AI_ASSISTANT = 'AI_ASSISTANT'
}

export interface UpstreamServer {
  id: string;
  name: string;
  address: string;
  protocol: 'udp' | 'tcp' | 'tls' | 'https';
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  requests: number;
}

export interface DNSRequest {
  timestamp: string;
  domain: string;
  type: string;
  client: string;
  upstream: string;
  latency: number;
  status: 'NOERROR' | 'NXDOMAIN' | 'SERVFAIL';
}

export interface StatItem {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}
