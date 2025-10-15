// src/lib/api-client.ts
import { logger } from '@/lib/logger';

export const API_BASE = '/api';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  logger.debug('api-client', '→', url, init);

  console.groupCollapsed(`API ${init?.method ?? 'GET'} ${url}`);
  console.time(`API ${url}`);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });

    const clone = res.clone();
    let bodyPreview: any = null;
    try { bodyPreview = await clone.json(); } catch { bodyPreview = await clone.text(); }

    console.table([{ status: res.status, ok: res.ok }]);
    console.log('response preview:', bodyPreview);
    console.timeEnd(`API ${url}`);
    console.groupEnd();

    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  } catch (e) {
    console.timeEnd(`API ${url}`);
    console.groupEnd();
    logger.error('api-client', e);
    throw e;
  }
}
