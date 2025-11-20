export type RecordType = 'A'|'AAAA'|'CNAME'|'TXT'|'MX'|'NS'|'SOA'

export interface ResolveRequest {
  name: string;
  type: RecordType;
  servers?: string[];
  dnssec?: boolean;
}

export interface Answer { value: string; ttl?: number }
export interface Result {
  server: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  rtt_ms?: number;
  answers?: Answer[];
  authority?: string[];
  ad?: boolean;
  when: string;
}
export interface ResolveResponse {
  name: string;
  type: RecordType;
  results: Result[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function resolveDNS(req: ResolveRequest): Promise<ResolveResponse> {
  const res = await fetch(`${API_BASE}/api/resolve`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status} ${text}`)
  }
  return res.json()
}
