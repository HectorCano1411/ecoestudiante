package com.ecoestudiante.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Filtro global de logging para Spring Cloud Gateway.
 * 
 * Registra todas las peticiones y respuestas con información detallada:
 * - Método HTTP, ruta, headers, query params
 * - Tiempo de respuesta
 * - Código de estado HTTP
 * - Información de autenticación (si aplica)
 * 
 * Especialmente útil para debugging de problemas de login y autenticación.
 */
@Component
public class LoggingFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(LoggingFilter.class);
    private static final String START_TIME = "startTime";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();
        String queryParams = request.getURI().getQuery() != null ? "?" + request.getURI().getQuery() : "";
        
        // Registrar inicio de petición
        Instant startTime = Instant.now();
        exchange.getAttributes().put(START_TIME, startTime);
        
        // Extraer información relevante
        HttpHeaders headers = request.getHeaders();
        String authorization = headers.getFirst(HttpHeaders.AUTHORIZATION);
        String userAgent = headers.getFirst(HttpHeaders.USER_AGENT);
        String contentType = headers.getFirst(HttpHeaders.CONTENT_TYPE);
        String origin = headers.getFirst(HttpHeaders.ORIGIN);
        String referer = headers.getFirst(HttpHeaders.REFERER);
        
        // Log detallado de la petición entrante
        logger.info("═══════════════════════════════════════════════════════════════");
        logger.info("🔵 [GATEWAY] REQUEST INCOMING");
        logger.info("   Method: {}", method);
        logger.info("   Path: {}{}", path, queryParams);
        logger.info("   Remote Address: {}", request.getRemoteAddress());
        logger.info("   Origin: {}", origin != null ? origin : "N/A");
        logger.info("   Referer: {}", referer != null ? referer : "N/A");
        logger.info("   User-Agent: {}", userAgent != null ? userAgent : "N/A");
        logger.info("   Content-Type: {}", contentType != null ? contentType : "N/A");
        
        // Log de autenticación (sin exponer el token completo)
        if (authorization != null) {
            if (authorization.startsWith("Bearer ")) {
                String tokenPreview = authorization.length() > 30 
                    ? authorization.substring(0, 30) + "..." 
                    : authorization;
                logger.info("   Authorization: {} (Bearer token presente)", tokenPreview);
            } else {
                logger.info("   Authorization: {} (formato no Bearer)", authorization.length() > 30 
                    ? authorization.substring(0, 30) + "..." 
                    : authorization);
            }
        } else {
            logger.info("   Authorization: N/A (sin token)");
        }
        
        // Log de headers relevantes para debugging
        List<String> relevantHeaders = headers.entrySet().stream()
            .filter(entry -> {
                String key = entry.getKey().toLowerCase();
                return key.contains("x-") || key.contains("trace") || key.contains("request");
            })
            .map(entry -> entry.getKey() + "=" + String.join(", ", entry.getValue()))
            .collect(Collectors.toList());
        
        if (!relevantHeaders.isEmpty()) {
            logger.info("   Headers relevantes: {}", String.join("; ", relevantHeaders));
        }
        
        // Para peticiones POST/PUT, log del body (si es pequeño)
        if (("POST".equals(method) || "PUT".equals(method)) && path.contains("/auth/login")) {
            logger.info("   ⚠️  Petición de LOGIN detectada - monitoreando...");
        }
        
        logger.info("═══════════════════════════════════════════════════════════════");
        
        // Continuar con la cadena de filtros
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            ServerHttpResponse response = exchange.getResponse();
            Instant endTime = Instant.now();
            Duration duration = Duration.between(startTime, endTime);
            int statusCode = 0;
            if (response.getStatusCode() != null) {
                statusCode = response.getStatusCode().value();
            }
            
            // Log detallado de la respuesta
            logger.info("═══════════════════════════════════════════════════════════════");
            logger.info("🟢 [GATEWAY] RESPONSE OUTGOING");
            logger.info("   Method: {}", method);
            logger.info("   Path: {}{}", path, queryParams);
            logger.info("   Status: {} {}", statusCode, getStatusMessage(statusCode));
            logger.info("   Duration: {} ms", duration.toMillis());
            
            // Log de headers de respuesta relevantes
            HttpHeaders responseHeaders = response.getHeaders();
            String location = responseHeaders.getFirst(HttpHeaders.LOCATION);
            if (location != null) {
                logger.info("   Location: {}", location);
            }
            
            // Log especial para errores
            if (statusCode >= 400) {
                logger.warn("   ⚠️  ERROR RESPONSE - Status: {}", statusCode);
                if (statusCode == 401) {
                    logger.warn("   ⚠️  UNAUTHORIZED - Verificar token o credenciales");
                } else if (statusCode == 403) {
                    logger.warn("   ⚠️  FORBIDDEN - Usuario no tiene permisos");
                } else if (statusCode == 404) {
                    logger.warn("   ⚠️  NOT FOUND - Ruta no encontrada");
                } else if (statusCode >= 500) {
                    logger.error("   ❌ SERVER ERROR - Problema en el backend");
                }
            } else if (statusCode == 200 || statusCode == 201) {
                logger.info("   ✅ SUCCESS - Petición procesada correctamente");
            }
            
            logger.info("═══════════════════════════════════════════════════════════════");
            logger.info(""); // Línea en blanco para separar peticiones
        }));
    }
    
    private String getStatusMessage(int statusCode) {
        return switch (statusCode) {
            case 200 -> "OK";
            case 201 -> "Created";
            case 400 -> "Bad Request";
            case 401 -> "Unauthorized";
            case 403 -> "Forbidden";
            case 404 -> "Not Found";
            case 500 -> "Internal Server Error";
            case 502 -> "Bad Gateway";
            case 503 -> "Service Unavailable";
            default -> "Unknown";
        };
    }
    
    @Override
    public int getOrder() {
        // Ejecutar antes que otros filtros (orden bajo = alta prioridad)
        return -1;
    }
}

