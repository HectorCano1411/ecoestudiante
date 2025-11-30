package com.ecoestudiante.admin.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DTOs para el módulo de administración
 */
public class AdminDtos {

    public record StudentSummary(
        UUID id,
        String username,
        String email,
        String carrera,
        String jornada,
        Long totalCalculations,
        Long completedMissions,
        Long totalMissions,
        Integer xpBalance,
        LocalDateTime lastActivity,
        boolean enabled
    ) {}

    public record StudentDetail(
        UUID id,
        String username,
        String email,
        String carrera,
        String jornada,
        boolean emailVerified,
        boolean enabled,
        String authProvider,
        LocalDateTime createdAt,
        LocalDateTime lastActivity,
        StudentStats stats,
        List<RecentCalculation> recentCalculations,
        List<MissionProgress> missionProgress
    ) {}

    public record StudentStats(
        Long totalCalculations,
        Long completedMissions,
        Long totalMissions,
        Integer xpBalance,
        Integer level,
        Double totalKgCO2e
    ) {}

    public record RecentCalculation(
        String calcId,
        String category,
        String subcategory,
        Double kgCO2e,
        LocalDateTime createdAt
    ) {}

    public record MissionProgress(
        String missionId,  // Cambiado a String para flexibilidad
        String title,
        String status,
        Integer currentProgress,
        Integer target,
        LocalDateTime assignedAt,
        LocalDateTime completedAt
    ) {}

    public record DashboardOverview(
        Long totalStudents,
        Long activeStudents,
        Long totalCalculations,
        Long totalMissionsCompleted,
        Double totalKgCO2e,
        Double averageCalculationsPerStudent,
        Double participationRate,
        List<CareerStats> topCareers,
        TimeSeriesStats monthlyStats
    ) {}

    public record CareerStats(
        String career,
        Long studentCount,
        Long totalCalculations,
        Double averageCalculations,
        Double totalKgCO2e
    ) {}

    public record TimeSeriesStats(
        List<TimePoint> data,
        String period
    ) {}

    public record TimePoint(
        String date,
        Long count,
        Double totalKgCO2e
    ) {}

    public record StatisticsRequest(
        String career,
        Integer year,
        LocalDateTime startDate,
        LocalDateTime endDate
    ) {}

    public record StudentsListResponse(
        List<StudentSummary> students,
        Long total,
        Integer page,
        Integer pageSize
    ) {}
}




