package com.ecoestudiante.calc;

import com.ecoestudiante.auth.JwtUtil;
import com.ecoestudiante.auth.TokenUtil;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calc")
@Tag(name = "Calc", description = "Cálculos de emisiones")
public class CalcController {

  private static final Logger logger = LoggerFactory.getLogger(CalcController.class);
  private final CalcService svc;
  private final JwtUtil jwtUtil;
  private final TokenUtil tokenUtil;

  public CalcController(CalcService svc, JwtUtil jwtUtil, TokenUtil tokenUtil) {
    this.svc = svc;
    this.jwtUtil = jwtUtil;
    this.tokenUtil = tokenUtil;
  }

  /**
   * Extrae el userId del token de autenticación (soporta tokens propios y Auth0).
   */
  private String getUserIdFromRequest(HttpServletRequest request) {
    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      throw new SecurityException("Token no encontrado");
    }
    String token = authHeader.substring(7);
    
    // Usar TokenUtil para extraer userId (maneja ambos tipos de tokens)
    String userId = tokenUtil.extractUserId(token);
    
    if (userId == null || userId.isBlank()) {
      logger.warn("No se pudo extraer userId del token");
      throw new SecurityException("No se pudo extraer userId del token");
    }
    
    logger.debug("UserId extraído del token: {}", userId);
    return userId;
  }

  /**
   * Normaliza userId a UUID válido usando TokenUtil.
   * Si userId es un UUID válido, lo retorna.
   * Si userId es un Auth0 sub u otro formato, genera un UUID determinístico basado en el userId.
   */
  private String normalizeUserId(String userId) {
    UUID uuid = tokenUtil.normalizeUserIdToUuid(userId);
    return uuid.toString();
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
    if (userId == null || userId.isBlank()) {
      try {
        userId = getUserIdFromRequest(request);
        logger.debug("UserId extraído del token: {}", userId);
      } catch (Exception e) {
        logger.warn("No se pudo extraer userId del token, usando el del body: {}", e.getMessage());
        // Si no se puede extraer del token y no hay en el body, lanzar excepción
        if (userId == null || userId.isBlank()) {
          throw new SecurityException("Token requerido o inválido");
        }
      }
    }
    
    // Normalizar userId a UUID (maneja Auth0 sub y otros formatos)
    String normalizedUserId = normalizeUserId(userId);
    
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
    
    logger.debug("Procesando cálculo de electricidad - userId original: {}, userId normalizado: {}", userId, normalizedUserId);
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
    String userId = getUserIdFromRequest(request);
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
    String userId = getUserIdFromRequest(request);
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
