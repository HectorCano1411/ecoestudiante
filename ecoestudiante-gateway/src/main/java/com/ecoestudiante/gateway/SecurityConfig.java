package com.ecoestudiante.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .authorizeExchange(exchanges -> exchanges
                // Health checks públicos
                .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                
                // ============================================
                // RUTAS V1 - Nueva arquitectura de servicios
                // ============================================
                
                // Servicio de Autenticación: /api/v1/auth/** y /api/auth/**
                // Incluye: login, registro, refresh token, verificación de email
                // Estas rutas son públicas (no requieren autenticación)
                .pathMatchers("/api/v1/auth/**", "/api/auth/**").permitAll()
                
                // Servicio de Cálculo CO₂e: /api/v1/calc/**
                // Incluye: cálculos de electricidad, transporte, historial y estadísticas
                .pathMatchers("/api/v1/calc/**").hasAuthority("SCOPE_read:carbon")
                
                // Servicio de Gamificación: /api/v1/gam/**
                // Incluye: challenges, XP, streaks, achievements
                .pathMatchers("/api/v1/gam/**").hasAuthority("SCOPE_read:carbon")
                
                // Servicio de Reportes: /api/v1/reports/**
                // Incluye: generación de reportes, exports, agregados anonimizados
                .pathMatchers("/api/v1/reports/**").hasAuthority("SCOPE_report:write")
                
                // ============================================
                // RUTAS LEGACY - Compatibilidad temporal
                // ============================================
                // DEPRECATED: Mantener durante transición, eliminar en futura versión
                
                // Rutas legacy de autenticación (públicas)
                .pathMatchers("/api/auth/**").permitAll()
                // Rutas legacy de cálculo
                .pathMatchers("/api/calc/**").hasAuthority("SCOPE_read:carbon")
                // Rutas legacy de stats (redirigidas a /api/v1/calc/stats)
                .pathMatchers("/api/stats/**").hasAuthority("SCOPE_read:carbon")
                // Rutas legacy de reportes
                .pathMatchers("/api/reportes/**").hasAuthority("SCOPE_report:write")
                
                // Todas las demás requieren autenticación
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(reactiveJwtAuthenticationConverter())
                )
            );

        return http.build();
    }

    /**
     * Converter reactivo para JWT que extrae scopes y los convierte a authorities.
     * 
     * Auth0 devuelve scopes como un string separado por espacios: "read:carbon write:carbon"
     * Este converter los convierte a authorities con prefijo "SCOPE_"
     */
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> reactiveJwtAuthenticationConverter() {
        return new ReactiveJwtConverter();
    }

    /**
     * Clase interna que implementa el converter reactivo con tipos explícitos.
     * 
     * Esto es necesario porque Spring necesita poder determinar los tipos genéricos,
     * lo cual no es posible con lambdas.
     */
    private static class ReactiveJwtConverter implements Converter<Jwt, Mono<AbstractAuthenticationToken>> {
        @Override
        public Mono<AbstractAuthenticationToken> convert(Jwt jwt) {
            // Extraer scopes del claim "scope" (string separado por espacios)
            Collection<GrantedAuthority> authorities = extractAuthoritiesFromJwt(jwt);
            
            // Crear JwtAuthenticationToken con las authorities extraídas
            JwtAuthenticationToken authenticationToken = new JwtAuthenticationToken(jwt, authorities);
            
            return Mono.just(authenticationToken);
        }

        /**
         * Mapea roles de usuario a scopes de OAuth2.
         * Esto permite control de acceso granular basado en roles.
         *
         * @param roles Lista de roles del usuario (e.g., ["STUDENT", "ADMIN"])
         * @return Lista de scopes mapeados
         */
        private Collection<String> mapRolesToScopes(Collection<String> roles) {
            java.util.Set<String> scopes = new java.util.HashSet<>();

            for (String role : roles) {
                switch (role.toUpperCase()) {
                    case "STUDENT":
                    case "USER":
                        // Estudiantes y usuarios regulares: solo lectura
                        scopes.add("read:carbon");
                        break;

                    case "RESEARCHER":
                    case "PROFESSOR":
                        // Investigadores y profesores: lectura + reportes
                        scopes.add("read:carbon");
                        scopes.add("report:write");
                        break;

                    case "ADMIN":
                    case "ADMINISTRATOR":
                        // Administradores: acceso completo
                        scopes.add("read:carbon");
                        scopes.add("report:write");
                        scopes.add("admin:write");
                        break;

                    default:
                        // Roles no reconocidos: solo lectura (principio de mínimo privilegio)
                        scopes.add("read:carbon");
                        break;
                }
            }

            return scopes.isEmpty() ? List.of("read:carbon") : new java.util.ArrayList<>(scopes);
        }

        private Collection<GrantedAuthority> extractAuthoritiesFromJwt(Jwt jwt) {
            // Auth0 devuelve scopes como un string separado por espacios: "read:carbon write:carbon"
            String scopeClaim = jwt.getClaimAsString("scope");
            Collection<String> scopes = Collections.emptyList();

            // ========== DEBUG TEMPORAL: Log del token ==========
            String sub = jwt.getSubject();
            String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "null";
            org.slf4j.LoggerFactory.getLogger(getClass()).info(
                "🔍 [DEBUG] JWT recibido - sub: {}, issuer: {}, scopeClaim: '{}'",
                sub, issuer, scopeClaim
            );
            // ===================================================

            if (scopeClaim != null && !scopeClaim.isBlank()) {
                // Dividir el string de scopes por espacios
                scopes = List.of(scopeClaim.split(" "));
                org.slf4j.LoggerFactory.getLogger(getClass()).info(
                    "🔍 [DEBUG] Scopes extraídos del claim 'scope': {}", scopes
                );
            }

            // Si no hay scopes en el claim "scope", intentar con "permissions" (lista)
            if (scopes.isEmpty()) {
                Collection<String> permissions = jwt.getClaimAsStringList("permissions");
                if (permissions != null && !permissions.isEmpty()) {
                    scopes = permissions;
                }
            }

            // ============================================
            // SCOPES PARA JWT SIN SCOPES O CON SCOPES OIDC ESTÁNDAR
            // ============================================
            // Detectar si los scopes son solo OIDC estándar (openid, profile, email)
            boolean hasOnlyOidcScopes = !scopes.isEmpty() && scopes.stream()
                .allMatch(s -> s.equals("openid") || s.equals("profile") || s.equals("email") || s.equals("offline_access"));

            // Si el JWT NO tiene scopes O solo tiene scopes OIDC estándar, asignar scopes por defecto
            if (scopes.isEmpty() || hasOnlyOidcScopes) {
                // Detectar el tipo de token
                String userId = jwt.getClaimAsString("userId");
                String type = jwt.getClaimAsString("type");
                // Reutilizar variables sub e issuer ya declaradas arriba

                boolean isBackendToken = (userId != null || type != null);
                boolean isAuth0Token = issuer.contains("auth0.com");

                if (isBackendToken) {
                    // ========== TOKEN DEL BACKEND ==========
                    // Verificar si el token tiene información de roles
                    Collection<String> roles = jwt.getClaimAsStringList("roles");

                    if (roles != null && !roles.isEmpty()) {
                        // Mapear roles a scopes
                        scopes = mapRolesToScopes(roles);
                    } else {
                        // FALLBACK: Si no hay roles, asignar scope básico de lectura
                        // Solo acceso de lectura por defecto (principio de mínimo privilegio)
                        scopes = List.of("read:carbon");
                    }

                    org.slf4j.LoggerFactory.getLogger(getClass()).info(
                        "✅ Token del backend detectado. Scopes asignados: {}", scopes
                    );
                } else if (isAuth0Token) {
                    // ========== TOKEN DE AUTH0 SIN SCOPES O CON SCOPES OIDC ==========
                    // Auth0 puede no tener scopes configurados, asignar por defecto
                    // IMPORTANTE: En producción, configurar scopes en Auth0 para mayor control
                    scopes = List.of("read:carbon", "report:write");

                    // Log para monitoreo (tokens Auth0 deberían tener scopes configurados)
                    org.slf4j.LoggerFactory.getLogger(getClass()).info(
                        "✅ Token Auth0 con solo scopes OIDC detectado (sub: {}). Asignando scopes de aplicación: {}",
                        sub, scopes
                    );
                } else if (sub != null) {
                    // ========== OTRO TIPO DE TOKEN CON SUB ==========
                    // Cualquier otro token con subject: asignar acceso mínimo
                    scopes = List.of("read:carbon");
                }
            }
            
            // Convertir scopes a authorities con prefijo "SCOPE_"
            Collection<GrantedAuthority> authorities = scopes.stream()
                .map(scope -> "SCOPE_" + scope)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

            // ========== DEBUG TEMPORAL: Log de authorities finales ==========
            org.slf4j.LoggerFactory.getLogger(getClass()).info(
                "🔍 [DEBUG] Authorities finales asignadas: {}", authorities
            );
            // ================================================================

            return authorities;
        }
    }


    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ============================================
        // CORS Configuration - Environment Aware
        // ============================================
        // Soporta múltiples orígenes separados por coma
        // Ejemplo: CORS_ALLOWED_ORIGINS=http://localhost:3000,https://ecoestudiante.com,https://www.ecoestudiante.com
        String[] origins = allowedOrigins.split(",");
        for (String origin : origins) {
            configuration.addAllowedOrigin(origin.trim());
        }

        // Métodos HTTP permitidos
        configuration.addAllowedMethod("GET");
        configuration.addAllowedMethod("POST");
        configuration.addAllowedMethod("PUT");
        configuration.addAllowedMethod("DELETE");
        configuration.addAllowedMethod("OPTIONS");
        configuration.addAllowedMethod("PATCH");

        // Headers permitidos
        configuration.addAllowedHeader("*");

        // Permitir credenciales (cookies, Authorization header)
        configuration.setAllowCredentials(true);

        // Headers expuestos al cliente
        configuration.addExposedHeader("Authorization");

        // Cache de preflight requests (1 hora)
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return new CorsWebFilter(source);
    }
}

