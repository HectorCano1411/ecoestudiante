package com.ecoestudiante.reports.service;

import com.ecoestudiante.reports.dto.ReportsDtos;
import java.util.List;

/**
 * Interfaz del servicio de Reportes.
 * 
 * Define los contratos para el bounded context de Reportes:
 * - Generación asíncrona de reportes
 * - Gestión de jobs de reportes
 * - Exportación de reportes (PDF, CSV, Excel)
 * - Agregados anonimizados
 * 
 * Implementación inicial: Stub que retorna datos vacíos o mock.
 * 
 * Alineado con la arquitectura de microservicios descrita en la tesis.
 * 
 * @author EcoEstudiante Team
 * @version 0.1.0-SNAPSHOT
 * @since 2025-01-27
 */
public interface ReportsService {

    /**
     * Inicia la generación asíncrona de un reporte.
     * 
     * @param userId ID del usuario (UUID normalizado)
     * @param request Parámetros del reporte solicitado
     * @return Job de generación de reporte
     */
    ReportsDtos.ReportJob generateReport(String userId, ReportsDtos.ReportRequest request);

    /**
     * Consulta el estado de un job de generación de reporte.
     * 
     * @param jobId ID del job
     * @param userId ID del usuario (UUID normalizado) - para validación de acceso
     * @return Estado actual del job
     */
    ReportsDtos.ReportJob getReportJob(String jobId, String userId);

    /**
     * Obtiene lista de exports disponibles para el usuario.
     * 
     * @param userId ID del usuario (UUID normalizado)
     * @return Lista de exports disponibles
     */
    List<ReportsDtos.ReportExport> getExports(String userId);

    /**
     * Obtiene agregados anonimizados para análisis estadístico.
     * 
     * @param period Período del agregado (ej: "2025-01")
     * @param category Categoría a agregar (opcional)
     * @return Lista de agregados anonimizados
     */
    List<ReportsDtos.AnonymizedAggregate> getAnonymizedAggregates(String period, String category);
}




