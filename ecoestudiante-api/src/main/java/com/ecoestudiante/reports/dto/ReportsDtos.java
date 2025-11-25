package com.ecoestudiante.reports.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

/**
 * DTOs para el Bounded Context de Reportes.
 * 
 * Este bounded context maneja:
 * - Generación de reportes de huella de carbono
 * - Exportación de reportes (PDF, CSV, Excel)
 * - Agregados anonimizados para análisis estadístico
 * - Jobs asíncronos de generación de reportes
 * 
 * Alineado con la arquitectura de microservicios descrita en la tesis.
 * 
 * @author EcoEstudiante Team
 * @version 0.1.0-SNAPSHOT
 * @since 2025-01-27
 */
public final class ReportsDtos {

    /**
     * Solicitud para generar un nuevo reporte.
     * 
     * El reporte se genera de forma asíncrona y el usuario puede
     * consultar su estado posteriormente.
     */
    public record ReportRequest(
            @Schema(description = "Tipo de reporte", example = "MONTHLY", allowableValues = {"MONTHLY", "YEARLY", "CUSTOM"})
            String reportType,
            
            @Schema(description = "Fecha de inicio (para reportes personalizados)", example = "2025-01-01")
            String startDate,
            
            @Schema(description = "Fecha de fin (para reportes personalizados)", example = "2025-01-31")
            String endDate,
            
            @Schema(description = "Formato de exportación deseado", example = "PDF", allowableValues = {"PDF", "CSV", "EXCEL"})
            String exportFormat,
            
            @Schema(description = "Categorías a incluir en el reporte (opcional)")
            java.util.List<String> categories,
            
            @Schema(description = "Incluir gráficos en el reporte", example = "true")
            Boolean includeCharts
    ) {}

    /**
     * Representa un job de generación de reporte.
     * 
     * Los reportes se generan de forma asíncrona, por lo que se retorna
     * un job que puede consultarse para conocer el estado.
     */
    public record ReportJob(
            @Schema(description = "ID único del job", example = "job-12345")
            String id,
            
            @Schema(description = "Estado del job", example = "PENDING", allowableValues = {"PENDING", "PROCESSING", "COMPLETED", "FAILED"})
            String status,
            
            @Schema(description = "Tipo de reporte solicitado")
            String reportType,
            
            @Schema(description = "Formato de exportación")
            String exportFormat,
            
            @Schema(description = "Fecha de creación del job")
            LocalDateTime createdAt,
            
            @Schema(description = "Fecha de finalización (si está completado)")
            LocalDateTime completedAt,
            
            @Schema(description = "URL de descarga del reporte (si está completado)")
            String downloadUrl,
            
            @Schema(description = "Mensaje de error (si falló)")
            String errorMessage,
            
            @Schema(description = "Progreso del job (0-100)", example = "75")
            Integer progress
    ) {}

    /**
     * Representa un reporte exportado disponible para descarga.
     */
    public record ReportExport(
            @Schema(description = "ID único del export", example = "export-12345")
            String id,
            
            @Schema(description = "Nombre del archivo", example = "reporte_enero_2025.pdf")
            String filename,
            
            @Schema(description = "Tipo de reporte")
            String reportType,
            
            @Schema(description = "Formato del archivo", example = "PDF")
            String format,
            
            @Schema(description = "Tamaño del archivo en bytes", example = "1048576")
            Long fileSize,
            
            @Schema(description = "URL de descarga")
            String downloadUrl,
            
            @Schema(description = "Fecha de generación")
            LocalDateTime generatedAt,
            
            @Schema(description = "Fecha de expiración del enlace de descarga")
            LocalDateTime expiresAt
    ) {}

    /**
     * Respuesta con lista de exports disponibles.
     */
    public record ExportsResponse(
            @Schema(description = "Lista de exports disponibles")
            java.util.List<ReportExport> exports,
            
            @Schema(description = "Total de exports")
            Integer total
    ) {}

    /**
     * Agregado anonimizado para análisis estadístico.
     * 
     * Estos datos se usan para análisis agregados sin exponer
     * información personal de usuarios individuales.
     */
    public record AnonymizedAggregate(
            @Schema(description = "Período del agregado", example = "2025-01")
            String period,
            
            @Schema(description = "Categoría", example = "transporte")
            String category,
            
            @Schema(description = "Promedio de emisiones en kg CO₂e")
            Double averageEmissions,
            
            @Schema(description = "Total de registros incluidos")
            Long recordCount,
            
            @Schema(description = "Región (opcional, anonimizada)")
            String region
    ) {}
}

