package com.ecoestudiante.gateway.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Validador de Issuer flexible que normaliza trailing slashes.
 *
 * PROBLEMA RESUELTO:
 * Auth0 puede retornar issuers con trailing slash en .well-known/openid-configuration
 * pero los tokens pueden tener el issuer sin trailing slash (o viceversa).
 *
 * Esta clase normaliza ambos lados antes de comparar, evitando rechazos incorrectos.
 *
 * EJEMPLO:
 * - Token tiene: "iss": "https://dev-xxx.us.auth0.com"
 * - Config tiene: "issuer": "https://dev-xxx.us.auth0.com/"
 * - Resultado: ✅ ACEPTA (después de normalizar)
 */
public class FlexibleIssuerValidator implements OAuth2TokenValidator<Jwt> {

    private static final Logger logger = LoggerFactory.getLogger(FlexibleIssuerValidator.class);

    private final String expectedIssuer;

    /**
     * Constructor que recibe el issuer esperado.
     *
     * @param issuer El issuer configurado (puede tener o no trailing slash)
     */
    public FlexibleIssuerValidator(String issuer) {
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalArgumentException("Issuer no puede ser null o vacío");
        }
        this.expectedIssuer = normalizeIssuer(issuer);
        logger.debug("FlexibleIssuerValidator configurado con issuer normalizado: {}", this.expectedIssuer);
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        if (token == null) {
            logger.warn("Token JWT es null");
            return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", "Token JWT es null", null)
            );
        }

        if (token.getIssuer() == null) {
            logger.warn("Token JWT no tiene claim 'iss' (issuer)");
            return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_issuer", "Token no tiene claim 'iss'", null)
            );
        }

        String tokenIssuer = normalizeIssuer(token.getIssuer().toString());

        if (expectedIssuer.equals(tokenIssuer)) {
            logger.debug("Issuer validado correctamente: {} == {}", expectedIssuer, tokenIssuer);
            return OAuth2TokenValidatorResult.success();
        }

        logger.error("Issuer mismatch: expected '{}' but got '{}' (ambos normalizados)",
            expectedIssuer, tokenIssuer);

        return OAuth2TokenValidatorResult.failure(
            new OAuth2Error(
                "invalid_issuer",
                String.format("Issuer mismatch: expected '%s' but got '%s'",
                    expectedIssuer, tokenIssuer),
                null
            )
        );
    }

    /**
     * Normaliza el issuer quitando el trailing slash si existe.
     *
     * IMPORTANTE: También hace trim() y convierte a lowercase para comparación case-insensitive.
     *
     * @param issuer El issuer original
     * @return El issuer normalizado (sin trailing slash, trimmed, lowercase)
     */
    private String normalizeIssuer(String issuer) {
        if (issuer == null) {
            return null;
        }

        String normalized = issuer.trim();

        // Quitar trailing slash
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        // Convertir a lowercase para comparación case-insensitive
        // (los esquemas HTTP/HTTPS deben ser case-insensitive según RFC 3986)
        normalized = normalized.toLowerCase();

        return normalized;
    }
}
