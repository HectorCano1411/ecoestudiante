package com.ecoestudiante.admin.service;

import com.ecoestudiante.admin.dto.AdminDtos;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Interfaz del servicio de administración
 */
public interface AdminService {
    
    /**
     * Obtiene el resumen del dashboard
     */
    AdminDtos.DashboardOverview getDashboardOverview();
    
    /**
     * Obtiene lista de estudiantes con paginación
     */
    AdminDtos.StudentsListResponse getStudents(Integer page, Integer pageSize, String search, String career);
    
    /**
     * Obtiene detalles completos de un estudiante
     */
    Optional<AdminDtos.StudentDetail> getStudentDetail(UUID studentId);
    
    /**
     * Obtiene estadísticas por carrera
     */
    List<AdminDtos.CareerStats> getStatisticsByCareer(String career, Integer year);
    
    /**
     * Obtiene estadísticas de series temporales
     */
    AdminDtos.TimeSeriesStats getTimeSeriesStatistics(Integer year);
}




