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
  
  // SOLUCIÓN HÍBRIDA: Si no hay token en localStorage, intentar obtenerlo
  // NOTA: Para Auth0, el token no se puede extraer directamente del servidor
  // porque está encriptado en cookies. Los usuarios de Auth0 deben usar
  // el hook useUser() directamente en el cliente y pasar el token manualmente.
  if (!token && typeof window !== 'undefined') {
    try {
      // Intentar obtener token (puede ser JWT tradicional del header o Auth0)
      const tokenResponse = await fetch(`${API_BASE}/auth/get-token`, {
        method: 'GET',
        credentials: 'include', // Incluir cookies de Auth0
      });
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        
        // Si hay un error específico de Auth0 (sesión detectada pero no se puede extraer token)
        if (tokenData.error === 'AUTH0_SESSION_DETECTED') {
          logger.debug('api-client', 'Sesión de Auth0 detectada pero no se puede extraer token automáticamente', {
            message: tokenData.message
          });
          // No hacer nada - el usuario debe usar useUser() hook de Auth0 en el cliente
        } else if (tokenData.token && typeof tokenData.token === 'string') {
          // Token JWT tradicional encontrado
          const newToken = tokenData.token;
          token = newToken;
          // Guardar token en localStorage para futuras peticiones
          localStorage.setItem('authToken', newToken);
          logger.info('api-client', 'Token obtenido y guardado en localStorage', {
            type: tokenData.type || 'unknown',
            source: tokenData.source || 'unknown'
          });
        }
      } else if (tokenResponse.status === 401) {
        // No hay token disponible - esto es normal si el usuario no está autenticado
        logger.debug('api-client', 'No hay token disponible (401)');
      }
    } catch (tokenError) {
      // Si falla, no es crítico - simplemente no hay token disponible
      logger.debug('api-client', 'No se pudo obtener token', { error: tokenError });
    }
  }
  
  // Construir headers - asegurar que Content-Type no se sobrescriba
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Agregar headers personalizados del init (pero no sobrescribir Content-Type si ya está)
  if (init?.headers) {
    const initHeaders = init.headers as Record<string, string>;
    Object.keys(initHeaders).forEach(key => {
      if (key.toLowerCase() !== 'content-type') {
        headers[key] = initHeaders[key];
      }
    });
  }

  // Agregar token JWT si existe (SIEMPRE como Bearer)
  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
    logger.debug('api-client', 'Token agregado al header Authorization', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...'
    });
  } else {
    // Si no hay token y estamos en el cliente, loguear advertencia
    if (typeof window !== 'undefined') {
      logger.warn('api-client', 'No token found in localStorage or Auth0 for request', { url });
    }
  }

  console.groupCollapsed(`API ${init?.method ?? 'GET'} ${url}`);
  console.time(`API ${url}`);
  console.log('Request headers:', { ...headers, Authorization: token ? 'Bearer ***' : 'none' });
  
  try {
    let res = await fetch(url, {
      ...init,
      headers: headers as HeadersInit,
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

    // SOLUCIÓN: Hacer UN SOLO clone al principio y reutilizarlo
    const resClone = res.clone();

    // Obtener preview del body (solo en desarrollo)
    let bodyPreview: any = null;
    if (process.env.NODE_ENV === 'development') {
      try {
        bodyPreview = await resClone.json();
      } catch {
        try {
          // Si JSON falla, crear NUEVO clone para text
          const textClone = res.clone();
          bodyPreview = await textClone.text();
        } catch {
          bodyPreview = null;
        }
      }
    }

    console.table([{ status: res.status, ok: res.ok }]);
    if (bodyPreview) console.log('response preview:', bodyPreview);
    console.timeEnd(`API ${url}`);
    console.groupEnd();

    if (!res.ok) {
      // Intentar obtener el mensaje de error del body
      let errorMessage = `${res.status}: ${res.statusText}`;
      let errorBody: any = null;

      try {
        // En desarrollo, ya tenemos el body en bodyPreview
        if (process.env.NODE_ENV === 'development' && bodyPreview) {
          errorBody = bodyPreview;
        } else {
          // En producción, crear un clone nuevo
          const errorClone = res.clone();
          errorBody = await errorClone.json();
        }
        errorMessage = errorBody.message || errorBody.error || errorMessage;
        console.error('API Error Details:', {
          status: res.status,
          statusText: res.statusText,
          body: errorBody,
          url: url
        });
      } catch {
        try {
          const errorTextClone = res.clone();
          const errorText = await errorTextClone.text();
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

    // CRÍTICO: Para respuestas exitosas, reutilizar el bodyPreview en desarrollo
    // o leer directamente de res (NO un clone) en producción
    if (process.env.NODE_ENV === 'development' && bodyPreview) {
      return bodyPreview as T;
    }

    // En producción o si no hay preview, leer directamente de res
    return res.json() as Promise<T>;
  } catch (e) {
    console.timeEnd(`API ${url}`);
    console.groupEnd();
    logger.error('api-client', e);
    throw e;
  }
}
