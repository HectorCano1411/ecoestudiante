/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/api-server.ts
import 'server-only';
import { logger } from '@/lib/logger';

// IMPORTANTE: Los route handlers deben llamar al Gateway (puerto 8888), no directamente al backend
// El Gateway maneja el enrutamiento, autenticación y seguridad
const GATEWAY_BASE = process.env.GATEWAY_BASE_URL ?? 'http://localhost:8888';
const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? 'http://localhost:18080';

// Usar Gateway por defecto, pero permitir override para casos especiales
const API_BASE = process.env.USE_GATEWAY !== 'false' ? GATEWAY_BASE : BACKEND_BASE;

export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  logger.info('api-server', '→', url, { 
    base: API_BASE, 
    path, 
    usingGateway: API_BASE === GATEWAY_BASE,
    method: init?.method || 'GET'
  });

  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const clone = res.clone();
  let preview: any = null;
  try { preview = await clone.json(); } catch { preview = await res.clone().text(); }
  // preview is used for logging purposes
  logger.debug('api-server', 'response preview', preview);

  if (!res.ok) {
    // Intentar extraer el mensaje de error del body
    let errorMessage = `${res.status}: ${res.statusText}`;
    try {
      const errorBody = await res.clone().json();
      if (errorBody.message) {
        errorMessage = errorBody.message;
      } else if (errorBody.error) {
        errorMessage = errorBody.error;
      }
    } catch {
      // Si no se puede parsear como JSON, usar el texto
      try {
        const errorText = await res.clone().text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Mantener el mensaje por defecto
      }
    }
    
    const error = new Error(`BACKEND ${res.status}: ${errorMessage}`) as any;
    error.status = res.status;
    error.response = res;
    throw error;
  }
  return res.json() as Promise<T>;
}
// src/lib/api-server.ts