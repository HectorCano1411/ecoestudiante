package com.ecoestudiante.calc;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public final class CalcDtos {

  public record ElectricityInput(
      @Schema(description = "Consumo en kWh", example = "125.5")
      @Positive double kwh,

      @Schema(description = "País ISO-3166-1 alpha-2", example = "CL")
      @Pattern(regexp = "^[A-Z]{2}$", message = "country debe ser ISO-2 en mayúsculas, ej: CL")
      String country,

      @Schema(description = "Período contable YYYY-MM", example = "2025-09")
      @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "period debe ser YYYY-MM")
      String period,

      @Schema(description = "Clave de idempotencia")
      @NotBlank String idempotencyKey,

      @Schema(description = "Identificador del usuario (UUID)")
      @Pattern(
        regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
        message = "userId debe ser un UUID válido"
      )
      String userId
  ) {
    /** Si viene header Idempotency-Key, tiene prioridad sobre el body */
    public ElectricityInput withHeaderIdempotency(String header) {
      if (header == null || header.isBlank()) return this;
      return new ElectricityInput(kwh, country, period, header, userId);
    }
  }

  public record CalcResult(
      @Schema(description = "Identificador del cálculo")
      String calcId,
      @Schema(description = "Resultado en kgCO2e")
      double kgCO2e,
      @Schema(description = "Hash del factor utilizado")
      String factorHash
  ) {}
}

// package com.ecoestudiante.calc;

// import io.swagger.v3.oas.annotations.media.Schema;
// import jakarta.validation.constraints.Min;
// import jakarta.validation.constraints.NotBlank;
// import jakarta.validation.constraints.NotNull;
// import lombok.AllArgsConstructor;
// import lombok.Data;
// import lombok.NoArgsConstructor;

// public class CalcDtos {

//   @Data
//   @NoArgsConstructor
//   @AllArgsConstructor
//   public static class ElectricityInput {
//     @Schema(description = "Consumo en kWh del período", example = "125.5")
//     @NotNull @Min(0)
//     private Double kwh;

//     @Schema(description = "País (ISO-2) para factor", example = "CL")
//     @NotBlank
//     private String country;

//     @Schema(description = "Período contable", example = "2025-09")
//     @NotBlank
//     private String period;

//     @Schema(description = "Clave de idempotencia (opcional)", example = "a5f1e6c4-7b3b-4c36-9e0f-8d9fd1f7c2a1")
//     private String idempotencyKey;
//   }

//   @Data
//   @NoArgsConstructor
//   @AllArgsConstructor
//   public static class CalcResult {
//     @Schema(description = "Resultado del cálculo en kgCO2e", example = "32.88")
//     private Double kgCO2e;

//     @Schema(description = "Factor usado (kgCO2e/kWh)", example = "0.262")
//     private Double factor;

//     @Schema(description = "Detalles adicionales", example = "factor país CL 2025-09")
//     private String detail;
//   }
// }
