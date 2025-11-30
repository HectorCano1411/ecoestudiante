package com.ecoestudiante.gateway;

import com.ecoestudiante.gateway.security.FlexibleIssuerValidator;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/**
 * Configuración de decodificadores JWT híbridos para Spring WebFlux.
 *
 * SOLUCIÓN PROFESIONAL: Soporta tanto JWT de Auth0 como JWT del backend.
 *
 * - JWT de Auth0: Validado usando issuer-uri (JWKS endpoint) - DESHABILITADO si no está configurado
 * - JWT del backend: Validado usando secret key compartida (HS512)
 *
 * IMPORTANTE: Spring Cloud Gateway requiere ReactiveJwtDecoder (no JwtDecoder).
 */
@Configuration
public class JwtDecoderConfig {

    private static final Logger logger = LoggerFactory.getLogger(JwtDecoderConfig.class);
    private static final String DEFAULT_SECRET = "YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely";

    private final Environment environment;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String auth0IssuerUri;

    @Value("${jwt.secret:YourSecretKeyShouldBeAtLeast256BitsLongForHS512AlgorithmToWorkProperlyAndSecurely}")
    private String jwtSecret;

    public JwtDecoderConfig(Environment environment) {
        this.environment = environment;
    }

    /**
     * Valida la configuración de seguridad al inicio de la aplicación.
     * IMPORTANTE: En producción, el JWT secret debe ser configurado explícitamente.
     */
    @PostConstruct
    public void validateSecurityConfiguration() {
        String activeProfile = String.join(",", environment.getActiveProfiles());
        boolean isProduction = activeProfile.contains("prod") || activeProfile.contains("production");

        // ============================================
        // VALIDACIÓN CRÍTICA: JWT Secret
        // ============================================
        if (jwtSecret == null || jwtSecret.isBlank()) {
            logger.error("❌ CONFIGURACIÓN CRÍTICA: JWT_SECRET no está configurado");
            throw new IllegalStateException(
                "JWT_SECRET es requerido. Configure la variable de entorno JWT_SECRET con un valor seguro."
            );
        }

        if (jwtSecret.equals(DEFAULT_SECRET)) {
            if (isProduction) {
                logger.error("❌ CONFIGURACIÓN CRÍTICA: JWT_SECRET usa el valor por defecto en producción");
                throw new IllegalStateException(
                    "JWT_SECRET no puede usar el valor por defecto en producción. " +
                    "Configure JWT_SECRET con un valor seguro de al menos 64 caracteres."
                );
            } else {
                logger.warn("⚠️  JWT_SECRET usa el valor por defecto. " +
                    "Esto es aceptable en desarrollo pero NO en producción.");
            }
        }

        if (jwtSecret.length() < 64) {
            logger.warn("⚠️  JWT_SECRET es muy corto ({} caracteres). " +
                "Se recomienda al menos 64 caracteres para HS512.", jwtSecret.length());
        }

        // ============================================
        // VALIDACIÓN: Auth0 Configuration
        // ============================================
        boolean isAuth0Configured = auth0IssuerUri != null &&
            !auth0IssuerUri.isBlank() &&
            !auth0IssuerUri.contains("xxxxx");

        if (isAuth0Configured) {
            logger.info("✅ Auth0 configurado correctamente: {}", auth0IssuerUri);
        } else {
            logger.info("ℹ️  Auth0 no configurado - usando solo autenticación con JWT del backend");
        }

        logger.info("✅ Validación de seguridad completada (profile: {})", activeProfile);
    }

    /**
     * Decodificador JWT reactivo híbrido que soporta tanto Auth0 como backend.
     *
     * Estrategia:
     * 1. Intentar primero con backend decoder (HS512) - más común en desarrollo
     * 2. Si falla, intentar con Auth0 decoder (si está configurado)
     */
    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder() {
        // Crear decoder del backend usando secret key (HS512)
        // IMPORTANTE: Especificar explícitamente MacAlgorithm.HS512 para que coincida
        // con el algoritmo usado por el backend (jjwt con HS512)
        SecretKey secretKey = new SecretKeySpec(
            jwtSecret.getBytes(StandardCharsets.UTF_8),
            "HmacSHA512"
        );
        NimbusReactiveJwtDecoder backendDecoder = NimbusReactiveJwtDecoder
            .withSecretKey(secretKey)
            .macAlgorithm(MacAlgorithm.HS512)  // Explícitamente HS512
            .build();
        logger.info("JWT Decoder: Backend decoder configurado (HS512)");

        // Crear decoder de Auth0 si está configurado correctamente
        NimbusReactiveJwtDecoder auth0Decoder = null;
        if (auth0IssuerUri != null && !auth0IssuerUri.isBlank() && !auth0IssuerUri.contains("xxxxx")) {
            try {
                // IMPORTANTE: Normalizar issuer quitando slash final si existe
                // Auth0 puede retornar issuer con slash en .well-known pero tokens sin slash
                String normalizedIssuer = auth0IssuerUri.endsWith("/")
                    ? auth0IssuerUri.substring(0, auth0IssuerUri.length() - 1)
                    : auth0IssuerUri;

                // SOLUCIÓN DEFINITIVA: Usar JWK Set URI directamente en lugar de issuerLocation
                // Esto evita que Nimbus use el issuer de .well-known/openid-configuration
                String jwkSetUri = normalizedIssuer + "/.well-known/jwks.json";

                auth0Decoder = NimbusReactiveJwtDecoder
                    .withJwkSetUri(jwkSetUri)
                    .build();

                // CRÍTICO: Configurar validator flexible para el issuer
                // Esto permite aceptar issuers con y sin trailing slash
                OAuth2TokenValidator<Jwt> flexibleIssuerValidator = new FlexibleIssuerValidator(normalizedIssuer);
                OAuth2TokenValidator<Jwt> timestampValidator = new JwtTimestampValidator();

                // Combinar validators
                OAuth2TokenValidator<Jwt> combinedValidator = new DelegatingOAuth2TokenValidator<>(
                    flexibleIssuerValidator,
                    timestampValidator
                );

                auth0Decoder.setJwtValidator(combinedValidator);

                logger.info("JWT Decoder: Auth0 configurado con JWK Set URI: {}", jwkSetUri);
                logger.info("JWT Decoder: FlexibleIssuerValidator configurado para: {}", normalizedIssuer);
            } catch (Exception e) {
                logger.warn("JWT Decoder: No se pudo configurar Auth0 decoder: {}", e.getMessage());
            }
        } else {
            logger.info("JWT Decoder: Auth0 no configurado (solo usando backend decoder)");
        }

        // Retornar decoder híbrido reactivo
        return new HybridReactiveJwtDecoder(backendDecoder, auth0Decoder);
    }

    /**
     * Decodificador híbrido reactivo que intenta backend primero, luego Auth0.
     *
     * Esta estrategia es óptima para desarrollo local donde se usa JWT del backend,
     * y también funciona en producción con Auth0.
     */
    private static class HybridReactiveJwtDecoder implements ReactiveJwtDecoder {
        private final NimbusReactiveJwtDecoder backendDecoder;
        private final NimbusReactiveJwtDecoder auth0Decoder;
        private static final Logger log = LoggerFactory.getLogger(HybridReactiveJwtDecoder.class);

        public HybridReactiveJwtDecoder(NimbusReactiveJwtDecoder backendDecoder, NimbusReactiveJwtDecoder auth0Decoder) {
            this.backendDecoder = backendDecoder;
            this.auth0Decoder = auth0Decoder;
        }

        @Override
        public Mono<Jwt> decode(String token) {
            // Intentar primero con backend decoder (HS512)
            return backendDecoder.decode(token)
                .doOnSuccess(jwt -> log.debug("JWT decodificado con backend decoder (HS512)"))
                .onErrorResume(backendError -> {
                    log.debug("Backend decoder falló: {}", backendError.getMessage());

                    // Si Auth0 está configurado, intentar con él
                    if (auth0Decoder != null) {
                        return auth0Decoder.decode(token)
                            .doOnSuccess(jwt -> log.debug("JWT decodificado con Auth0 decoder"))
                            .onErrorResume(auth0Error -> {
                                log.error("JWT inválido - falló backend ({}) y Auth0 ({})",
                                    backendError.getMessage(), auth0Error.getMessage());
                                return Mono.error(new JwtException("JWT inválido: no se pudo validar con ningún decoder", backendError));
                            });
                    }

                    // Si no hay Auth0, propagar el error del backend
                    log.error("JWT inválido - backend decoder falló: {}", backendError.getMessage());
                    return Mono.error(new JwtException("JWT inválido: " + backendError.getMessage(), backendError));
                });
        }
    }
}




