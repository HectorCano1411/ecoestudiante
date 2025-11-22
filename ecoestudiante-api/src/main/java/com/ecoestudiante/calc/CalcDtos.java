package com.ecoestudiante.calc;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.Map;

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

      @Schema(description = "Identificador del usuario (UUID o Auth0 sub). Si no se proporciona, se extrae del token.")
      String userId,

      @Schema(description = "Lista de artefactos seleccionados", example = "[\"laptop\", \"celular\", \"lampara\"]")
      java.util.List<String> selectedAppliances,

      @Schema(description = "Carrera universitaria", example = "Ingeniería en Informática")
      String career,

      @Schema(description = "Jornada de estudio", example = "diurna")
      String schedule
  ) {
    /** Si viene header Idempotency-Key, tiene prioridad sobre el body */
    public ElectricityInput withHeaderIdempotency(String header) {
      if (header == null || header.isBlank()) return this;
      return new ElectricityInput(kwh, country, period, header, userId, selectedAppliances, career, schedule);
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

  public record FactorInfo(
      @Schema(description = "Valor del factor de emisión")
      Double value,
      @Schema(description = "Unidad del factor (kgCO2e/km, kgCO2e/kWh, etc.)")
      String unit,
      @Schema(description = "Subcategoría del factor (para transporte)")
      String subcategory
  ) {}
  
  public record CalcHistoryItem(
      @Schema(description = "ID del cálculo")
      String calcId,
      @Schema(description = "Categoría")
      String category,
      @Schema(description = "Subcategoría (modo de transporte, tipo de electrodoméstico, etc.)")
      String subcategory,
      @Schema(description = "Datos de entrada (JSON)")
      Map<String, Object> input,
      @Schema(description = "Resultado en kgCO2e")
      double kgCO2e,
      @Schema(description = "Información del factor de emisión utilizado")
      FactorInfo factorInfo,
      @Schema(description = "Fecha de creación")
      LocalDateTime createdAt
  ) {}

  public record CalcHistoryResponse(
      @Schema(description = "Lista de cálculos")
      java.util.List<CalcHistoryItem> items,
      @Schema(description = "Total de registros")
      long total,
      @Schema(description = "Página actual")
      int page,
      @Schema(description = "Tamaño de página")
      int pageSize
  ) {}

  public record TransportInput(
      @Schema(description = "Distancia en km", example = "15.5")
      @Positive double distance,

      @Schema(description = "Modo de transporte", example = "car")
      @NotBlank String transportMode,

      @Schema(description = "Tipo de combustible (solo para car/motorcycle)", example = "gasoline")
      String fuelType,

      @Schema(description = "Número de pasajeros (solo para car/bus)", example = "1")
      Integer occupancy,

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
      String userId,

      @Schema(description = "Latitud del origen (opcional)")
      Double originLat,

      @Schema(description = "Longitud del origen (opcional)")
      Double originLng,

      @Schema(description = "Latitud del destino (opcional)")
      Double destinationLat,

      @Schema(description = "Longitud del destino (opcional)")
      Double destinationLng,

      @Schema(description = "Dirección del origen (opcional)")
      String originAddress,

      @Schema(description = "Dirección del destino (opcional)")
      String destinationAddress
  ) {
    public TransportInput withHeaderIdempotency(String header) {
      if (header == null || header.isBlank()) return this;
      return new TransportInput(distance, transportMode, fuelType, occupancy, country, period, header, userId,
          originLat, originLng, destinationLat, destinationLng, originAddress, destinationAddress);
    }
  }
}
