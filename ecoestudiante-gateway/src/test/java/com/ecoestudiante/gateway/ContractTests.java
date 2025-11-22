package com.ecoestudiante.gateway;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import com.ecoestudiante.gateway.util.JwtTestUtils;
import com.nimbusds.jose.jwk.JWKSet;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.condition.DisabledIf;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.IOException;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import com.github.tomakehurst.wiremock.WireMockServer;

/**
 * Contract Test (Provider) para el Gateway.
 * 
 * Este test verifica que el gateway cumple con los contratos (pacts)
 * generados por el frontend (consumer).
 * 
 * Flujo:
 * 1. Frontend (consumer) genera un pact file con sus expectativas
 * 2. Este test carga ese pact file
 * 3. Verifica que el gateway responde según el contrato
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Provider("ecoestudiante-gateway")
@PactFolder("pacts") // Lee desde src/test/resources/pacts (CI/CD) o puede usar @PactBroker para producción
@DisabledIf("hasNoPactFiles") // Deshabilitar si no hay archivos Pact
public class ContractTests {
    
    /**
     * Verifica si hay archivos Pact disponibles.
     * Este método se ejecuta antes de la inicialización de la clase.
     */
    static boolean hasNoPactFiles() {
        Path[] possiblePaths = {
            Paths.get("src/test/resources/pacts"),
            Paths.get("ecoestudiante-gateway/src/test/resources/pacts"),
            Paths.get("target/test-classes/pacts")
        };
        
        for (Path path : possiblePaths) {
            if (Files.exists(path) && Files.isDirectory(path)) {
                try (Stream<Path> paths = Files.list(path)) {
                    boolean found = paths
                        .filter(Files::isRegularFile)
                        .anyMatch(p -> p.toString().endsWith(".json"));
                    if (found) {
                        return false; // Hay archivos, no deshabilitar
                    }
                } catch (IOException e) {
                    // Si hay error al leer, asumir que no hay archivos
                }
            }
        }
        return true; // No hay archivos, deshabilitar
    }

    @LocalServerPort
    private int port;

    private static WireMockServer wireMockServer;
    private static int wireMockPort;
    private static String issuerUri;

    @BeforeAll
    static void setUpPact() throws IOException {
        // Verificación de respaldo: si por alguna razón @DisabledIf no funcionó,
        // asegurarse de que no hay archivos Pact antes de continuar
        Assumptions.assumeFalse(hasNoPactFiles(), 
            "No se encontraron archivos Pact. El test debería haberse deshabilitado automáticamente.");
        
        // Encontrar un puerto libre para WireMock
        try (ServerSocket socket = new ServerSocket(0)) {
            wireMockPort = socket.getLocalPort();
        }

        // Iniciar WireMock server para mockear Auth0
        wireMockServer = new WireMockServer(wireMockConfig().port(wireMockPort));
        wireMockServer.start();

        issuerUri = "http://localhost:" + wireMockPort + "/";

        // Configurar mock del OpenID Configuration endpoint
        String openidConfig = """
            {
              "issuer": "%s",
              "jwks_uri": "%s.well-known/jwks.json"
            }
            """.formatted(issuerUri, issuerUri);
        
        wireMockServer.stubFor(get(urlPathEqualTo("/.well-known/openid-configuration"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(openidConfig)));
        
        // Configurar mock del JWKS endpoint
        JWKSet jwkSet = JwtTestUtils.getJWKSet();
        wireMockServer.stubFor(get(urlPathEqualTo("/.well-known/jwks.json"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(jwkSet.toString())));

        // Mockear el backend (ecoestudiante-api en localhost:18080)
        // Para los contract tests, el gateway hará proxy a este mock
        wireMockServer.stubFor(get(urlPathMatching("/calc/.*"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                      "calcId": "calc-123",
                      "co2e": 45.5,
                      "unit": "kgCO2e",
                      "category": "electricity",
                      "createdAt": "2025-11-06T20:00:00Z",
                      "input": {
                        "kwh": 100,
                        "country": "CL",
                        "period": "2025-01"
                      }
                    }
                    """)));

        wireMockServer.stubFor(post(urlPathEqualTo("/calc/electricity"))
            .willReturn(aResponse()
                .withStatus(201)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                      "calcId": "calc-456",
                      "co2e": 68.25,
                      "unit": "kgCO2e",
                      "category": "electricity",
                      "createdAt": "2025-11-06T20:00:00Z",
                      "input": {
                        "kwh": 150,
                        "country": "CL",
                        "period": "2025-01"
                      }
                    }
                    """)));

        wireMockServer.stubFor(get(urlPathEqualTo("/calc/history"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                      "items": [
                        {
                          "calcId": "calc-789",
                          "category": "electricity",
                          "co2e": 45.5,
                          "createdAt": "2025-11-06T20:00:00Z"
                        }
                      ],
                      "totalItems": 5,
                      "page": 0,
                      "pageSize": 20,
                      "totalPages": 1
                    }
                    """)));
    }

    @AfterAll
    static void tearDownPact() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> issuerUri);
        registry.add("spring.security.oauth2.resourceserver.jwt.audience", () -> "https://api.ecoestudiante.com");
        
        // Configurar el gateway para que apunte al WireMock (backend mock)
        registry.add("spring.cloud.gateway.routes[0].uri", () -> "http://localhost:" + wireMockPort);
        registry.add("spring.cloud.gateway.routes[1].uri", () -> "http://localhost:" + wireMockPort);
        registry.add("spring.cloud.gateway.routes[2].uri", () -> "http://localhost:" + wireMockPort);
    }

    @BeforeEach
    void setUp(PactVerificationContext context) {
        // Configurar el target del test (el gateway)
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        // Este método es invocado por Pact para cada interacción en el pact file
        context.verifyInteraction();
    }

    /**
     * State handler: usuario autenticado con scope read:carbon
     * 
     * Cuando el consumer (frontend) especifica este state, el provider (gateway)
     * debe configurar el contexto apropiado (en este caso, generar un token válido).
     */
    @State("usuario autenticado con scope read:carbon")
    public void usuarioAutenticadoReadCarbon() {
        // El frontend enviará un token mock, pero el gateway debe estar configurado
        // para aceptar tokens válidos con el scope read:carbon
        // En este caso, WireMock ya está configurado con el JWKS correcto
        System.out.println("🔐 State: Usuario autenticado con scope read:carbon");
    }

    /**
     * State handler: usuario autenticado con scope write:carbon
     */
    @State("usuario autenticado con scope write:carbon")
    public void usuarioAutenticadoWriteCarbon() {
        System.out.println("🔐 State: Usuario autenticado con scope write:carbon");
    }

    /**
     * State handler: usuario autenticado con historial de cálculos
     */
    @State("usuario autenticado con historial de cálculos")
    public void usuarioAutenticadoConHistorial() {
        // WireMock ya está configurado para responder con historial mock
        System.out.println("🔐 State: Usuario autenticado con historial de cálculos");
    }
}

