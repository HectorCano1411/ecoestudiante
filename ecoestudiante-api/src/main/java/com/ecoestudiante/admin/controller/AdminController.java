package com.ecoestudiante.admin.controller;

import com.ecoestudiante.admin.dto.AdminDtos;
import com.ecoestudiante.admin.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Administración", description = "API para administración del sistema")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESOR')")  // Todos los endpoints requieren rol ADMIN, SUPER_ADMIN o PROFESOR
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard/overview")
    @Operation(summary = "Obtener resumen del dashboard", description = "Retorna KPIs y métricas generales")
    public ResponseEntity<AdminDtos.DashboardOverview> getDashboardOverview(
            org.springframework.security.core.Authentication authentication) {
        // Logging detallado para depuración
        if (authentication != null) {
            logger.info("🔍 [AdminController] Usuario autenticado: {}", authentication.getName());
            logger.info("🔍 [AdminController] Authorities: {}", 
                authentication.getAuthorities().stream()
                    .map(a -> a.getAuthority())
                    .toList());
        } else {
            logger.warn("⚠️ [AdminController] Authentication es null");
        }
        logger.info("Solicitud de resumen del dashboard");
        return ResponseEntity.ok(adminService.getDashboardOverview());
    }

    @GetMapping("/students")
    @Operation(summary = "Listar estudiantes", description = "Retorna lista paginada de estudiantes con filtros opcionales")
    public ResponseEntity<AdminDtos.StudentsListResponse> getStudents(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "50") Integer pageSize,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String career,
            @RequestParam(required = false) UUID institutionId,
            @RequestParam(required = false) UUID campusId) {
        logger.info("Solicitud de lista de estudiantes - página: {}, institutionId: {}, campusId: {}", 
                   page, institutionId, campusId);
        return ResponseEntity.ok(adminService.getStudents(page, pageSize, search, career, institutionId, campusId));
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Obtener detalle de estudiante", description = "Retorna información completa de un estudiante")
    public ResponseEntity<AdminDtos.StudentDetail> getStudentDetail(@PathVariable UUID studentId) {
        logger.info("Solicitud de detalle de estudiante: {}", studentId);
        return adminService.getStudentDetail(studentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/statistics/by-career")
    @Operation(summary = "Estadísticas por carrera", description = "Retorna estadísticas agrupadas por carrera con filtros opcionales")
    public ResponseEntity<List<AdminDtos.CareerStats>> getStatisticsByCareer(
            @RequestParam(required = false) String career,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UUID institutionId,
            @RequestParam(required = false) UUID campusId) {
        logger.info("Solicitud de estadísticas por carrera: career={}, year={}, institutionId={}, campusId={}", 
                   career, year, institutionId, campusId);
        return ResponseEntity.ok(adminService.getStatisticsByCareer(career, year, institutionId, campusId));
    }

    @GetMapping("/statistics/time-series")
    @Operation(summary = "Estadísticas temporales", description = "Retorna estadísticas en series temporales con filtros opcionales")
    public ResponseEntity<AdminDtos.TimeSeriesStats> getTimeSeriesStatistics(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UUID institutionId,
            @RequestParam(required = false) UUID campusId) {
        logger.info("Solicitud de estadísticas temporales - año: {}, institutionId: {}, campusId: {}", 
                   year, institutionId, campusId);
        return ResponseEntity.ok(adminService.getTimeSeriesStatistics(year, institutionId, campusId));
    }
}








