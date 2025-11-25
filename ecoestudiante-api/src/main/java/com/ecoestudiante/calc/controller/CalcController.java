package com.ecoestudiante.calc.controller;

import com.ecoestudiante.auth.UserContext;
import com.ecoestudiante.auth.UserContextResolver;
import com.ecoestudiante.calc.dto.CalcDtos;
import com.ecoestudiante.calc.service.CalcService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para el Servicio de Cálculo CO₂e.
 * 
 * Este bounded context maneja:
 * - Cálculos de electricidad
 * - Cálculos de transporte
 * - Historial de cálculos
 * - Factores de emisión aplicados
 * 
 * Ruta base: /api/v1/calc
 * Alineado con arquitectura de microservicios descrita en la tesis.
 */
@RestController
@RequestMapping("/api/v1/calc")
@Tag(name = "Cálculo CO₂e", description = "API para cálculo de huella de carbono")
public class CalcController {

  private static final Logger logger = LoggerFactory.getLogger(CalcController.class);
  private final CalcService svc;
  private final UserContextResolver userContextResolver;

  public CalcController(CalcService svc, UserContextResolver userContextResolver) {
    this.svc = svc;
    this.userContextResolver = userContextResolver;
  }

  @PostMapping(
      path = "/electricity",
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE
  )
  @Operation(
      summary = "Calcula kgCO2e para electricidad (idempotente por Idempotency-Key)",
      description = """
          La operación es idempotente por la combinación (userId, Idempotency-Key).
          Puedes enviar la clave en el header 'Idempotency-Key' o en el body como 'idempotencyKey'.
          Si se envían ambas, el header tiene prioridad.
          El userId se extrae automáticamente del token JWT si no se proporciona en el body.
          """
  )
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
      @ApiResponse(
          responseCode = "200",
          description = "Cálculo exitoso",
          content = @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = CalcDtos.CalcResult.class)
          )
      ),
      @ApiResponse(responseCode = "400", description = "Solicitud inválida / validación fallida"),
      @ApiResponse(responseCode = "422", description = "Datos válidos pero no procesables"),
      @ApiResponse(responseCode = "500", description = "Error interno")
  })
  public CalcDtos.CalcResult electricity(
      @RequestHeader(name = "Idempotency-Key", required = false) String idemHeader,
      @Valid @RequestBody CalcDtos.ElectricityInput in,
      HttpServletRequest request
  ) {
    // Extraer userId del token si no está en el body o está vacío
    String userId = in.userId();
    String normalizedUserId;

    if (userId == null || userId.isBlank()) {
      // Si no viene userId en el body, extraerlo del token
      UserContext context = userContextResolver.resolve(request);
      normalizedUserId = context.normalizedUserIdAsString();
      userId = context.userId();
      logger.debug("UserId extraído del token - original: {}, normalizado: {}", userId, normalizedUserId);
    } else {
      // Si viene userId en el body, normalizarlo
      normalizedUserId = userContextResolver.normalizeUserId(userId);
      logger.debug("UserId del body normalizado - original: {}, normalizado: {}", userId, normalizedUserId);
    }

    // Validación adicional para asegurar que el userId no es null
    if (userId == null || userId.isBlank() || normalizedUserId == null || normalizedUserId.isBlank()) {
      throw new IllegalArgumentException("No se pudo obtener el userId del token o del body");
    }

    // Crear nuevo input con userId normalizado
    var normalized = new CalcDtos.ElectricityInput(
        in.kwh(),
        in.country(),
        in.period(),
        idemHeader != null && !idemHeader.isBlank() ? idemHeader : in.idempotencyKey(),
        normalizedUserId,
        in.selectedAppliances(),
        in.career(),
        in.schedule()
    );

    logger.debug("Procesando cálculo de electricidad - kwh: {}, country: {}, period: {}", in.kwh(), in.country(), in.period());
    return svc.computeElectricity(normalized);
  }

  @PostMapping(
      path = "/transport",
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE
  )
  @Operation(
      summary = "Calcula kgCO2e para transporte (idempotente por Idempotency-Key)",
      description = """
          Calcula emisiones de carbono para diferentes modos de transporte.
          La operación es idempotente por la combinación (userId, Idempotency-Key).
          """
  )
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
      @ApiResponse(
          responseCode = "200",
          description = "Cálculo exitoso",
          content = @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = CalcDtos.CalcResult.class)
          )
      ),
      @ApiResponse(responseCode = "400", description = "Solicitud inválida / validación fallida"),
      @ApiResponse(responseCode = "422", description = "Datos válidos pero no procesables"),
      @ApiResponse(responseCode = "500", description = "Error interno")
  })
  public CalcDtos.CalcResult transport(
      @RequestHeader(name = "Idempotency-Key", required = false) String idemHeader,
      @Valid @RequestBody CalcDtos.TransportInput in,
      HttpServletRequest request
  ) {
    UserContext context = userContextResolver.resolve(request);
    String userId = context.normalizedUserIdAsString();
    var normalized = new CalcDtos.TransportInput(
        in.distance(),
        in.transportMode(),
        in.fuelType(),
        in.occupancy(),
        in.country(),
        in.period(),
        idemHeader != null && !idemHeader.isBlank() ? idemHeader : in.idempotencyKey(),
        userId,
        in.originLat(),
        in.originLng(),
        in.destinationLat(),
        in.destinationLng(),
        in.originAddress(),
        in.destinationAddress()
    );
    return svc.computeTransport(normalized);
  }

  @GetMapping(
      path = "/history",
      produces = MediaType.APPLICATION_JSON_VALUE
  )
  @Operation(
      summary = "Obtener historial de cálculos",
      description = "Retorna el historial de cálculos del usuario autenticado con paginación"
  )
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
      @ApiResponse(
          responseCode = "200",
          description = "Historial obtenido exitosamente",
          content = @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = CalcDtos.CalcHistoryResponse.class)
          )
      ),
      @ApiResponse(responseCode = "401", description = "No autenticado"),
      @ApiResponse(responseCode = "500", description = "Error interno")
  })
  public CalcDtos.CalcHistoryResponse getHistory(
      @RequestParam(value = "category", required = false) String category,
      @RequestParam(value = "page", defaultValue = "0") int page,
      @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
      HttpServletRequest request
  ) {
    UserContext context = userContextResolver.resolve(request);
    String userId = context.normalizedUserIdAsString();
    logger.info("Obteniendo historial para usuario: {}, categoría: {}, página: {}", userId, category, page);
    return svc.getHistory(userId, category, page, pageSize);
  }
}

// package com.ecoestudiante.calc;

// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.media.Content;
// import io.swagger.v3.oas.annotations.media.Schema;
// import io.swagger.v3.oas.annotations.responses.ApiResponse;
// import io.swagger.v3.oas.annotations.responses.ApiResponses;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import jakarta.validation.Valid;
// import org.springframework.http.MediaType;
// import org.springframework.web.bind.annotation.*;

// @RestController
// @RequestMapping("/api/v1/calc")
// @Tag(name = "Calc", description = "Cálculos de emisiones")
// public class CalcController {

//   private final CalcService svc;

//   public CalcController(CalcService svc) {
//     this.svc = svc;
//   }

//   @PostMapping(
//           path = "/electricity",
//           consumes = MediaType.APPLICATION_JSON_VALUE,
//           produces = MediaType.APPLICATION_JSON_VALUE
//   )
//   @Operation(
//           summary = "Calcula kgCO2e para electricidad",
//           description = "Calcula emisiones en kgCO2e a partir del consumo eléctrico. " +
//                   "La operación puede ser idempotente si envías un header Idempotency-Key."
//   )
//   @ApiResponses({
//           @ApiResponse(
//                   responseCode = "200",
//                   description = "Cálculo exitoso",
//                   content = @Content(
//                           mediaType = "application/json",
//                           schema = @Schema(implementation = CalcDtos.CalcResult.class)
//                   )
//           ),
//           @ApiResponse(responseCode = "400", description = "Solicitud inválida / validación fallida"),
//           @ApiResponse(responseCode = "422", description = "Datos válidos pero no procesables"),
//           @ApiResponse(responseCode = "500", description = "Error interno")
//   })
//   public CalcDtos.CalcResult electricity(@Valid @RequestBody CalcDtos.ElectricityInput in) {
//     return svc.computeElectricity(in);
//   }
// }
