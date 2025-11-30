package com.ecoestudiante.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Filtro global que crea automáticamente usuarios Auth0 en la base de datos
 * cuando hacen login por primera vez.
 *
 * FLUJO:
 * 1. Detecta si el JWT es de Auth0 (verifica el issuer)
 * 2. Extrae sub, email y name del token
 * 3. Genera UUID determinístico desde el sub (usando TokenUtil.java lógica)
 * 4. Verifica si el usuario existe en app_user
 * 5. Si no existe, lo crea con auth_provider='auth0'
 *
 * ARQUITECTURA:
 * - Se ejecuta DESPUÉS de la validación del JWT (order = 10)
 * - Usa R2DBC para acceso reactivo a PostgreSQL
 * - No bloquea el flujo de requests
 * - Logging detallado para debugging
 *
 * CONFIGURACIÓN:
 * - Solo se activa si Auth0 está configurado (r2dbc.url presente)
 * - Requiere dependencias: spring-boot-starter-data-r2dbc, r2dbc-postgresql
 */
@Component
@ConditionalOnProperty(name = "spring.r2dbc.url")
public class Auth0UserAutoCreateFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(Auth0UserAutoCreateFilter.class);

    private final DatabaseClient databaseClient;

    public Auth0UserAutoCreateFilter(DatabaseClient databaseClient) {
        this.databaseClient = databaseClient;
        logger.info("✅ [Auth0UserAutoCreateFilter] Filtro inicializado - Auto-create habilitado");
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Obtener el contexto de seguridad (si existe)
        return ReactiveSecurityContextHolder.getContext()
            .flatMap(securityContext -> {
                Authentication authentication = securityContext.getAuthentication();

                // Verificar si es un JWT de Auth0
                if (authentication instanceof JwtAuthenticationToken jwtAuth) {
                    Jwt jwt = jwtAuth.getToken();
                    String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "";

                    // Solo procesar si es de Auth0 (issuer contiene "auth0.com")
                    if (issuer.contains("auth0.com")) {
                        String sub = jwt.getSubject();
                        String email = jwt.getClaimAsString("email");
                        String name = jwt.getClaimAsString("name");

                        logger.debug("[Auth0UserAutoCreateFilter] Token Auth0 detectado: sub={}, email={}, name={}",
                            sub, email, name);

                        // Crear usuario si no existe (asíncrono, no bloquea)
                        return ensureUserExists(sub, email, name)
                            .doOnSuccess(created -> {
                                if (created) {
                                    logger.info("✅ [Auth0UserAutoCreateFilter] Usuario Auth0 creado exitosamente: sub={}", sub);
                                } else {
                                    logger.debug("[Auth0UserAutoCreateFilter] Usuario Auth0 ya existe: sub={}", sub);
                                }
                            })
                            .doOnError(error -> {
                                logger.error("❌ [Auth0UserAutoCreateFilter] Error creando usuario Auth0: sub={}, error={}",
                                    sub, error.getMessage(), error);
                            })
                            .onErrorResume(error -> {
                                // No fallar el request si hay error creando el usuario
                                // El backend manejará el error apropiadamente
                                logger.warn("⚠️  [Auth0UserAutoCreateFilter] Continuando request a pesar del error");
                                return Mono.empty();
                            })
                            .then(chain.filter(exchange));
                    }
                }

                // Si no es Auth0, continuar normalmente
                return chain.filter(exchange);
            })
            .switchIfEmpty(chain.filter(exchange)); // Si no hay SecurityContext, continuar
    }

    /**
     * Verifica si el usuario existe en la BD y lo crea si no existe.
     *
     * @param auth0Sub Subject del token Auth0 (e.g., "google-oauth2|123456")
     * @param email Email del usuario (puede ser null)
     * @param name Nombre del usuario (puede ser null)
     * @return Mono<Boolean> - true si se creó el usuario, false si ya existía
     */
    private Mono<Boolean> ensureUserExists(String auth0Sub, String email, String name) {
        if (auth0Sub == null || auth0Sub.isBlank()) {
            logger.warn("⚠️  [Auth0UserAutoCreateFilter] auth0Sub es null o vacío, saltando creación");
            return Mono.just(false);
        }

        // Generar UUID determinístico desde el sub (misma lógica que TokenUtil.java)
        UUID userId = generateUUIDFromAuth0Sub(auth0Sub);

        logger.debug("[Auth0UserAutoCreateFilter] Verificando existencia de usuario: userId={} (sub={})", userId, auth0Sub);

        // 1. Verificar si el usuario ya existe
        return databaseClient.sql("SELECT COUNT(*) FROM app_user WHERE id = :userId")
            .bind("userId", userId)
            .map(row -> row.get(0, Long.class))
            .one()
            .flatMap(count -> {
                if (count != null && count > 0) {
                    // Usuario ya existe
                    logger.debug("[Auth0UserAutoCreateFilter] Usuario ya existe: userId={}", userId);
                    return Mono.just(false);
                } else {
                    // Usuario no existe, crearlo
                    logger.info("🆕 [Auth0UserAutoCreateFilter] Usuario no existe, creando: userId={}, email={}", userId, email);
                    return createUser(userId, auth0Sub, email, name);
                }
            });
    }

    /**
     * Crea un nuevo usuario Auth0 en la base de datos.
     *
     * @param userId UUID generado desde el auth0Sub
     * @param auth0Sub Subject original del token Auth0
     * @param email Email del usuario
     * @param name Nombre del usuario
     * @return Mono<Boolean> - true si se creó exitosamente
     */
    private Mono<Boolean> createUser(UUID userId, String auth0Sub, String email, String name) {
        // Determinar username (prioridad: email > name > auth0Sub)
        String username = email != null && !email.isBlank() ? email :
                         name != null && !name.isBlank() ? name :
                         auth0Sub;

        String insertSql = """
            INSERT INTO app_user (id, username, email, auth_provider, enabled, email_verified, created_at)
            VALUES (:id, :username, :email, 'auth0', true, true, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING
            """;

        return databaseClient.sql(insertSql)
            .bind("id", userId)
            .bind("username", username)
            .bind("email", email != null ? email : "")
            .fetch()
            .rowsUpdated()
            .map(rows -> {
                boolean created = rows > 0;
                if (created) {
                    logger.info("✅ [Auth0UserAutoCreateFilter] INSERT ejecutado exitosamente: userId={}, username={}, email={}",
                        userId, username, email);
                } else {
                    logger.debug("[Auth0UserAutoCreateFilter] INSERT no insertó (ON CONFLICT): userId={}", userId);
                }
                return created;
            })
            .onErrorResume(error -> {
                logger.error("❌ [Auth0UserAutoCreateFilter] Error en INSERT: userId={}, error={}",
                    userId, error.getMessage(), error);
                return Mono.just(false);
            });
    }

    /**
     * Genera un UUID determinístico desde el Auth0 sub.
     *
     * IMPORTANTE: Usa la misma lógica que TokenUtil.java en el backend
     * para garantizar que ambos generen el mismo UUID.
     *
     * @param auth0Sub Subject del token Auth0 (e.g., "google-oauth2|123456")
     * @return UUID determinístico generado desde el sub
     */
    private UUID generateUUIDFromAuth0Sub(String auth0Sub) {
        // UUID.nameUUIDFromBytes genera un UUID v3 (MD5-based) determinístico
        // Misma entrada = mismo UUID siempre
        return UUID.nameUUIDFromBytes(auth0Sub.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public int getOrder() {
        // Ejecutar DESPUÉS del filtro de logging (-1) y DESPUÉS de la validación JWT
        // pero ANTES de enrutar al backend
        // Order 10 = baja prioridad (se ejecuta tarde en la cadena)
        return 10;
    }
}
