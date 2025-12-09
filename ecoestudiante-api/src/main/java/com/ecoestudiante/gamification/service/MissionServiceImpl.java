package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.dto.MissionDtos;
import com.ecoestudiante.gamification.event.MissionAssignedEvent;
import com.ecoestudiante.gamification.model.Mission;
import com.ecoestudiante.gamification.model.MissionProgress;
import com.ecoestudiante.gamification.repository.MissionProgressRepository;
import com.ecoestudiante.gamification.repository.MissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implementación del servicio de Misiones Verdes.
 *
 * Gestiona todo el ciclo de vida de las misiones:
 * - Generación semanal automática
 * - Asignación a usuarios
 * - Seguimiento de progreso
 * - Completitud automática
 * - Expiración de misiones
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Service
public class MissionServiceImpl implements MissionService {

    private static final Logger logger = LoggerFactory.getLogger(MissionServiceImpl.class);

    private final MissionRepository missionRepository;
    private final MissionProgressRepository progressRepository;
    private final ApplicationEventPublisher eventPublisher;

    public MissionServiceImpl(
            MissionRepository missionRepository,
            MissionProgressRepository progressRepository,
            ApplicationEventPublisher eventPublisher) {
        this.missionRepository = missionRepository;
        this.progressRepository = progressRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public List<MissionDtos.MissionResponse> getMissionsByWeek(String weekNumber, Integer year) {
        logger.debug("Obteniendo misiones para semana: {}-{}", weekNumber, year);

        List<Mission> missions = missionRepository.findByWeek(weekNumber, year);
        return missions.stream()
                .map(this::toMissionResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<MissionDtos.MissionProgressResponse> getActiveMissionsForUser(UUID userId) {
        logger.debug("Obteniendo misiones activas para usuario: {}", userId);

        List<MissionProgress> activeProgress = progressRepository.findActiveByUserId(userId);

        return activeProgress.stream()
                .map(progress -> {
                    Mission mission = missionRepository.findById(progress.getMissionId())
                            .orElse(null);
                    return toMissionProgressResponse(progress, mission);
                })
                .collect(Collectors.toList());
    }

    @Override
    public MissionDtos.UserMissionsProgressResponse getAllUserMissions(UUID userId) {
        logger.debug("Obteniendo todas las misiones para usuario: {}", userId);

        List<MissionProgress> allProgress = progressRepository.findAllByUserId(userId);

        List<MissionDtos.MissionProgressResponse> active = allProgress.stream()
                .filter(p -> p.getStatus() == MissionProgress.MissionStatus.ACTIVE)
                .map(p -> toMissionProgressResponse(p, getMission(p.getMissionId())))
                .collect(Collectors.toList());

        List<MissionDtos.MissionProgressResponse> completed = allProgress.stream()
                .filter(p -> p.getStatus() == MissionProgress.MissionStatus.COMPLETED)
                .map(p -> toMissionProgressResponse(p, getMission(p.getMissionId())))
                .collect(Collectors.toList());

        List<MissionDtos.MissionProgressResponse> expired = allProgress.stream()
                .filter(p -> p.getStatus() == MissionProgress.MissionStatus.EXPIRED)
                .map(p -> toMissionProgressResponse(p, getMission(p.getMissionId())))
                .collect(Collectors.toList());

        return new MissionDtos.UserMissionsProgressResponse(
                active,
                completed,
                expired,
                active.size(),
                completed.size()
        );
    }

    @Override
    public MissionDtos.MissionProgressResponse getMissionProgress(UUID userId, Long missionId) {
        logger.debug("Obteniendo progreso de misión {} para usuario {}", missionId, userId);

        MissionProgress progress = progressRepository.findByUserAndMission(userId, missionId)
                .orElseThrow(() -> new RuntimeException("Progreso de misión no encontrado"));

        Mission mission = getMission(missionId);

        return toMissionProgressResponse(progress, mission);
    }

    @Override
    @Transactional
    public MissionDtos.MissionProgressResponse assignMissionToUser(
            UUID userId,
            MissionDtos.CreateMissionProgressRequest request) {

        logger.info("Asignando misión {} a usuario {}", request.missionId(), userId);

        // Verificar si ya existe el progreso
        if (progressRepository.existsByUserAndMission(userId, request.missionId())) {
            throw new RuntimeException("El usuario ya tiene asignada esta misión");
        }

        Mission mission = getMission(request.missionId());

        // Crear nuevo progreso
        MissionProgress progress = new MissionProgress();
        progress.setUserId(userId);
        progress.setMissionId(request.missionId());
        progress.setCurrentProgress(BigDecimal.ZERO);
        progress.setTargetProgress(mission.getTargetValue());
        progress.setStatus(MissionProgress.MissionStatus.ACTIVE);
        progress.setBaselineValue(request.baselineValue());

        progress = progressRepository.save(progress);

        // Publicar evento de misión asignada para actualizar leaderboard inmediatamente
        try {
            MissionAssignedEvent event = new MissionAssignedEvent(
                    this,
                    userId,
                    mission.getId(),
                    mission.getWeekNumber(),
                    mission.getYear(),
                    LocalDateTime.now()
            );
            eventPublisher.publishEvent(event);
            logger.debug("Evento MissionAssigned publicado para usuario {} y misión {}", userId, mission.getId());
        } catch (Exception e) {
            logger.warn("Error publicando evento de misión asignada - userId: {}, missionId: {}", userId, mission.getId(), e);
            // No fallar la asignación si falla la publicación del evento
        }

        return toMissionProgressResponse(progress, mission);
    }

    @Override
    @Transactional
    public MissionDtos.MissionProgressResponse updateMissionProgress(
            UUID userId,
            Long missionId,
            MissionDtos.UpdateProgressRequest request) {

        logger.info("Actualizando progreso de misión {} para usuario {}: {}",
                missionId, userId, request.progress());

        MissionProgress progress = progressRepository.findByUserAndMission(userId, missionId)
                .orElseThrow(() -> new RuntimeException("Progreso de misión no encontrado"));

        progress.setCurrentProgress(request.progress());

        // Verificar si se completó automáticamente
        if (progress.isProgressComplete() && progress.getStatus() == MissionProgress.MissionStatus.ACTIVE) {
            progress.setStatus(MissionProgress.MissionStatus.COMPLETED);
            progress.setCompletedAt(LocalDateTime.now());
            logger.info("Misión {} completada automáticamente para usuario {}", missionId, userId);
        }

        progress = progressRepository.save(progress);

        Mission mission = getMission(missionId);
        return toMissionProgressResponse(progress, mission);
    }

    @Override
    @Transactional
    public MissionDtos.MissionProgressResponse completeMission(UUID userId, Long missionId) {
        logger.info("Completando misión {} para usuario {}", missionId, userId);

        MissionProgress progress = progressRepository.findByUserAndMission(userId, missionId)
                .orElseThrow(() -> new RuntimeException("Progreso de misión no encontrado"));

        if (progress.getStatus() != MissionProgress.MissionStatus.ACTIVE) {
            throw new RuntimeException("La misión no está activa");
        }

        progress.setStatus(MissionProgress.MissionStatus.COMPLETED);
        progress.setCompletedAt(LocalDateTime.now());
        progress.setCurrentProgress(progress.getTargetProgress()); // Marcar como 100% completada

        progress = progressRepository.save(progress);

        Mission mission = getMission(missionId);
        return toMissionProgressResponse(progress, mission);
    }

    @Override
    @Transactional
    public List<MissionDtos.MissionProgressResponse> checkAndCompleteMissions(UUID userId) {
        logger.debug("Verificando misiones activas para usuario {}", userId);

        List<MissionProgress> activeProgress = progressRepository.findActiveByUserId(userId);
        List<MissionProgress> completedMissions = activeProgress.stream()
                .filter(MissionProgress::isProgressComplete)
                .peek(progress -> {
                    progress.setStatus(MissionProgress.MissionStatus.COMPLETED);
                    progress.setCompletedAt(LocalDateTime.now());
                    progressRepository.save(progress);
                    logger.info("Misión {} completada automáticamente para usuario {}",
                            progress.getMissionId(), userId);
                })
                .collect(Collectors.toList());

        return completedMissions.stream()
                .map(p -> toMissionProgressResponse(p, getMission(p.getMissionId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public int generateWeeklyMissions(String weekNumber, Integer year) {
        logger.info("Generando misiones para semana {}-{}", weekNumber, year);

        // Verificar si ya existen misiones para esta semana
        int existingCount = missionRepository.countByWeek(weekNumber, year);
        if (existingCount > 0) {
            logger.warn("Ya existen {} misiones para la semana {}-{}", existingCount, weekNumber, year);
            return 0;
        }

        // Obtener templates
        List<Mission> templates = missionRepository.findAllTemplates();

        // Crear instancias de misiones para esta semana
        // Por simplicidad, creamos una muestra de cada categoría
        int createdCount = 0;

        for (Mission template : templates) {
            // Crear solo 1-2 misiones por categoría
            boolean shouldCreate = switch (template.getCategory()) {
                case TRANSPORT -> template.getDifficulty() == Mission.MissionDifficulty.EASY ||
                        template.getDifficulty() == Mission.MissionDifficulty.MEDIUM;
                case ELECTRICITY -> template.getDifficulty() == Mission.MissionDifficulty.EASY;
                case WASTE -> template.getDifficulty() == Mission.MissionDifficulty.EASY;
                case BONUS -> template.getDifficulty() == Mission.MissionDifficulty.MEDIUM;
                default -> false;
            };

            if (shouldCreate) {
                Mission instance = createMissionInstance(template, weekNumber, year);
                missionRepository.save(instance);
                createdCount++;
            }
        }

        logger.info("Generadas {} misiones para semana {}-{}", createdCount, weekNumber, year);
        return createdCount;
    }

    @Override
    @Transactional
    public int expireWeeklyMissions(String weekNumber, Integer year) {
        logger.info("Marcando misiones expiradas para semana {}-{}", weekNumber, year);

        int expiredCount = progressRepository.markExpiredMissions(weekNumber, year);

        logger.info("{} misiones marcadas como expiradas para semana {}-{}", expiredCount, weekNumber, year);
        return expiredCount;
    }

    @Override
    public List<Mission> getAllMissionTemplates() {
        return missionRepository.findAllTemplates();
    }

    @Override
    public List<Mission> getMissionTemplatesByCategory(Mission.MissionCategory category) {
        return missionRepository.findTemplatesByCategory(category);
    }

    @Override
    public BigDecimal calculateBaseline(UUID userId, Mission.MissionCategory category) {
        // TODO: Integrar con el servicio de estadísticas para calcular el promedio real
        // Por ahora retorna un valor por defecto
        logger.debug("Calculando baseline para usuario {} y categoría {}", userId, category);
        return BigDecimal.valueOf(100.0);
    }

    @Override
    public List<MissionDtos.MissionResponse> getAvailableMissionsForUser(UUID userId, String weekNumber, Integer year) {
        logger.debug("Obteniendo misiones disponibles para usuario {} en semana {}-{}", userId, weekNumber, year);

        // Obtener todas las misiones de la semana
        List<Mission> allMissions = missionRepository.findByWeek(weekNumber, year);

        // Obtener las misiones que el usuario ya aceptó (tiene progreso)
        List<Long> acceptedMissionIds = progressRepository.findAllByUserId(userId).stream()
                .map(MissionProgress::getMissionId)
                .collect(Collectors.toList());

        // Filtrar las misiones que NO están en la lista de aceptadas
        List<Mission> availableMissions = allMissions.stream()
                .filter(mission -> !acceptedMissionIds.contains(mission.getId()))
                .collect(Collectors.toList());

        logger.debug("Encontradas {} misiones disponibles de {} totales para usuario {}",
                availableMissions.size(), allMissions.size(), userId);

        return availableMissions.stream()
                .map(this::toMissionResponse)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // Métodos auxiliares
    // =========================================================================

    private Mission getMission(Long missionId) {
        return missionRepository.findById(missionId)
                .orElseThrow(() -> new RuntimeException("Misión no encontrada: " + missionId));
    }

    private Mission createMissionInstance(Mission template, String weekNumber, Integer year) {
        Mission instance = new Mission();
        instance.setTitle(template.getTitle());
        instance.setDescription(template.getDescription());
        instance.setCategory(template.getCategory());
        instance.setType(template.getType());
        instance.setDifficulty(template.getDifficulty());
        instance.setTargetValue(template.getTargetValue());
        instance.setTargetUnit(template.getTargetUnit());
        instance.setXpReward(template.getXpReward());
        instance.setCo2ImpactKg(template.getCo2ImpactKg());
        instance.setWeekNumber(weekNumber);
        instance.setYear(year);
        instance.setIsTemplate(false);
        return instance;
    }

    private MissionDtos.MissionResponse toMissionResponse(Mission mission) {
        if (mission == null) return null;

        return new MissionDtos.MissionResponse(
                mission.getId(),
                mission.getTitle(),
                mission.getDescription(),
                mission.getCategory().name(),
                mission.getType().name(),
                mission.getDifficulty().name(),
                mission.getTargetValue(),
                mission.getTargetUnit(),
                mission.getXpReward(),
                mission.getCo2ImpactKg(),
                mission.getWeekNumber(),
                mission.getYear(),
                mission.getDifficultyLabel()
        );
    }

    private MissionDtos.MissionProgressResponse toMissionProgressResponse(
            MissionProgress progress,
            Mission mission) {

        if (progress == null) return null;

        return new MissionDtos.MissionProgressResponse(
                progress.getId(),
                progress.getMissionId(),
                toMissionResponse(mission),
                progress.getCurrentProgress(),
                progress.getTargetProgress(),
                progress.getStatus().name(),
                progress.getCompletionPercentage(),
                progress.getStartedAt(),
                progress.getCompletedAt(),
                progress.getBaselineValue(),
                progress.getStatusLabel()
        );
    }
}
