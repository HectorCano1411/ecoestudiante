package com.ecoestudiante.gateway;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import au.com.dius.pact.provider.junitsupport.filter.InteractionFilter;
import com.ecoestudiante.gateway.util.JwtTestUtils;
import com.nimbusds.jose.jwk.JWKSet;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
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
    
    // Variable para rastrear el state actual y generar el token apropiado
    private static String currentState = null;

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
        // Ruta 0: /api/calc/**
        registry.add("spring.cloud.gateway.routes[0].id", () -> "calculo-route");
        registry.add("spring.cloud.gateway.routes[0].uri", () -> "http://localhost:" + wireMockPort);
        registry.add("spring.cloud.gateway.routes[0].predicates[0]", () -> "Path=/api/calc/**");
        registry.add("spring.cloud.gateway.routes[0].filters[0]", () -> "StripPrefix=1");
        
        // Ruta 1: /api/reportes/**
        registry.add("spring.cloud.gateway.routes[1].id", () -> "reportes-route");
        registry.add("spring.cloud.gateway.routes[1].uri", () -> "http://localhost:" + wireMockPort);
        registry.add("spring.cloud.gateway.routes[1].predicates[0]", () -> "Path=/api/reportes/**");
        registry.add("spring.cloud.gateway.routes[1].filters[0]", () -> "StripPrefix=1");
        
        // Ruta 2: /api/stats/**
        registry.add("spring.cloud.gateway.routes[2].id", () -> "stats-route");
        registry.add("spring.cloud.gateway.routes[2].uri", () -> "http://localhost:" + wireMockPort);
        registry.add("spring.cloud.gateway.routes[2].predicates[0]", () -> "Path=/api/stats/**");
        registry.add("spring.cloud.gateway.routes[2].filters[0]", () -> "StripPrefix=1");
    }

    @BeforeEach
    void setUp(PactVerificationContext context) {
        // Configurar el target del test (el gateway)
        context.setTarget(new HttpTestTarget("localhost", port));
    }
    
    /**
     * Determina los scopes necesarios según el state del pact.
     */
    private List<String> determineScopesFromState(String state) {
        if (state == null) {
            // Default: incluir ambos scopes para ser seguro
            return List.of("read:carbon", "write:carbon");
        }
        
        if (state.contains("read:carbon")) {
            return List.of("read:carbon");
        } else if (state.contains("write:carbon")) {
            return List.of("write:carbon");
        } else if (state.contains("historial")) {
            return List.of("read:carbon");
        }
        
        // Default: incluir ambos scopes
        return List.of("read:carbon", "write:carbon");
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        // Este método es invocado por Pact para cada interacción en el pact file
        // Modificamos la interacción para reemplazar tokens mock con tokens válidos
        
        try {
            // Obtener la interacción actual del contexto
            // Nota: getInteraction() retorna Interaction (interfaz base), necesitamos hacer cast
            au.com.dius.pact.core.model.Interaction interaction = context.getInteraction();
            
            // Verificar que es una RequestResponseInteraction (no una MessageInteraction)
            if (interaction instanceof au.com.dius.pact.core.model.RequestResponseInteraction) {
                au.com.dius.pact.core.model.RequestResponseInteraction requestResponseInteraction = 
                    (au.com.dius.pact.core.model.RequestResponseInteraction) interaction;
                
                // Obtener la petición original
                au.com.dius.pact.core.model.Request originalRequest = requestResponseInteraction.getRequest();
                
                // Modificar la petición para reemplazar el token mock
                au.com.dius.pact.core.model.Request modifiedRequest = modifyRequestWithValidToken(originalRequest);
                
                // Si la petición fue modificada, crear una nueva interacción y actualizar el contexto
                if (modifiedRequest != originalRequest) {
                    au.com.dius.pact.core.model.RequestResponseInteraction modifiedInteraction = 
                        new au.com.dius.pact.core.model.RequestResponseInteraction(
                            requestResponseInteraction.getDescription(),
                            requestResponseInteraction.getProviderStates(),
                            modifiedRequest,
                            requestResponseInteraction.getResponse()
                        );
                    
                    // Actualizar el contexto con la interacción modificada usando reflection
                    // Esto es necesario porque Pact no expone un método público para modificar la interacción
                    try {
                        // Intentar diferentes nombres de campo posibles
                        String[] possibleFieldNames = {"interaction", "currentInteraction", "_interaction"};
                        boolean updated = false;
                        
                        for (String fieldName : possibleFieldNames) {
                            try {
                                Field interactionField = context.getClass().getDeclaredField(fieldName);
                                interactionField.setAccessible(true);
                                Object currentValue = interactionField.get(context);
                                System.out.println("🔍 Campo '" + fieldName + "' encontrado. Tipo actual: " + 
                                    (currentValue != null ? currentValue.getClass().getName() : "null"));
                                
                                interactionField.set(context, modifiedInteraction);
                                System.out.println("✅ Interacción modificada en campo '" + fieldName + "': token mock reemplazado con token válido");
                                updated = true;
                                break;
                            } catch (NoSuchFieldException e) {
                                // Continuar con el siguiente nombre de campo
                                System.out.println("🔍 Campo '" + fieldName + "' no encontrado, intentando siguiente...");
                            }
                        }
                        
                        if (!updated) {
                            // Si no encontramos el campo, intentar listar todos los campos disponibles
                            System.out.println("⚠️ No se encontró el campo 'interaction'. Campos disponibles:");
                            for (Field f : context.getClass().getDeclaredFields()) {
                                System.out.println("  - " + f.getName() + " (" + f.getType().getName() + ")");
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("⚠️ Error al modificar la interacción por reflection: " + e.getMessage());
                        e.printStackTrace();
                        // Continuar con la verificación (puede fallar, pero al menos intentamos)
                    }
                }
            } else {
                System.out.println("⚠️ La interacción no es de tipo RequestResponseInteraction, no se puede modificar");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error al modificar la interacción: " + e.getMessage());
            e.printStackTrace();
            // Continuar con la verificación normal
        }
        
        // Verificar la interacción (con el token válido si fue modificado)
        context.verifyInteraction();
    }
    
    /**
     * Modifica la petición para reemplazar el token mock con un token JWT válido.
     * 
     * @param request La petición original del pact file
     * @return La petición modificada con un token válido, o la original si no había token
     */
    private au.com.dius.pact.core.model.Request modifyRequestWithValidToken(au.com.dius.pact.core.model.Request request) {
        Map<String, List<String>> headers = new HashMap<>(request.getHeaders());
        
        // Si hay un header Authorization, reemplazarlo con un token válido
        if (headers.containsKey("Authorization") || headers.containsKey("authorization")) {
            // Determinar los scopes según el state actual
            List<String> scopes = determineScopesFromState(currentState);
            
                // Generar un token válido con los scopes apropiados
                String validToken = JwtTestUtils.generateToken("test-user", scopes, issuerUri);
                
                System.out.println("🔄 Reemplazando token mock con token válido (scopes: " + scopes + ")");
                System.out.println("🔑 Token generado (primeros 50 chars): " + validToken.substring(0, Math.min(50, validToken.length())) + "...");
                System.out.println("🔑 Token completo length: " + validToken.length());
                
                // Reemplazar el header Authorization
                headers.remove("Authorization");
                headers.remove("authorization");
                headers.put("Authorization", List.of("Bearer " + validToken));
                
                System.out.println("📤 Header Authorization actualizado: Bearer " + validToken.substring(0, Math.min(30, validToken.length())) + "...");
            
            // Crear una nueva petición con los headers modificados
            return new au.com.dius.pact.core.model.Request(
                request.getMethod(),
                request.getPath(),
                request.getQuery(),
                headers,
                request.getBody()
            );
        }
        
        // Si no hay header Authorization, retornar la petición original
        return request;
    }

    /**
     * State handler: usuario autenticado con scope read:carbon
     * 
     * Cuando el consumer (frontend) especifica este state, el provider (gateway)
     * debe configurar el contexto apropiado (en este caso, generar un token válido).
     */
    @State("usuario autenticado con scope read:carbon")
    public void usuarioAutenticadoReadCarbon() {
        // Guardar el state actual para que el RequestFilter pueda generar el token apropiado
        currentState = "usuario autenticado con scope read:carbon";
        System.out.println("🔐 State: Usuario autenticado con scope read:carbon");
    }

    /**
     * State handler: usuario autenticado con scope write:carbon
     */
    @State("usuario autenticado con scope write:carbon")
    public void usuarioAutenticadoWriteCarbon() {
        currentState = "usuario autenticado con scope write:carbon";
        System.out.println("🔐 State: Usuario autenticado con scope write:carbon");
    }

    /**
     * State handler: usuario autenticado con historial de cálculos
     */
    @State("usuario autenticado con historial de cálculos")
    public void usuarioAutenticadoConHistorial() {
        currentState = "usuario autenticado con historial de cálculos";
        // WireMock ya está configurado para responder con historial mock
        System.out.println("🔐 State: Usuario autenticado con historial de cálculos");
    }
}

