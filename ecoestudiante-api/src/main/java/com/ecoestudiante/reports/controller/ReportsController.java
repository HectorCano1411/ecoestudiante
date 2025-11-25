package com.ecoestudiante.reports.controller;

import com.ecoestudiante.auth.UserContextResolver;
import com.ecoestudiante.reports.dto.ReportsDtos;
import com.ecoestudiante.reports.service.ReportsService;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para el Servicio de Reportes.
 * 
 * Este bounded context maneja:
 * - Generación asíncrona de reportes de huella de carbono
 * - Exportación de reportes en múltiples formatos (PDF, CSV, Excel)
 * - Gestión de jobs de generación de reportes
 * - Agregados anonimizados para análisis estadístico
 * 
 * Ruta base: /api/v1/reports
 * Alineado con arquitectura de microservicios descrita en la tesis.
 * 
 * NOTA: Implementación inicial es STUB - retorna datos mock.
 * La estructura está lista para implementación completa futura.
 * 
 * @author EcoEstudiante Team
 * @version 0.1.0-SNAPSHOT
 * @since 2025-01-27
 */
@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Reportes", description = "API para generación y exportación de reportes de huella de carbono")
public class ReportsController {

    private static final Logger logger = LoggerFactory.getLogger(ReportsController.class);
    private final ReportsService reportsService;
    private final UserContextResolver userContextResolver;

    public ReportsController(
            ReportsService reportsService,
            UserContextResolver userContextResolver) {
        this.reportsService = reportsService;
        this.userContextResolver = userContextResolver;
    }

    /**
     * Inicia la generación asíncrona de un reporte.
     * 
     * El reporte se procesa en background y el usuario puede consultar
     * su estado usando el jobId retornado.
     * 
     * @param request Parámetros del reporte a generar
     * @param httpRequest HttpServletRequest para extraer información del usuario
     * @return Job de generación de reporte con estado PENDING
     */
    @PostMapping(
            path = "/generate",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Generar reporte asíncrono",
            description = "Inicia la generación asíncrona de un reporte de huella de carbono. " +
                    "El reporte se procesa en background y puede consultarse usando el jobId retornado. " +
                    "Soporta múltiples formatos: PDF, CSV, Excel."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "202",
                    description = "Generación de reporte iniciada (aceptado)",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ReportsDtos.ReportJob.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Solicitud inválida"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<ReportsDtos.ReportJob> generateReport(
            @Valid @RequestBody ReportsDtos.ReportRequest request,
            HttpServletRequest httpRequest) {
        try {
            String userId = userContextResolver.resolve(httpRequest).normalizedUserIdAsString();
            logger.info("Generando reporte para usuario: {}, tipo: {}, formato: {}",
                    userId, request.reportType(), request.exportFormat());
            
            ReportsDtos.ReportJob job = reportsService.generateReport(userId, request);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(job);
        } catch (Exception e) {
            logger.error("Error al generar reporte", e);
            throw new RuntimeException("Error al generar reporte", e);
        }
    }

    /**
     * Consulta el estado de un job de generación de reporte.
     * 
     * @param jobId ID del job a consultar
     * @param httpRequest HttpServletRequest para extraer información del usuario
     * @return Estado actual del job
     */
    @GetMapping(
            path = "/jobs/{jobId}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Consultar estado de reporte",
            description = "Retorna el estado actual de un job de generación de reporte. " +
                    "Los estados posibles son: PENDING, PROCESSING, COMPLETED, FAILED. " +
                    "Si el estado es COMPLETED, incluye la URL de descarga."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Estado del job obtenido exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ReportsDtos.ReportJob.class)
                    )
            ),
            @ApiResponse(responseCode = "404", description = "Job no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "403", description = "No autorizado para acceder a este job"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<ReportsDtos.ReportJob> getReportJob(
            @PathVariable String jobId,
            HttpServletRequest httpRequest) {
        try {
            String userId = userContextResolver.resolve(httpRequest).normalizedUserIdAsString();
            logger.info("Consultando job: {} para usuario: {}", jobId, userId);
            
            ReportsDtos.ReportJob job = reportsService.getReportJob(jobId, userId);
            
            if (job == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(job);
        } catch (Exception e) {
            logger.error("Error al consultar job de reporte", e);
            throw new RuntimeException("Error al consultar job de reporte", e);
        }
    }

    /**
     * Obtiene lista de exports disponibles para el usuario.
     * 
     * @param httpRequest HttpServletRequest para extraer información del usuario
     * @return Lista de exports disponibles para descarga
     */
    @GetMapping(
            path = "/exports",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Listar exportaciones disponibles",
            description = "Retorna lista de reportes exportados disponibles para descarga. " +
                    "Solo incluye exports que no han expirado."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de exports obtenida exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ReportsDtos.ExportsResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<ReportsDtos.ExportsResponse> getExports(HttpServletRequest httpRequest) {
        try {
            String userId = userContextResolver.resolve(httpRequest).normalizedUserIdAsString();
            logger.info("Obteniendo exports para usuario: {}", userId);
            
            List<ReportsDtos.ReportExport> exports = reportsService.getExports(userId);
            
            ReportsDtos.ExportsResponse response = new ReportsDtos.ExportsResponse(
                    exports,
                    exports != null ? exports.size() : 0
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al obtener exports", e);
            throw new RuntimeException("Error al obtener exports", e);
        }
    }

    /**
     * Obtiene agregados anonimizados para análisis estadístico.
     * 
     * Estos datos se usan para análisis agregados sin exponer
     * información personal de usuarios individuales.
     * 
     * @param period Período del agregado (ej: "2025-01")
     * @param category Categoría a agregar (opcional)
     * @return Lista de agregados anonimizados
     */
    @GetMapping(
            path = "/aggregates",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Obtener agregados anonimizados",
            description = "Retorna agregados estadísticos anonimizados para análisis. " +
                    "Los datos están agregados y no contienen información personal identificable."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Agregados obtenidos exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ReportsDtos.AnonymizedAggregate.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<List<ReportsDtos.AnonymizedAggregate>> getAnonymizedAggregates(
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "category", required = false) String category,
            HttpServletRequest httpRequest) {
        try {
            String userId = userContextResolver.resolve(httpRequest).normalizedUserIdAsString();
            logger.info("Obteniendo agregados anonimizados para usuario: {}, period: {}, category: {}",
                    userId, period, category);
            
            List<ReportsDtos.AnonymizedAggregate> aggregates = 
                    reportsService.getAnonymizedAggregates(period, category);
            
            return ResponseEntity.ok(aggregates);
        } catch (Exception e) {
            logger.error("Error al obtener agregados anonimizados", e);
            throw new RuntimeException("Error al obtener agregados anonimizados", e);
        }
    }
}




