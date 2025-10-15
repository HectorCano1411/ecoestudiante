package com.ecoestudiante.calc;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/calc")
@Tag(name = "Calc", description = "Cálculos de emisiones")
public class CalcController {

  private final CalcService svc;

  public CalcController(CalcService svc) {
    this.svc = svc;
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
          """
  )
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
      @Valid @RequestBody CalcDtos.ElectricityInput in
  ) {
    var normalized = in.withHeaderIdempotency(idemHeader);
    return svc.computeElectricity(normalized);
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
