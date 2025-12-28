
import { UpstreamServer, DNSRequest, StatItem } from '../types';

// --- Configuration ---
let BASE_URL = localStorage.getItem('MOSDNS_API_URL') || 'http://localhost:5335';
let INSTANCE_NAME = localStorage.getItem('MOSDNS_INSTANCE_NAME') || 'My MosDNS';

export const setApiUrl = (url: string) => {
  BASE_URL = url.replace(/\/$/, ''); // Remove trailing slash
  localStorage.setItem('MOSDNS_API_URL', BASE_URL);
};

export const getApiUrl = () => BASE_URL;

export const setInstanceName = (name: string) => {
  INSTANCE_NAME = name || 'My MosDNS';
  localStorage.setItem('MOSDNS_INSTANCE_NAME', INSTANCE_NAME);
};

export const getInstanceName = () => INSTANCE_NAME;

// --- Mock Data Fallbacks ---
const MOCK_UPSTREAMS: UpstreamServer[] = [
  { id: '1', name: 'Google DNS', address: '8.8.8.8', protocol: 'https', status: 'online', latency: 12, requests: 45021 },
  { id: '2', name: 'Cloudflare', address: '1.1.1.1', protocol: 'tls', status: 'online', latency: 8, requests: 89012 },
  { id: '3', name: 'OpenDNS', address: '208.67.222.222', protocol: 'udp', status: 'degraded', latency: 45, requests: 1205 },
  { id: '4', name: 'Local Cache', address: '127.0.0.1', protocol: 'udp', status: 'online', latency: 0, requests: 156722 },
];

const MOCK_HISTORY = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  queries: Math.floor(Math.random() * 500) + 100,
  cacheHits: Math.floor(Math.random() * 300) + 50,
}));

const MOCK_LOGS: DNSRequest[] = [
  { timestamp: '2024-05-20 10:45:12', domain: 'google.com', type: 'A', client: '192.168.1.5', upstream: 'Cloudflare', latency: 9, status: 'NOERROR' },
  { timestamp: '2024-05-20 10:45:14', domain: 'ads.tracking.com', type: 'A', client: '192.168.1.12', upstream: 'Adblock-Plugin', latency: 1, status: 'NXDOMAIN' },
  { timestamp: '2024-05-20 10:45:18', domain: 'github.com', type: 'AAAA', client: '192.168.1.5', upstream: 'Google DNS', latency: 15, status: 'NOERROR' },
];

const MOCK_STATS = {
  totalQueries: 1245672,
  avgLatency: 14,
  cacheHitRate: 64.2,
  activeClients: 42
};

const MOCK_DOMAINS = [
  { domain: 'google.com', count: '45,210', pct: 85 },
  { domain: 'github.com', count: '12,402', pct: 62 },
  { domain: 'api.slack.com', count: '8,901', pct: 45 },
  { domain: 'netflix.com', count: '7,522', pct: 38 },
  { domain: 'openai.com', count: '6,100', pct: 25 },
];

const INITIAL_YAML = `log:
  level: info
  file: "/var/log/mosdns.log"

plugins:
  - tag: main_sequence
    type: sequence
    args:
      - exec: $primary_dns
      - exec: query_summary

  - tag: primary_dns
    type: forward
    args:
      upstream:
        - addr: 1.1.1.1
        - addr: 8.8.8.8`;

// --- Fetch Logic ---

const fetchOrFallback = async <T>(path: string, fallback: T, timeoutMs = 2000): Promise<{ data: T, isReal: boolean }> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(id);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return { data, isReal: true };
  } catch (error) {
    // Intentionally swallow error to return fallback for demo purposes
    // console.debug(`Fetch failed for ${path}, using fallback.`); 
    return { data: fallback, isReal: false };
  }
};

// --- API Methods ---

export const api = {
  getStats: () => fetchOrFallback('/api/v1/stats', MOCK_STATS),
  getHistory: () => fetchOrFallback('/api/v1/history', MOCK_HISTORY),
  getTopDomains: () => fetchOrFallback('/api/v1/top_domains', MOCK_DOMAINS),
  getUpstreams: () => fetchOrFallback('/api/v1/upstreams', MOCK_UPSTREAMS),
  getLogs: () => fetchOrFallback('/api/v1/logs', MOCK_LOGS),
  getConfig: () => fetchOrFallback('/api/v1/config', { yaml: INITIAL_YAML }),
  
  saveConfig: async (yaml: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml })
      });
      if (!response.ok) throw new Error('Failed to save');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    }
  }
};
