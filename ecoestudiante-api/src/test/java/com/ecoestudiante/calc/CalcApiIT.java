package com.ecoestudiante.calc;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*; // <-- SOLO JUnit

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CalcApiIT {

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16")
          .withDatabaseName("ecoestudiante")
          .withUsername("eco")
          .withPassword("eco");

  @DynamicPropertySource
  static void bindProps(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    r.add("spring.datasource.username", POSTGRES::getUsername);
    r.add("spring.datasource.password", POSTGRES::getPassword);
    r.add("spring.flyway.enabled", () -> "true");
    r.add("spring.security.user.name", () -> "user");
    r.add("spring.security.user.password", () -> "password");
  }

  @LocalServerPort
  int port;

  @Autowired
  JdbcTemplate jdbc;

  @Autowired
  TestRestTemplate rest;

  String baseUrl() {
    return "http://localhost:" + port;
  }

  @BeforeEach
  void clean() {
    jdbc.update("DELETE FROM calculation_audit");
    jdbc.update("DELETE FROM calculation");
  }

  // --- Helpers ----

  record ElectricityInput(Double kwh, String country, String period, String idempotencyKey, String userId) {}
  record CalcResult(String calcId, Double kgCO2e, String factorHash) {}

  CalcResult postElectricity(ElectricityInput in, String idempotencyKeyHeader) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    if (idempotencyKeyHeader != null) headers.set("Idempotency-Key", idempotencyKeyHeader);
    HttpEntity<ElectricityInput> req = new HttpEntity<>(in, headers);
    ResponseEntity<CalcResult> resp = rest.postForEntity(
        baseUrl() + "/api/v1/calc/electricity", req, CalcResult.class);

    assertTrue(resp.getStatusCode().is2xxSuccessful(), "HTTP debe ser 2xx");
    assertNotNull(resp.getBody(), "El body no debe ser nulo");
    return resp.getBody();
  }

  // --- Tests ----

  @Test
  void cl_specific_factor_is_used() {
    String user = UUID.randomUUID().toString();
    ElectricityInput in = new ElectricityInput(10.0, "CL", "2025-09", "IGNORADO", user);

    CalcResult out = postElectricity(in, "cl-it-test");
    // 10 * 0.470 = 4.7
    assertEquals(4.7, out.kgCO2e(), 1e-9, "kgCO2e esperado para CL 2025-09");
    assertEquals("demo-abc123-cl-2025-09", out.factorHash(), "hash de factor CL 2025-09");
  }

  @Test
  void national_fallback_is_used_when_country_not_found() {
    String user = UUID.randomUUID().toString();
    ElectricityInput in = new ElectricityInput(10.0, "PE", "2025-09", "IGNORADO", user);

    CalcResult out = postElectricity(in, "pe-fallback-it-test");
    // 10 * 0.450 = 4.5
    assertEquals(4.5, out.kgCO2e(), 1e-9, "kgCO2e esperado para fallback nacional");
    assertEquals("demo-abc123-national-2025", out.factorHash(), "hash de factor nacional 2025");
  }

  @Test
  void idempotency_same_user_and_key_returns_same_calcId() {
    String user = UUID.randomUUID().toString();
    String headerKey = "idem-it-" + UUID.randomUUID();

    ElectricityInput in = new ElectricityInput(12.5, "CL", "2025-09", "IGNORADO", user);

    CalcResult a = postElectricity(in, headerKey);
    CalcResult b = postElectricity(in, headerKey);

    assertNotNull(a.calcId());
    assertEquals(a.calcId(), b.calcId(), "Misma clave de idempotencia + mismo usuario → mismo calcId");
  }

  @Test
  void concurrent_race_only_one_row_inserted_for_same_user_and_key() throws Exception {
    String user = UUID.randomUUID().toString();
    String headerKey = "race-it-" + UUID.randomUUID();
    ElectricityInput in = new ElectricityInput(8.0, "PE", "2025-09", "IGNORADO", user);

    int threads = 8;
    ExecutorService pool = Executors.newFixedThreadPool(threads);
    CountDownLatch ready = new CountDownLatch(threads);
    CountDownLatch start = new CountDownLatch(1);
    List<Callable<String>> calls = new ArrayList<>();

    for (int i = 0; i < threads; i++) {
      calls.add(() -> {
        ready.countDown();
        start.await(2, TimeUnit.SECONDS);
        CalcResult out = postElectricity(in, headerKey);
        return out.calcId();
      });
    }

    ready.await(2, TimeUnit.SECONDS);
    start.countDown();
    List<Future<String>> futs = pool.invokeAll(calls);
    pool.shutdown();

    List<String> ids = new ArrayList<>();
    for (Future<String> f : futs) ids.add(f.get());

    assertFalse(ids.isEmpty());
    String first = ids.get(0);
    for (String id : ids) assertEquals(first, id, "Todas las respuestas deben compartir el mismo calcId");

    Integer count = jdbc.queryForObject("""
      SELECT count(*)
      FROM calculation
      WHERE user_id = ?::uuid
        AND category = 'electricidad'
        AND input_json->>'idempotencyKey' = ?
      """, Integer.class, UUID.fromString(user), headerKey);

    assertNotNull(count);
    assertEquals(1, count.intValue(), "Debe existir una sola fila para (userId, idemKey) en 'electricidad'");
  }
}
