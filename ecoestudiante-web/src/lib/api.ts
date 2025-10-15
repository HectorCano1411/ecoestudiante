// src/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api';
const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? 'http://localhost:18080';

/**
 * fetch para el CLIENTE (browser). Usa el proxy de Next (/api -> backend).
 * Úsalo en componentes/client o server components que llamen rutas relativas.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    // Si luego necesitas cookies/tokens:
    // credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * fetch para el SERVIDOR (route handlers / acciones / SSR).
 * Llama directo al backend Spring, sin pasar por el proxy de Next.
 */
export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`BACKEND ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}
