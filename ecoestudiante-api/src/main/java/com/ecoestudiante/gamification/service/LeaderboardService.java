package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.dto.MissionDtos;

/**
 * Interfaz del servicio de Leaderboard (Ranking).
 *
 * Gestiona el cálculo y obtención del ranking semanal basado en
 * kg de CO₂ evitados por los usuarios.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
public interface LeaderboardService {

    /**
     * Obtiene el leaderboard de la semana actual
     *
     * @param topN Número de usuarios top a retornar (default: 10)
     * @return Leaderboard con top N y posición del usuario actual (si no está en top)
     */
    MissionDtos.LeaderboardResponse getCurrentWeekLeaderboard(int topN);

    /**
     * Obtiene el leaderboard de una semana específica
     *
     * @param weekNumber Número de semana ISO (ejemplo: "2025-W01")
     * @param year Año
     * @param topN Número de usuarios top a retornar
     * @return Leaderboard de la semana
     */
    MissionDtos.LeaderboardResponse getWeekLeaderboard(String weekNumber, Integer year, int topN);

    /**
     * Obtiene la posición de un usuario en el leaderboard de la semana actual
     *
     * @param userId ID del usuario
     * @return Entrada del leaderboard del usuario
     */
    MissionDtos.LeaderboardEntryResponse getUserPosition(Long userId);

    /**
     * Obtiene la posición de un usuario en una semana específica
     *
     * @param userId ID del usuario
     * @param weekNumber Número de semana ISO
     * @param year Año
     * @return Entrada del leaderboard del usuario
     */
    MissionDtos.LeaderboardEntryResponse getUserPositionInWeek(Long userId, String weekNumber, Integer year);

    /**
     * Recalcula el leaderboard de la semana actual
     * (actualiza el cache con datos frescos)
     *
     * @return Número de usuarios procesados
     */
    int recalculateCurrentWeekLeaderboard();

    /**
     * Recalcula el leaderboard de una semana específica
     *
     * @param weekNumber Número de semana ISO
     * @param year Año
     * @return Número de usuarios procesados
     */
    int recalculateWeekLeaderboard(String weekNumber, Integer year);

    /**
     * Actualiza la entrada del leaderboard para un usuario específico
     * (llamado después de completar una misión)
     *
     * @param userId ID del usuario
     * @param weekNumber Número de semana ISO
     * @param year Año
     */
    void updateUserLeaderboardEntry(Long userId, String weekNumber, Integer year);

    /**
     * Calcula los kg de CO₂ evitados por un usuario en una semana
     * (comparado con su baseline de 4 semanas anteriores)
     *
     * @param userId ID del usuario
     * @param weekNumber Número de semana ISO
     * @param year Año
     * @return kg de CO₂ evitados (puede ser negativo si aumentó emisiones)
     */
    java.math.BigDecimal calculateCo2AvoidedForWeek(Long userId, String weekNumber, Integer year);
}
