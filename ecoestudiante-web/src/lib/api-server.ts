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

  // Construir headers - preservar Authorization si existe
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Agregar headers del init, preservando Authorization
  if (init?.headers) {
    const initHeaders = init.headers as Record<string, string>;
    Object.keys(initHeaders).forEach(key => {
      headers[key] = initHeaders[key];
    });
  }

  logger.debug('api-server', 'Request headers', {
    hasAuthorization: !!headers['Authorization'],
    authorizationPrefix: headers['Authorization']?.substring(0, 20),
    allHeaders: Object.keys(headers),
  });

  const res = await fetch(url, {
    ...init,
    headers: headers as HeadersInit,
  });

  const clone = res.clone();
  let preview: any = null;
  try { preview = await clone.json(); } catch { preview = await res.clone().text(); }
  // preview is used for logging purposes
  logger.debug('api-server', 'response preview', preview);

  if (!res.ok) {
    // Intentar extraer el mensaje de error del body
    let errorMessage = `${res.status}: ${res.statusText}`;
    let errorDetails: any = null;
    let errorCode: string | null = null;
    
    try {
      const errorBody = await res.clone().json();
      logger.debug('api-server', 'Error body recibido', errorBody);
      
      // El ErrorResponse tiene estructura: { error: { code, message, correlationId, details } }
      if (errorBody.error) {
        // Extraer código de error
        if (errorBody.error.code) {
          errorCode = errorBody.error.code;
        }
        
        // Extraer mensaje
        if (errorBody.error.message) {
          errorMessage = errorBody.error.message;
        } else if (typeof errorBody.error === 'string') {
          errorMessage = errorBody.error;
        }
        
        // Extraer detalles de validación si existen
        if (errorBody.error.details && Array.isArray(errorBody.error.details)) {
          errorDetails = errorBody.error.details;
          // Crear mensaje más descriptivo con los detalles
          const validationMessages = errorBody.error.details
            .map((d: any) => {
              const field = d.field || d.path || 'campo';
              const msg = d.message || d.defaultMessage || 'error de validación';
              return `${field}: ${msg}`;
            })
            .join('; ');
          if (validationMessages) {
            errorMessage = `Error de validación: ${validationMessages}`;
          }
        }
      } else if (errorBody.message) {
        errorMessage = errorBody.message;
      } else if (typeof errorBody.error === 'string') {
        errorMessage = errorBody.error;
      } else if (errorBody.code) {
        errorCode = errorBody.code;
        errorMessage = `${errorBody.code}: ${errorBody.message || 'Unknown error'}`;
      }
    } catch (parseError) {
      // Si no se puede parsear como JSON, usar el texto
      try {
        const errorText = await res.clone().text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Mantener el mensaje por defecto
        logger.warn('api-server', 'No se pudo extraer mensaje de error', { status: res.status });
      }
    }
    
    const error = new Error(`BACKEND ${res.status}: ${errorMessage}`) as any;
    error.status = res.status;
    error.response = res;
    error.details = errorDetails;
    error.code = errorCode;
    error.error = errorDetails ? { details: errorDetails, code: errorCode } : { code: errorCode };
    throw error;
  }
  return res.json() as Promise<T>;
}
// src/lib/api-server.ts