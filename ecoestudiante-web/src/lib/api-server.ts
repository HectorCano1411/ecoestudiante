// src/lib/api-server.ts
import 'server-only';
import { logger } from '@/lib/logger';

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? 'http://localhost:18080';

export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BACKEND_BASE}${path}`;
  logger.info('api-server', '→', url, init);

  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const clone = res.clone();
  let preview: any = null;
  try { preview = await clone.json(); } catch { preview = await clone.text(); }

  logger.debug('api-server', '←', res.status, { preview });

  if (!res.ok) {
    throw new Error(`BACKEND ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
// src/lib/api-server.ts