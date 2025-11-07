package com.ecoestudiante.gateway;

import com.ecoestudiante.gateway.util.JwtTestUtils;
import com.nimbusds.jose.jwk.JWKSet;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.io.IOException;
import java.net.ServerSocket;
import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import com.github.tomakehurst.wiremock.WireMockServer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class SecurityTests {

    @Autowired
    private WebTestClient webTestClient;

    private static WireMockServer wireMockServer;
    private static int wireMockPort;
    private static String issuerUri;

    @BeforeAll
    static void setUp() throws IOException {
        // Encontrar un puerto libre
        try (ServerSocket socket = new ServerSocket(0)) {
            wireMockPort = socket.getLocalPort();
        }

        // Iniciar WireMock server
        wireMockServer = new WireMockServer(wireMockConfig().port(wireMockPort));
        wireMockServer.start();

        issuerUri = "http://localhost:" + wireMockPort + "/";

        // Configurar el mock del OpenID Configuration endpoint
        // Spring Security busca primero: {issuer}/.well-known/openid-configuration
        String openidConfig = """
            {
              "issuer": "%s",
              "jwks_uri": "%s.well-known/jwks.json",
              "authorization_endpoint": "%sauthorize",
              "token_endpoint": "%soauth/token",
              "userinfo_endpoint": "%suserinfo"
            }
            """.formatted(issuerUri, issuerUri, issuerUri, issuerUri, issuerUri);
        
        wireMockServer.stubFor(get(urlPathEqualTo("/.well-known/openid-configuration"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(openidConfig)));
        
        // Configurar el mock del JWKS endpoint
        // Auth0 expone JWKS en: {issuer}/.well-known/jwks.json
        JWKSet jwkSet = JwtTestUtils.getJWKSet();
        
        wireMockServer.stubFor(get(urlPathEqualTo("/.well-known/jwks.json"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(jwkSet.toString())));
    }

    @AfterAll
    static void tearDown() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> issuerUri);
        registry.add("spring.security.oauth2.resourceserver.jwt.audience", () -> "https://api.ecoestudiante.com");
    }

    @Test
    void testUnauthenticatedRequestReturns401() {
        webTestClient
            .get()
            .uri("/api/calc/electricity")
            .exchange()
            .expectStatus().isUnauthorized();
    }

    @Test
    void testHealthEndpointIsPublic() {
        webTestClient
            .get()
            .uri("/actuator/health")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    void testRequestWithoutRequiredScopeReturns403() {
        // Generar token sin el scope requerido
        String token = JwtTestUtils.generateToken("test-user", List.of("write:something"), issuerUri);

        webTestClient
            .get()
            .uri("/api/calc/electricity")
            .header("Authorization", "Bearer " + token)
            .exchange()
            .expectStatus().isForbidden(); // 403 porque no tiene SCOPE_read:carbon
    }

    @Test
    void testRequestWithoutAnyScopeReturns403() {
        // Generar token sin scopes
        String token = JwtTestUtils.generateToken("test-user", List.of(), issuerUri);

        webTestClient
            .get()
            .uri("/api/calc/electricity")
            .header("Authorization", "Bearer " + token)
            .exchange()
            .expectStatus().isForbidden(); // 403 porque no tiene scopes
    }

    @Test
    void testReportesEndpointWithoutScopeReturns403() {
        // Generar token con scope read:carbon pero no report:write
        String token = JwtTestUtils.generateToken("test-user", List.of("read:carbon"), issuerUri);

        webTestClient
            .post()
            .uri("/api/reportes/create")
            .header("Authorization", "Bearer " + token)
            .exchange()
            .expectStatus().isForbidden(); // 403 porque no tiene SCOPE_report:write
    }

    @Test
    void testExpiredTokenReturns401() {
        // Generar token expirado
        String expiredToken = JwtTestUtils.generateExpiredToken("test-user", List.of("read:carbon"), issuerUri);

        webTestClient
            .get()
            .uri("/api/calc/electricity")
            .header("Authorization", "Bearer " + expiredToken)
            .exchange()
            .expectStatus().isUnauthorized(); // 401 porque el token está expirado
    }
}

