package com.ecoestudiante.calc;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.UUID;

@Service
public class CalcServiceImpl implements CalcService {
  private final JdbcTemplate jdbc;

  public CalcServiceImpl(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
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
          ps.setObject(1, UUID.fromString(in.userId()));
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

    String inputJson = """
      {"kwh": %s, "country":"%s", "period":"%s", "idempotencyKey":"%s"}
      """.formatted(
        Double.toString(in.kwh()),
        in.country(),
        in.period(),
        in.idempotencyKey()
      );

    try {
      jdbc.update("""
          insert into calculation (id, user_id, category, input_json, result_kg_co2e, factor_hash)
          values (?::uuid, ?::uuid, 'electricidad', cast(? as jsonb), ?, ?)
          """,
          calcId,
          UUID.fromString(in.userId()),
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
            UUID.fromString(in.userId()), in.idempotencyKey()
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
