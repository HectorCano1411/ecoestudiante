package com.ecoestudiante.calc;

import com.ecoestudiante.auth.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class CalcServiceImpl implements CalcService {
  private static final Logger logger = LoggerFactory.getLogger(CalcServiceImpl.class);
  private final JdbcTemplate jdbc;
  private final TokenUtil tokenUtil;

  public CalcServiceImpl(JdbcTemplate jdbc, TokenUtil tokenUtil) {
    this.jdbc = jdbc;
    this.tokenUtil = tokenUtil;
  }

  /**
   * Mapea el tipo de combustible de inglés (frontend) a español (base de datos)
   */
  private String mapFuelTypeToSpanish(String fuelType) {
    if (fuelType == null) {
      logger.debug("fuelType es null, usando 'gasolina' por defecto");
      return "gasolina";
    }
    String normalized = fuelType.toLowerCase().trim();
    String mapped = switch (normalized) {
      case "gasoline" -> "gasolina";
      case "diesel" -> "diesel";
      case "electric" -> "electrico";
      case "hybrid" -> "hibrido";
      default -> {
        logger.warn("fuelType '{}' no reconocido, usando valor original", fuelType);
        yield fuelType; // Si ya está en español o es otro valor, mantenerlo
      }
    };
    logger.debug("Mapeando fuelType: '{}' -> '{}'", fuelType, mapped);
    return mapped;
  }

  @Override
  public CalcDtos.CalcResult computeElectricity(CalcDtos.ElectricityInput in) {
    // 1) Idempotencia: si ya existe, devolvemos el mismo calcId y resultado
    var exist = jdbc.query("""
        select id::text, result_kg_co2e, factor_hash
        from calculation
        where user_id = ?::uuid
          and category = 'electricidad'
          and input_json->>'idempotencyKey' = ?
        limit 1
        """,
        ps -> {
          ps.setObject(1, tokenUtil.normalizeUserIdToUuid(in.userId()));
          ps.setString(2, in.idempotencyKey());
        },
        rs -> rs.next()
            ? Map.of(
                "id", rs.getString(1),
                "kg", rs.getBigDecimal(2),
                "hash", rs.getString(3)
              )
            : null
    );

    if (exist != null) {
      double kgPrev = ((BigDecimal) exist.get("kg")).doubleValue();
      return new CalcDtos.CalcResult((String) exist.get("id"), kgPrev, (String) exist.get("hash"));
    }

    // 2) Selección de factor por país/periodo con fallback nacional
    // period = YYYY-MM -> usamos día 1 para evaluar vigencia (valid_from/valid_to)
    YearMonth ym = YearMonth.parse(in.period()); // ya validado por DTO
    LocalDate atDate = ym.atDay(1);

    var row = jdbc.query("""
        select ef.value, fv.hash
        from emission_factor ef
        join factor_version fv on fv.id = ef.version_id
        where ef.category = 'electricidad'
          and (ef.country = ? or ef.country is null)
          and fv.valid_from <= ?::date
          and (fv.valid_to is null or fv.valid_to >= ?::date)
        order by
          case when ef.country = ? then 0 else 1 end, -- país exacto primero
          fv.valid_from desc                           -- luego el más vigente
        limit 1
        """,
        ps -> {
          ps.setString(1, in.country());  // prioridad por país exacto
          ps.setObject(2, atDate);        // corte de vigencia
          ps.setObject(3, atDate);
          ps.setString(4, in.country());  // para el ORDER BY
        },
        rs -> rs.next()
            ? Map.of("value", rs.getBigDecimal(1),
                     "hash",  rs.getString(2))
            : null
    );

    if (row == null) {
      // No hay factor ni nacional ni específico -> señaliza con 422 (mapea en tu GlobalExceptionHandler)
      throw new IllegalStateException("No hay factor vigente para country=" + in.country()
          + " period=" + in.period() + " (ni fallback nacional)");
    }

    double factor = ((BigDecimal) row.get("value")).doubleValue();
    String factorHash = (String) row.get("hash");
    double kg = in.kwh() * factor;

    // 3) Persistencia del cálculo + snapshot del factor para trazabilidad
    UUID calcId = UUID.randomUUID();

    // Construir JSON de entrada con ObjectMapper para manejar correctamente las listas
    ObjectMapper mapper = new ObjectMapper();
    java.util.Map<String, Object> inputMap = new java.util.HashMap<>();
    inputMap.put("kwh", in.kwh());
    inputMap.put("country", in.country());
    inputMap.put("period", in.period());
    inputMap.put("idempotencyKey", in.idempotencyKey());
    inputMap.put("selectedAppliances", in.selectedAppliances() != null ? in.selectedAppliances() : java.util.Collections.emptyList());
    inputMap.put("career", in.career() != null ? in.career() : "");
    inputMap.put("schedule", in.schedule() != null ? in.schedule() : "");
    
    String inputJson;
    try {
      inputJson = mapper.writeValueAsString(inputMap);
    } catch (Exception e) {
      throw new RuntimeException("Error serializando input JSON", e);
    }

    try {
      jdbc.update("""
          insert into calculation (id, user_id, category, input_json, result_kg_co2e, factor_hash)
          values (?::uuid, ?::uuid, 'electricidad', cast(? as jsonb), ?, ?)
          """,
          calcId,
          tokenUtil.normalizeUserIdToUuid(in.userId()),
          inputJson,
          kg,
          factorHash
      );

      String factorSnapshot = """
        {"category":"electricidad","value": %s, "unit":"kgCO2e/kWh", "hash":"%s"}
        """.formatted(Double.toString(factor), factorHash);

      jdbc.update("""
          insert into calculation_audit (id, calculation_id, factor_snapshot)
          values (?::uuid, ?::uuid, cast(? as jsonb))
          """,
          UUID.randomUUID(), calcId, factorSnapshot
      );

      return new CalcDtos.CalcResult(calcId.toString(), kg, factorHash);

    } catch (DataIntegrityViolationException dup) {
      // Carrera: otro proceso insertó primero con (user_id, idempotencyKey)
      try {
        var again = jdbc.queryForMap("""
            select id::text, result_kg_co2e, factor_hash
            from calculation
            where user_id = ?::uuid
              and category = 'electricidad'
              and input_json->>'idempotencyKey' = ?
            limit 1
            """,
            tokenUtil.normalizeUserIdToUuid(in.userId()), in.idempotencyKey()
        );
        double kg2 = ((BigDecimal) again.get("result_kg_co2e")).doubleValue();
        return new CalcDtos.CalcResult(
            (String) again.get("id"),
            kg2,
            (String) again.get("factor_hash")
        );
      } catch (EmptyResultDataAccessException notFound) {
        throw new IllegalStateException(
            "Idempotency race detected but existing row not found for userId="
                + in.userId() + " idem=" + in.idempotencyKey(), dup);
      }
    }
  }

  @Override
  public CalcDtos.CalcResult computeTransport(CalcDtos.TransportInput in) {
    // 1) Idempotencia: si ya existe, devolvemos el mismo calcId y resultado
    var exist = jdbc.query("""
        select id::text, result_kg_co2e, factor_hash
        from calculation
        where user_id = ?::uuid
          and category = 'transporte'
          and input_json->>'idempotencyKey' = ?
        limit 1
        """,
        ps -> {
          ps.setObject(1, tokenUtil.normalizeUserIdToUuid(in.userId()));
          ps.setString(2, in.idempotencyKey());
        },
        rs -> rs.next()
            ? Map.of(
                "id", rs.getString(1),
                "kg", rs.getBigDecimal(2),
                "hash", rs.getString(3)
              )
            : null
    );

    if (exist != null) {
      double kgPrev = ((BigDecimal) exist.get("kg")).doubleValue();
      return new CalcDtos.CalcResult((String) exist.get("id"), kgPrev, (String) exist.get("hash"));
    }

    // 2) Determinar subcategoría según modo de transporte y tipo de combustible
    String subcategory;
    String transportMode = in.transportMode();
    String fuelType = in.fuelType();
    
    logger.debug("Procesando transporte - modo: '{}', fuelType: '{}', periodo: '{}'", 
        transportMode, fuelType, in.period());
    
    if ("car".equals(transportMode)) {
      subcategory = "auto_" + mapFuelTypeToSpanish(fuelType);
    } else if ("motorcycle".equals(transportMode)) {
      subcategory = "motocicleta_" + mapFuelTypeToSpanish(fuelType);
    } else if ("bus".equals(transportMode)) {
      subcategory = "bus";
    } else if ("metro".equals(transportMode)) {
      subcategory = "metro";
    } else if ("bicycle".equals(transportMode)) {
      subcategory = "bicicleta";
    } else if ("walking".equals(transportMode)) {
      subcategory = "caminando";
    } else if ("plane".equals(transportMode)) {
      subcategory = "avion";
    } else {
      logger.error("Modo de transporte no válido: '{}'", transportMode);
      throw new IllegalStateException("Modo de transporte no válido: " + transportMode);
    }
    
    logger.info("Buscando factor de emisión - subcategoría: '{}', periodo: '{}'", subcategory, in.period());

    // 3) Selección de factor por subcategoría
    YearMonth ym = YearMonth.parse(in.period());
    LocalDate atDate = ym.atDay(1);
    
    logger.debug("Fecha de vigencia evaluada: {}", atDate);

    var row = jdbc.query("""
        select ef.value, fv.hash, ef.subcategory, fv.valid_from, fv.valid_to
        from emission_factor ef
        join factor_version fv on fv.id = ef.version_id
        where ef.category = 'transporte'
          and ef.subcategory = ?
          and fv.valid_from <= ?::date
          and (fv.valid_to is null or fv.valid_to >= ?::date)
        order by fv.valid_from desc
        limit 1
        """,
        ps -> {
          ps.setString(1, subcategory);
          ps.setObject(2, atDate);
          ps.setObject(3, atDate);
        },
        rs -> {
          if (rs.next()) {
            return Map.of(
                "value", rs.getBigDecimal(1),
                "hash", rs.getString(2),
                "subcategory", rs.getString(3),
                "valid_from", rs.getObject(4, LocalDate.class),
                "valid_to", rs.getObject(5, LocalDate.class)
            );
          }
          return null;
        }
    );

    if (row == null) {
      // Intentar buscar qué subcategorías existen para debugging
      java.util.List<String> availableSubcategories = jdbc.query("""
          select distinct ef.subcategory
          from emission_factor ef
          join factor_version fv on fv.id = ef.version_id
          where ef.category = 'transporte'
            and fv.valid_from <= ?::date
            and (fv.valid_to is null or fv.valid_to >= ?::date)
          order by ef.subcategory
          """,
          (rs, rowNum) -> rs.getString(1),
          atDate
      );
      
      logger.error("No se encontró factor vigente para transporte - subcategoría buscada: '{}', periodo: '{}', fecha evaluada: '{}'", 
          subcategory, in.period(), atDate);
      logger.error("Subcategorías disponibles en la base de datos: {}", availableSubcategories);
      
      String errorMsg = String.format(
          "No hay factor vigente para transporte: %s periodo=%s. Subcategorías disponibles: %s",
          subcategory, in.period(), availableSubcategories != null ? availableSubcategories : "ninguna");
      throw new IllegalStateException(errorMsg);
    }
    
    logger.debug("Factor encontrado - subcategoría: '{}', valor: {}, hash: {}, vigente desde: {}, hasta: {}", 
        row.get("subcategory"), row.get("value"), row.get("hash"), row.get("valid_from"), row.get("valid_to"));

    double factor = ((BigDecimal) row.get("value")).doubleValue();
    String factorHash = (String) row.get("hash");
    
    // 4) Calcular emisiones base
    double kgBase = in.distance() * factor;
    
    // 5) Ajustar por ocupación (dividir emisiones entre pasajeros)
    double kg = kgBase;
    if (in.occupancy() != null && in.occupancy() > 0) {
      kg = kgBase / in.occupancy();
    }

    // 6) Persistencia del cálculo
    UUID calcId = UUID.randomUUID();

    // Construir JSON de entrada
    ObjectMapper mapper = new ObjectMapper();
    java.util.Map<String, Object> inputMap = new java.util.HashMap<>();
    inputMap.put("distance", in.distance());
    inputMap.put("transportMode", in.transportMode());
    if (in.fuelType() != null) inputMap.put("fuelType", in.fuelType());
    if (in.occupancy() != null) inputMap.put("occupancy", in.occupancy());
    inputMap.put("country", in.country());
    inputMap.put("period", in.period());
    inputMap.put("idempotencyKey", in.idempotencyKey());
    if (in.originLat() != null) inputMap.put("originLat", in.originLat());
    if (in.originLng() != null) inputMap.put("originLng", in.originLng());
    if (in.destinationLat() != null) inputMap.put("destinationLat", in.destinationLat());
    if (in.destinationLng() != null) inputMap.put("destinationLng", in.destinationLng());
    if (in.originAddress() != null) inputMap.put("originAddress", in.originAddress());
    if (in.destinationAddress() != null) inputMap.put("destinationAddress", in.destinationAddress());

    String inputJson;
    try {
      inputJson = mapper.writeValueAsString(inputMap);
    } catch (Exception e) {
      throw new RuntimeException("Error serializando input JSON", e);
    }

    try {
      jdbc.update("""
          insert into calculation (id, user_id, category, input_json, result_kg_co2e, factor_hash)
          values (?::uuid, ?::uuid, 'transporte', cast(? as jsonb), ?, ?)
          """,
          calcId,
          tokenUtil.normalizeUserIdToUuid(in.userId()),
          inputJson,
          kg,
          factorHash
      );

      String factorSnapshot = String.format(
          "{\"category\":\"transporte\",\"subcategory\":\"%s\",\"value\":%s,\"unit\":\"kgCO2e/km\",\"hash\":\"%s\"}",
          subcategory, Double.toString(factor), factorHash);

      jdbc.update("""
          insert into calculation_audit (id, calculation_id, factor_snapshot)
          values (?::uuid, ?::uuid, cast(? as jsonb))
          """,
          UUID.randomUUID(), calcId, factorSnapshot
      );

      return new CalcDtos.CalcResult(calcId.toString(), kg, factorHash);

    } catch (DataIntegrityViolationException dup) {
      // Carrera: otro proceso insertó primero
      try {
        var again = jdbc.queryForMap("""
            select id::text, result_kg_co2e, factor_hash
            from calculation
            where user_id = ?::uuid
              and category = 'transporte'
              and input_json->>'idempotencyKey' = ?
            limit 1
            """,
            tokenUtil.normalizeUserIdToUuid(in.userId()), in.idempotencyKey()
        );
        double kg2 = ((BigDecimal) again.get("result_kg_co2e")).doubleValue();
        return new CalcDtos.CalcResult(
            (String) again.get("id"),
            kg2,
            (String) again.get("factor_hash")
        );
      } catch (EmptyResultDataAccessException notFound) {
        throw new IllegalStateException(
            "Idempotency race detected but existing row not found for userId="
                + in.userId() + " idem=" + in.idempotencyKey(), dup);
      }
    }
  }

  @Override
  public CalcDtos.CalcHistoryResponse getHistory(String userId, String category, int page, int pageSize) {
    UUID userIdUuid = tokenUtil.normalizeUserIdToUuid(userId);
    int offset = page * pageSize;
    
    // Contar total
    String countSql = category != null && !category.isBlank()
        ? "SELECT COUNT(*) FROM calculation WHERE user_id = ?::uuid AND category = ?"
        : "SELECT COUNT(*) FROM calculation WHERE user_id = ?::uuid";
    
    Long total = category != null && !category.isBlank()
        ? jdbc.queryForObject(countSql, Long.class, userIdUuid, category)
        : jdbc.queryForObject(countSql, Long.class, userIdUuid);
    
    // Obtener registros paginados
    String sql = category != null && !category.isBlank()
        ? """
            SELECT id::text, category, input_json, result_kg_co2e, created_at
            FROM calculation
            WHERE user_id = ?::uuid AND category = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """
        : """
            SELECT id::text, category, input_json, result_kg_co2e, created_at
            FROM calculation
            WHERE user_id = ?::uuid
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """;
    
    java.util.List<CalcDtos.CalcHistoryItem> items = category != null && !category.isBlank()
        ? jdbc.query(sql,
            (rs, rowNum) -> {
              try {
                ObjectMapper mapper = new ObjectMapper();
                Map<String, Object> input = mapper.readValue(rs.getString("input_json"), 
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                
                return new CalcDtos.CalcHistoryItem(
                  rs.getString("id"),
                  rs.getString("category"),
                  input,
                  rs.getBigDecimal("result_kg_co2e").doubleValue(),
                  rs.getTimestamp("created_at").toLocalDateTime()
                );
              } catch (Exception e) {
                throw new RuntimeException("Error parsing JSON", e);
              }
            },
            userIdUuid, category, pageSize, offset)
        : jdbc.query(sql,
            (rs, rowNum) -> {
              try {
                ObjectMapper mapper = new ObjectMapper();
                Map<String, Object> input = mapper.readValue(rs.getString("input_json"), 
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                
                return new CalcDtos.CalcHistoryItem(
                  rs.getString("id"),
                  rs.getString("category"),
                  input,
                  rs.getBigDecimal("result_kg_co2e").doubleValue(),
                  rs.getTimestamp("created_at").toLocalDateTime()
                );
              } catch (Exception e) {
                throw new RuntimeException("Error parsing JSON", e);
              }
            },
            userIdUuid, pageSize, offset);
    
    return new CalcDtos.CalcHistoryResponse(
      items != null ? items : new ArrayList<>(),
      total != null ? total : 0L,
      page,
      pageSize
    );
  }
}


// package com.ecoestudiante.calc;

// import org.springframework.stereotype.Service;

// @Service
// public class CalcServiceImpl implements CalcService {

//     // Implementación simple para compilar y probar
//     @Override
//     public CalcDtos.CalcResult computeElectricity(CalcDtos.ElectricityInput in) {
//         // factor ejemplo (CL): 0.262 kgCO2e/kWh
//         double factor = 0.262d;
//         double kwh = in.getKwh() != null ? in.getKwh() : 0d;
//         double kg = kwh * factor;
//         return new CalcDtos.CalcResult(kg, factor, "factor país " + in.getCountry() + " " + in.getPeriod());
//     }
// }
