package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.dto.MissionDtos;
import com.ecoestudiante.gamification.model.Mission;
import com.ecoestudiante.gamification.model.MissionProgress;
import java.util.List;

/**
 * Interfaz del servicio de Misiones Verdes.
 *
 * Define los contratos para la gestión de misiones y su progreso:
 * - Obtener misiones disponibles
 * - Crear y actualizar progreso de misiones
 * - Completar misiones
 * - Generar misiones semanales automáticamente
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
public interface MissionService {

    /**
     * Obtiene todas las misiones disponibles para una semana específica
     *
     * @param weekNumber Número de semana ISO (ejemplo: "2025-W01")
     * @param year Año
     * @return Lista de misiones de la semana
     */
    List<MissionDtos.MissionResponse> getMissionsByWeek(String weekNumber, Integer year);

    /**
     * Obtiene las misiones activas de un usuario para la semana actual
     *
     * @param userId ID del usuario
     * @return Lista del progreso de misiones activas
     */
    List<MissionDtos.MissionProgressResponse> getActiveMissionsForUser(Long userId);

    /**
     * Obtiene todas las misiones de un usuario (activas, completadas, expiradas)
     *
     * @param userId ID del usuario
     * @return Progreso de todas las misiones del usuario
     */
    MissionDtos.UserMissionsProgressResponse getAllUserMissions(Long userId);

    /**
     * Obtiene el progreso de un usuario en una misión específica
     *
     * @param userId ID del usuario
     * @param missionId ID de la misión
     * @return Progreso de la misión
     */
    MissionDtos.MissionProgressResponse getMissionProgress(Long userId, Long missionId);

    /**
     * Asigna una misión a un usuario (crea el progreso inicial)
     *
     * @param userId ID del usuario
     * @param request Datos de la misión a asignar
     * @return Progreso de misión creado
     */
    MissionDtos.MissionProgressResponse assignMissionToUser(Long userId, MissionDtos.CreateMissionProgressRequest request);

    /**
     * Actualiza el progreso de una misión
     *
     * @param userId ID del usuario
     * @param missionId ID de la misión
     * @param request Nuevo progreso
     * @return Progreso actualizado
     */
    MissionDtos.MissionProgressResponse updateMissionProgress(Long userId, Long missionId, MissionDtos.UpdateProgressRequest request);

    /**
     * Marca una misión como completada manualmente
     * (normalmente se completa automáticamente al alcanzar el objetivo)
     *
     * @param userId ID del usuario
     * @param missionId ID de la misión
     * @return Progreso de misión completada
     */
    MissionDtos.MissionProgressResponse completeMission(Long userId, Long missionId);

    /**
     * Verifica automáticamente si las misiones activas del usuario deben completarse
     * (llamado después de cada cálculo de emisiones)
     *
     * @param userId ID del usuario
     * @return Lista de misiones que fueron completadas automáticamente
     */
    List<MissionDtos.MissionProgressResponse> checkAndCompleteMissions(Long userId);

    /**
     * Genera misiones para una semana específica desde los templates
     * (proceso automático ejecutado cada lunes)
     *
     * @param weekNumber Número de semana ISO
     * @param year Año
     * @return Número de misiones generadas
     */
    int generateWeeklyMissions(String weekNumber, Integer year);

    /**
     * Marca como expiradas las misiones que no se completaron en su semana
     * (proceso automático ejecutado al finalizar cada semana)
     *
     * @param weekNumber Número de semana ISO
     * @param year Año
     * @return Número de misiones marcadas como expiradas
     */
    int expireWeeklyMissions(String weekNumber, Integer year);

    /**
     * Obtiene todos los templates de misiones disponibles
     *
     * @return Lista de misiones template
     */
    List<Mission> getAllMissionTemplates();

    /**
     * Obtiene misiones template por categoría
     *
     * @param category Categoría de misión
     * @return Lista de misiones template de la categoría
     */
    List<Mission> getMissionTemplatesByCategory(Mission.MissionCategory category);

    /**
     * Calcula el baseline (valor de referencia) para misiones de reducción
     *
     * @param userId ID del usuario
     * @param category Categoría de emisión (ELECTRICITY, TRANSPORT, WASTE)
     * @return Valor promedio de las últimas 4 semanas
     */
    java.math.BigDecimal calculateBaseline(Long userId, Mission.MissionCategory category);
}
