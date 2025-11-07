package com.ecoestudiante.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * Utilidad para manejar tokens de autenticación (JWT propios y Auth0).
 * Proporciona una interfaz unificada para extraer información de tokens independientemente de su origen.
 */
@Component
public class TokenUtil {

    private static final Logger logger = LoggerFactory.getLogger(TokenUtil.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final String AUTH0_ISSUER_PATTERN = "auth0.com";

    /**
     * Detecta si un token es de Auth0 verificando el issuer en el payload.
     * 
     * @param token Token JWT a verificar
     * @return true si el token es de Auth0, false en caso contrario
     */
    public boolean isAuth0Token(String token) {
        try {
            Map<String, Object> claims = decodeTokenPayload(token);
            if (claims == null) {
                return false;
            }
            
            Object iss = claims.get("iss");
            return iss != null && iss.toString().contains(AUTH0_ISSUER_PATTERN);
        } catch (Exception e) {
            logger.debug("Error detectando tipo de token: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Extrae el identificador único del usuario del token.
     * Para tokens Auth0, extrae el 'sub'.
     * Para tokens propios, extrae el 'userId' del claim.
     * 
     * @param token Token JWT
     * @return Identificador único del usuario (sub de Auth0 o userId del token propio)
     */
    public String extractUserId(String token) {
        try {
            Map<String, Object> claims = decodeTokenPayload(token);
            if (claims == null) {
                return null;
            }

            // Para Auth0, usar 'sub'
            if (isAuth0Token(token)) {
                Object sub = claims.get("sub");
                if (sub != null) {
                    logger.debug("UserId extraído de token Auth0 (sub): {}", sub);
                    return sub.toString();
                }
            }

            // Para tokens propios, usar 'userId'
            Object userId = claims.get("userId");
            if (userId != null) {
                logger.debug("UserId extraído de token propio: {}", userId);
                return userId.toString();
            }

            // Fallback: intentar con 'sub' si existe
            Object sub = claims.get("sub");
            if (sub != null) {
                logger.debug("UserId extraído usando fallback (sub): {}", sub);
                return sub.toString();
            }

            return null;
        } catch (Exception e) {
            logger.warn("Error extrayendo userId del token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extrae el username/email del token.
     * Para tokens Auth0, intenta 'email', luego 'name', y finalmente 'sub' como fallback.
     * Para tokens propios, está en el 'subject'.
     * 
     * @param token Token JWT
     * @return Username, email o sub del usuario (nunca null si el token es válido)
     */
    public String extractUsername(String token) {
        try {
            Map<String, Object> claims = decodeTokenPayload(token);
            if (claims == null) {
                return null;
            }

            // Para Auth0, intentar email primero, luego name, y finalmente sub como fallback
            if (isAuth0Token(token)) {
                Object email = claims.get("email");
                if (email != null) {
                    return email.toString();
                }
                Object name = claims.get("name");
                if (name != null) {
                    return name.toString();
                }
                // Fallback: usar sub si no hay email ni name
                Object sub = claims.get("sub");
                if (sub != null) {
                    logger.debug("Usando 'sub' como username para token Auth0: {}", sub);
                    return sub.toString();
                }
            }

            // Para tokens propios, el subject es el username
            Object sub = claims.get("sub");
            if (sub != null) {
                return sub.toString();
            }

            return null;
        } catch (Exception e) {
            logger.debug("Error extrayendo username del token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Valida si un token es válido (no expirado).
     * Para tokens Auth0, verifica la expiración.
     * Para tokens propios, requiere validación adicional con JwtUtil.
     * 
     * @param token Token JWT
     * @return true si el token no está expirado, false en caso contrario
     */
    public boolean isTokenValid(String token) {
        try {
            Map<String, Object> claims = decodeTokenPayload(token);
            if (claims == null) {
                return false;
            }

            // Verificar expiración
            Object exp = claims.get("exp");
            if (exp != null) {
                long expirationTime = ((Number) exp).longValue() * 1000; // Convertir a milisegundos
                long currentTime = System.currentTimeMillis();
                boolean isValid = currentTime < expirationTime;
                
                if (!isValid) {
                    logger.debug("Token expirado. Exp: {}, Actual: {}", expirationTime, currentTime);
                }
                
                return isValid;
            }

            // Si no hay campo exp, asumir válido (para tokens propios que se validan con JwtUtil)
            return true;
        } catch (Exception e) {
            logger.warn("Error validando token: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Normaliza un userId a UUID válido.
     * Si el userId ya es un UUID válido, lo retorna.
     * Si es un Auth0 sub u otro formato, genera un UUID determinístico.
     * 
     * @param userId Identificador del usuario (UUID o Auth0 sub)
     * @return UUID normalizado
     */
    public UUID normalizeUserIdToUuid(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId no puede ser nulo o vacío");
        }
        
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            // No es un UUID, generar uno determinístico basado en el userId
            UUID deterministicUuid = UUID.nameUUIDFromBytes(userId.getBytes());
            logger.debug("UserId '{}' normalizado a UUID determinístico: {}", userId, deterministicUuid);
            return deterministicUuid;
        }
    }

    /**
     * Decodifica el payload de un token JWT sin verificar la firma.
     * 
     * @param token Token JWT
     * @return Mapa con los claims del token, o null si hay error
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> decodeTokenPayload(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                logger.debug("Token JWT inválido: no tiene 3 partes");
                return null;
            }
            
            // Decodificar el payload (parte 2)
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            return (Map<String, Object>) objectMapper.readValue(payload, Map.class);
        } catch (Exception e) {
            logger.debug("Error decodificando payload del token: {}", e.getMessage());
            return null;
        }
    }
}

