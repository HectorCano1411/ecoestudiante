/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/api-client.ts
import { logger } from '@/lib/logger';

export const API_BASE = '/api';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh token inválido, limpiar localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('username');
          localStorage.removeItem('userId');
        }
        throw new Error('Refresh token inválido');
      }

      const data = await response.json();
      
      // Guardar nuevos tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      return data.token;
    } catch (error) {
      // Limpiar tokens en caso de error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
      }
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  logger.debug('api-client', '→', url, init);

  // Obtener token del localStorage si existe
  let token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  };

  // Agregar token JWT si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Si no hay token y estamos en el cliente, loguear advertencia
    if (typeof window !== 'undefined') {
      logger.warn('api-client', 'No token found in localStorage for request', { url });
    }
  }

  console.groupCollapsed(`API ${init?.method ?? 'GET'} ${url}`);
  console.time(`API ${url}`);
  console.log('Request headers:', { ...headers, Authorization: token ? 'Bearer ***' : 'none' });
  
  try {
    let res = await fetch(url, {
      ...init,
      headers,
    });

    // Si el token expiró (401), intentar refrescar
    if (res.status === 401 && token && typeof window !== 'undefined') {
      logger.info('api-client', 'Token expired, attempting refresh', { url });
      try {
        token = await refreshAccessToken();
        headers['Authorization'] = `Bearer ${token}`;
        
        // Reintentar la petición original con el nuevo token
        logger.info('api-client', 'Retrying request with refreshed token', { url });
        res = await fetch(url, {
          ...init,
          headers,
        });
      } catch (refreshError) {
        logger.error('api-client', 'Error refreshing token', refreshError);
        console.error('Error al refrescar token:', refreshError);
        // Redirigir al login si el refresh falla
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw refreshError;
      }
    }

    const clone = res.clone();
    let bodyPreview: any = null;
    try { bodyPreview = await clone.json(); } catch { bodyPreview = await clone.text(); }

    console.table([{ status: res.status, ok: res.ok }]);
    console.log('response preview:', bodyPreview);
    console.timeEnd(`API ${url}`);
    console.groupEnd();

    if (!res.ok) {
      // Intentar obtener el mensaje de error del body
      let errorMessage = `${res.status}: ${res.statusText}`;
      try {
        const errorBody = await res.clone().json();
        errorMessage = errorBody.message || errorBody.error || errorMessage;
        console.error('API Error Details:', {
          status: res.status,
          statusText: res.statusText,
          body: errorBody,
          url: url
        });
      } catch {
        try {
          const errorText = await res.clone().text();
          errorMessage = errorText || errorMessage;
          console.error('API Error Text:', {
            status: res.status,
            statusText: res.statusText,
            body: errorText,
            url: url
          });
        } catch {
          console.error('API Error (no body):', {
            status: res.status,
            statusText: res.statusText,
            url: url
          });
        }
      }
      
      const error = new Error(`API ${errorMessage}`) as any;
      error.status = res.status;
      error.response = res;
      throw error;
    }
    return res.json() as Promise<T>;
  } catch (e) {
    console.timeEnd(`API ${url}`);
    console.groupEnd();
    logger.error('api-client', e);
    throw e;
  }
}
