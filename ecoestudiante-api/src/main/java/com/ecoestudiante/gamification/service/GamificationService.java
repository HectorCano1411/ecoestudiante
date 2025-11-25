package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.dto.GamificationDtos;
import java.util.List;

/**
 * Interfaz del servicio de Gamificación.
 * 
 * Define los contratos para el bounded context de Gamificación:
 * - Gestión de challenges
 * - Sistema de XP y niveles
 * - Gestión de rachas (streaks)
 * - Logros y badges
 * 
 * Implementación inicial: Stub que retorna datos vacíos o mock.
 * 
 * Alineado con la arquitectura de microservicios descrita en la tesis.
 * 
 * @author EcoEstudiante Team
 * @version 0.1.0-SNAPSHOT
 * @since 2025-01-27
 */
public interface GamificationService {

    /**
     * Obtiene los challenges activos disponibles para el usuario.
     * 
     * @param userId ID del usuario (UUID normalizado)
     * @return Lista de challenges activos
     */
    List<GamificationDtos.Challenge> getActiveChallenges(String userId);

    /**
     * Obtiene el balance de XP del usuario.
     * 
     * @param userId ID del usuario (UUID normalizado)
     * @return Balance de XP con nivel actual y progreso
     */
    GamificationDtos.XPBalance getXPBalance(String userId);

    /**
     * Obtiene información sobre las rachas del usuario.
     * 
     * @param userId ID del usuario (UUID normalizado)
     * @return Información de rachas (actual, más larga, etc.)
     */
    GamificationDtos.StreakInfo getStreaks(String userId);

    /**
     * Obtiene los logros desbloqueados por el usuario.
     * 
     * @param userId ID del usuario (UUID normalizado)
     * @return Lista de logros obtenidos
     */
    List<GamificationDtos.Achievement> getAchievements(String userId);

    /**
     * Registra XP para el usuario (por ejemplo, al completar un cálculo).
     * 
     * @param userId ID del usuario (UUID normalizado)
     * @param xpAmount Cantidad de XP a otorgar
     * @param reason Razón por la que se otorga XP (ej: "calculation_completed")
     */
    void awardXP(String userId, Integer xpAmount, String reason);
}




