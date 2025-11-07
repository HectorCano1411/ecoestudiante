package com.ecoestudiante.gateway.config;

import com.ecoestudiante.gateway.util.JwtTestUtils;
import com.nimbusds.jose.jwk.JWKSet;
import org.springframework.boot.test.context.TestConfiguration;

/**
 * Configuración de test para seguridad.
 * 
 * Esta clase puede usarse para configuraciones adicionales de test
 * si es necesario en el futuro.
 * 
 * Por ahora, la validación de JWT se hace a través de WireMock
 * que mockea el JWKS endpoint de Auth0 (ver SecurityTests.java).
 */
@TestConfiguration
public class TestSecurityConfig {
    // Configuración de test si es necesaria en el futuro
}

