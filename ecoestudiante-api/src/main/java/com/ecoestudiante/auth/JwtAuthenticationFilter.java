package com.ecoestudiante.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filtro de autenticación JWT que soporta tanto tokens propios como tokens de Auth0.
 * Este filtro establece la autenticación en SecurityContext cuando detecta un token válido,
 * permitiendo que Spring Security permita el acceso a los endpoints protegidos.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final JwtUtil jwtUtil;
    private final TokenUtil tokenUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, TokenUtil tokenUtil) {
        this.jwtUtil = jwtUtil;
        this.tokenUtil = tokenUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // No procesar JWT para endpoints públicos
        String path = request.getRequestURI();
        logger.debug("Filtro JWT - Path: {}, Method: {}", path, request.getMethod());
        
        // Endpoints públicos (sin autenticación requerida)
        if (path.startsWith("/api/v1/auth/") || 
            path.startsWith("/api/auth/") ||
            path.startsWith("/healthz") || 
            path.startsWith("/actuator/") ||
            path.startsWith("/swagger-ui") ||
            path.startsWith("/v3/api-docs") ||
            path.equals("/error")) {
            logger.debug("Filtro JWT - Saltando procesamiento para path público: {}", path);
            chain.doFilter(request, response);
            return;
        }
        
        // Permitir acceso público a instituciones habilitadas (para registro)
        // Solo cuando enabled=true y no hay otros filtros sensibles
        if (path.startsWith("/api/v1/institutions") && "GET".equals(request.getMethod())) {
            String enabledParam = request.getParameter("enabled");
            String searchParam = request.getParameter("search");
            String typeParam = request.getParameter("type");
            
            boolean isPublicAccess = "true".equals(enabledParam) && 
                                   (searchParam == null || searchParam.trim().isEmpty()) &&
                                   (typeParam == null || typeParam.trim().isEmpty());
            
            if (isPublicAccess) {
                logger.debug("Filtro JWT - Acceso público permitido a instituciones habilitadas: {}", path);
                chain.doFilter(request, response);
                return;
            }
        }
        
        // Permitir acceso público a campus habilitados de una institución específica (para registro)
        if (path.startsWith("/api/v1/institutions/campuses") && "GET".equals(request.getMethod())) {
            String enabledParam = request.getParameter("enabled");
            String institutionIdParam = request.getParameter("institutionId");
            String searchParam = request.getParameter("search");
            
            boolean isPublicAccess = "true".equals(enabledParam) && 
                                   institutionIdParam != null && !institutionIdParam.trim().isEmpty() &&
                                   (searchParam == null || searchParam.trim().isEmpty());
            
            if (isPublicAccess) {
                logger.debug("Filtro JWT - Acceso público permitido a campus habilitados: {}", path);
                chain.doFilter(request, response);
                return;
            }
        }

        final String authHeader = request.getHeader("Authorization");

        // Si no hay header de autorización, continuar (Spring Security manejará la autorización)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.debug("Filtro JWT - No hay header Authorization, continuando");
            chain.doFilter(request, response);
            return;
        }

        try {
            final String token = authHeader.substring(7);
            
            // Intentar establecer autenticación si el token es válido
            String username = null;
            String userId = null;
            boolean isAuthenticated = false;

            // Verificar si es un token de Auth0
            if (tokenUtil.isAuth0Token(token)) {
                logger.debug("Token detectado como Auth0");
                
                if (tokenUtil.isTokenValid(token)) {
                    username = tokenUtil.extractUsername(token);
                    userId = tokenUtil.extractUserId(token);
                    
                    // Para Auth0, userId (sub) es suficiente para autenticación
                    if (userId != null) {
                        isAuthenticated = true;
                        logger.info("Token Auth0 válido - Username: {}, UserId: {}", username, userId);
                    } else {
                        logger.warn("Token Auth0 válido pero no se pudo extraer userId");
                    }
                } else {
                    logger.warn("Token Auth0 expirado o inválido");
                }
            } else {
                // Intentar validar como token propio
                try {
                    username = jwtUtil.extractUsername(token);
                    if (username != null && jwtUtil.validateToken(token, username)) {
                        userId = jwtUtil.extractUserId(token);
                        isAuthenticated = true;
                        logger.info("Token propio válido - Username: {}, UserId: {}", username, userId);
                    } else {
                        logger.debug("Token propio no válido con JwtUtil");
                    }
                } catch (Exception e) {
                    logger.debug("Error validando token propio, intentando como Auth0: {}", e.getMessage());
                    
                    // Último intento: tratar como Auth0 si es válido
                    if (tokenUtil.isTokenValid(token)) {
                        username = tokenUtil.extractUsername(token);
                        userId = tokenUtil.extractUserId(token);
                        // userId es suficiente para autenticación
                        if (userId != null) {
                            isAuthenticated = true;
                            logger.info("Token procesado como Auth0 (fallback) - Username: {}, UserId: {}", username, userId);
                        }
                    }
                }
            }

            // CRÍTICO: Establecer autenticación en SecurityContext si el token es válido
            // Esto permite que Spring Security permita el acceso
            if (isAuthenticated && userId != null) {
                // Usar userId como principal si username no está disponible
                // Esto es crítico para tokens Auth0 que pueden no tener email/name
                String principal = (username != null && !username.isBlank()) ? username : userId;

                    // Extraer el rol del token JWT
                    String role = null;
                    try {
                        role = jwtUtil.extractRole(token);
                        logger.info("🔍 [JWT Filter] Rol extraído del token: '{}'", role);
                    } catch (Exception e) {
                        logger.warn("⚠️ [JWT Filter] No se pudo extraer rol del token: {}", e.getMessage());
                    }

                    // Normalizar el rol a mayúsculas y eliminar espacios
                    // IMPORTANTE: Spring Security con hasAnyRole() automáticamente agrega "ROLE_" al inicio
                    // Por lo tanto, si el rol es "PROFESOR", la authority debe ser "ROLE_PROFESOR"
                    String userRole = (role != null && !role.isBlank()) 
                        ? role.toUpperCase().trim().replaceAll("\\s+", "") 
                        : "ESTUDIANTE";
                    
                    logger.info("🔍 [JWT Filter] Rol normalizado: '{}' (original: '{}')", userRole, role);

                    // Agregar el rol como authority (Spring Security requiere prefijo ROLE_)
                    // hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR') busca "ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_PROFESOR"
                    String authority = "ROLE_" + userRole;
                    logger.info("🔍 [JWT Filter] Authority creada: '{}'", authority);

                    // Crear lista de autoridades (puede incluir múltiples roles en el futuro)
                    List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(authority));
                    
                    logger.info("🔍 [JWT Filter] Authorities completas: {}", 
                        authorities.stream().map(a -> a.getAuthority()).toList());

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        authorities
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    logger.info("✅ [JWT Filter] Autenticación establecida en SecurityContext - Principal: {}, UserId: {}, Role: {}, Authority: {}", 
                        principal, userId, userRole, authority);
            } else {
                logger.warn("⚠️ Token presente pero no se pudo establecer autenticación - Token válido: {}, Username: {}, UserId: {}", 
                    tokenUtil.isTokenValid(token), username, userId);
            }
        } catch (Exception e) {
            logger.error("❌ Error crítico al procesar token JWT: {}", e.getMessage(), e);
            // No bloquear la petición aquí - Spring Security manejará la autorización
        }

        // Continuar con la cadena de filtros
        chain.doFilter(request, response);
    }
}

