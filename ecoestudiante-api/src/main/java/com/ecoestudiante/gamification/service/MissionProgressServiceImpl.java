package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.event.CalculationCompletedEvent;
import com.ecoestudiante.gamification.event.MissionCompletedEvent;
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
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación del servicio de actualización inteligente de progreso de misiones.
 *
 * Responsabilidades:
 * - Correlacionar cálculos con misiones activas
 * - Actualizar progreso automáticamente según el tipo de misión
 * - Detectar y completar misiones que alcanzaron su objetivo
 * - Publicar eventos cuando se completan misiones
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-12-08
 */
@Service
public class MissionProgressServiceImpl implements MissionProgressService {

    private static final Logger logger = LoggerFactory.getLogger(MissionProgressServiceImpl.class);

    private final MissionProgressRepository progressRepository;
    private final MissionRepository missionRepository;
    private final GamificationService gamificationService;
    private final ApplicationEventPublisher eventPublisher;

    public MissionProgressServiceImpl(
            MissionProgressRepository progressRepository,
            MissionRepository missionRepository,
            GamificationService gamificationService,
            ApplicationEventPublisher eventPublisher
    ) {
        this.progressRepository = progressRepository;
        this.missionRepository = missionRepository;
        this.gamificationService = gamificationService;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public int processCalculationAndUpdateMissions(CalculationCompletedEvent event) {
        logger.info("📊 Procesando cálculo {} de categoría '{}' para usuario {}",
                event.getCalculationId(), event.getCategory(), event.getUserId());

        // Obtener misiones activas del usuario
        List<MissionProgress> activeMissions = progressRepository.findActiveByUserId(event.getUserId());

        if (activeMissions.isEmpty()) {
            logger.info("ℹ️ Usuario {} no tiene misiones activas", event.getUserId());
            return 0;
        }

        logger.info("📋 Encontradas {} misiones activas para usuario {}", activeMissions.size(), event.getUserId());

        int updatedCount = 0;

        // Obtener semana actual del cálculo
        String currentWeek = getCurrentWeekNumber(event.getCalculatedAt());
        int currentYear = event.getCalculatedAt().getYear();

        logger.info("📅 Semana del cálculo: {}, Año: {}", currentWeek, currentYear);

        for (MissionProgress progress : activeMissions) {
            Mission mission = missionRepository.findById(progress.getMissionId()).orElse(null);

            if (mission == null) {
                logger.warn("⚠️ Misión {} no encontrada para progreso {}", progress.getMissionId(), progress.getId());
                continue;
            }

            logger.info("🎯 Evaluando misión '{}' (ID: {}, Categoría: {}, Tipo: {}, Semana: {}-{})",
                    mission.getTitle(), mission.getId(), mission.getCategory(), mission.getType(),
                    mission.getWeekNumber(), mission.getYear());

            // Verificar si la misión corresponde a la semana actual
            if (!currentWeek.equals(mission.getWeekNumber()) || currentYear != mission.getYear()) {
                logger.info("⏭️ Saltando misión '{}' - no corresponde a la semana actual {}-{} (misión es para {}-{})",
                        mission.getTitle(), currentWeek, currentYear, mission.getWeekNumber(), mission.getYear());
                continue;
            }

            // Intentar actualizar el progreso según correlación
            boolean updated = updateProgressBasedOnCalculation(progress, mission, event);

            if (updated) {
                updatedCount++;

                logger.info("✅ Progreso actualizado para misión '{}': {}/{}",
                        mission.getTitle(), progress.getCurrentProgress(), progress.getTargetProgress());

                // Verificar si se completó la misión
                if (progress.isProgressComplete() &&
                    progress.getStatus() == MissionProgress.MissionStatus.ACTIVE) {

                    logger.info("🎉 Misión '{}' completada!", mission.getTitle());
                    completeMission(progress, mission);
                }
            } else {
                logger.info("❌ NO se actualizó progreso para misión '{}' - no cumple condiciones",
                        mission.getTitle());
            }
        }

        logger.info("📈 Actualizadas {} misiones para usuario {} tras cálculo de {}",
                updatedCount, event.getUserId(), event.getCategory());

        return updatedCount;
    }

    @Override
    @Transactional
    public int checkAndAutoCompleteMissions(UUID userId) {
        List<MissionProgress> activeMissions = progressRepository.findActiveByUserId(userId);
        int completedCount = 0;

        for (MissionProgress progress : activeMissions) {
            if (progress.isProgressComplete()) {
                Mission mission = missionRepository.findById(progress.getMissionId()).orElse(null);
                if (mission != null) {
                    completeMission(progress, mission);
                    completedCount++;
                }
            }
        }

        return completedCount;
    }

    /**
     * Actualiza el progreso de una misión basándose en un cálculo.
     * Implementa la lógica de correlación inteligente.
     */
    private boolean updateProgressBasedOnCalculation(
            MissionProgress progress,
            Mission mission,
            CalculationCompletedEvent event
    ) {
        // Mapear categoría de cálculo a categoría de misión
        Mission.MissionCategory missionCategory = mapCalculationToMissionCategory(event.getCategory());

        logger.info("🔍 Verificando correlación - Categoría cálculo: '{}' -> Categoría misión mapeada: {}, Categoría misión real: {}",
                event.getCategory(), missionCategory, mission.getCategory());

        if (missionCategory == null || mission.getCategory() != missionCategory) {
            logger.info("⛔ Categorías no coinciden - cálculo: {}, misión: {}", missionCategory, mission.getCategory());
            return false;
        }

        logger.info("✓ Categorías coinciden - procesando tipo de misión: {}", mission.getType());

        boolean updated = false;

        switch (mission.getType()) {
            case FREQUENCY:
                // Misiones de frecuencia: contar ocurrencias
                updated = updateFrequencyMission(progress, mission, event);
                break;

            case REDUCTION:
                // Misiones de reducción: comparar con baseline
                updated = updateReductionMission(progress, mission, event);
                break;

            case DISCOVERY:
                // Misiones de descubrimiento: verificar condiciones específicas
                updated = updateDiscoveryMission(progress, mission, event);
                break;

            case BONUS:
                // Misiones bonus: lógica especial
                updated = updateBonusMission(progress, mission, event);
                break;
        }

        if (updated) {
            progressRepository.save(progress);
            logger.info("💾 Guardado progreso de misión '{}' para usuario {}: {}/{}",
                    mission.getTitle(), event.getUserId(),
                    progress.getCurrentProgress(), progress.getTargetProgress());
        }

        return updated;
    }

    /**
     * Actualiza misiones de tipo FREQUENCY (contar ocurrencias).
     * Ejemplo: "Realiza 3 cálculos de transporte público"
     */
    private boolean updateFrequencyMission(
            MissionProgress progress,
            Mission mission,
            CalculationCompletedEvent event
    ) {
        logger.info("🔢 Procesando misión de FRECUENCIA: '{}'", mission.getTitle());

        // Verificar condiciones específicas si existen
        if (mission.getCategory() == Mission.MissionCategory.TRANSPORT) {
            Map<String, Object> input = event.getCalculationInput();
            String transportMode = (String) input.get("transportMode");

            logger.info("🚗 Modo de transporte del cálculo: '{}'", transportMode);
            logger.info("📝 Input completo: {}", input);

            // Verificar si la misión requiere un modo específico
            String missionTitle = mission.getTitle().toLowerCase();

            logger.info("📋 Título de misión (lowercase): '{}'", missionTitle);

            // Ejemplos de verificaciones:
            // "Usa transporte público 3 veces" -> verificar bus/metro
            if (missionTitle.contains("público") || missionTitle.contains("bus") || missionTitle.contains("metro")) {
                logger.info("🚌 Misión requiere transporte público (bus/metro)");
                if (!"bus".equals(transportMode) && !"metro".equals(transportMode)) {
                    logger.info("❌ Modo '{}' NO es transporte público - no cuenta", transportMode);
                    return false; // No cuenta para esta misión
                }
                logger.info("✅ Modo '{}' es transporte público - cuenta!", transportMode);
            }
            // "Usa bicicleta 3 veces"
            else if (missionTitle.contains("bicicleta") || missionTitle.contains("bicycle")) {
                logger.info("🚴 Misión requiere bicicleta");
                if (!"bicycle".equals(transportMode)) {
                    logger.info("❌ Modo '{}' NO es bicicleta - no cuenta", transportMode);
                    return false;
                }
                logger.info("✅ Modo '{}' es bicicleta - cuenta!", transportMode);
            }
            // "Camina 3 veces"
            else if (missionTitle.contains("camina") || missionTitle.contains("walking")) {
                logger.info("🚶 Misión requiere caminar");
                if (!"walking".equals(transportMode)) {
                    logger.info("❌ Modo '{}' NO es caminar - no cuenta", transportMode);
                    return false;
                }
                logger.info("✅ Modo '{}' es caminar - cuenta!", transportMode);
            }
        }

        // Incrementar contador
        BigDecimal newProgress = progress.getCurrentProgress().add(BigDecimal.ONE);
        logger.info("➕ Incrementando progreso de {} a {}", progress.getCurrentProgress(), newProgress);
        progress.setCurrentProgress(newProgress);

        return true;
    }

    /**
     * Actualiza misiones de tipo REDUCTION (reducir emisiones).
     * Ejemplo: "Reduce 20% tus emisiones de electricidad"
     */
    private boolean updateReductionMission(
            MissionProgress progress,
            Mission mission,
            CalculationCompletedEvent event
    ) {
        // Para misiones de reducción, necesitamos calcular la reducción acumulada
        // respecto al baseline

        if (progress.getBaselineValue() == null || progress.getBaselineValue().compareTo(BigDecimal.ZERO) <= 0) {
            logger.warn("Misión de reducción {} no tiene baseline configurado", mission.getId());
            return false;
        }

        // Calcular reducción actual: baseline - emisión_actual
        BigDecimal currentEmissions = event.getKgCO2e();
        BigDecimal reduction = progress.getBaselineValue().subtract(currentEmissions);

        if (reduction.compareTo(BigDecimal.ZERO) < 0) {
            // Aumentó las emisiones, no hay reducción
            reduction = BigDecimal.ZERO;
        }

        // Calcular porcentaje de reducción
        BigDecimal reductionPercentage = reduction
                .divide(progress.getBaselineValue(), 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal("100"));

        progress.setCurrentProgress(reductionPercentage);

        return true;
    }

    /**
     * Actualiza misiones de tipo DISCOVERY (explorar funcionalidades).
     * Ejemplo: "Realiza un cálculo de residuos"
     */
    private boolean updateDiscoveryMission(
            MissionProgress progress,
            Mission mission,
            CalculationCompletedEvent event
    ) {
        // Las misiones de descubrimiento se completan con una sola acción
        Map<String, Object> input = event.getCalculationInput();

        // Verificar condiciones específicas según el título de la misión
        String missionTitle = mission.getTitle().toLowerCase();

        if (mission.getCategory() == Mission.MissionCategory.WASTE) {
            // "Explora el calculador de residuos" -> cualquier cálculo de residuos cuenta
            progress.setCurrentProgress(progress.getTargetProgress()); // Completar inmediatamente
            return true;
        }

        if (mission.getCategory() == Mission.MissionCategory.ELECTRICITY) {
            // "Calcula tu huella de electricidad" -> cualquier cálculo de electricidad
            progress.setCurrentProgress(progress.getTargetProgress());
            return true;
        }

        if (mission.getCategory() == Mission.MissionCategory.TRANSPORT) {
            // Podría requerir un modo específico
            String transportMode = (String) input.get("transportMode");

            if (missionTitle.contains("eléctrico") || missionTitle.contains("electric")) {
                if ("electric".equals(input.get("fuelType"))) {
                    progress.setCurrentProgress(progress.getTargetProgress());
                    return true;
                }
            } else {
                // Cualquier transporte
                progress.setCurrentProgress(progress.getTargetProgress());
                return true;
            }
        }

        return false;
    }

    /**
     * Actualiza misiones de tipo BONUS (especiales).
     */
    private boolean updateBonusMission(
            MissionProgress progress,
            Mission mission,
            CalculationCompletedEvent event
    ) {
        // Lógica especial para misiones bonus
        // Por ejemplo: "Realiza 5 cálculos en un día"

        // Para simplificar, incrementamos el contador
        BigDecimal newProgress = progress.getCurrentProgress().add(BigDecimal.ONE);
        progress.setCurrentProgress(newProgress);

        return true;
    }

    /**
     * Completa una misión y publica evento.
     */
    private void completeMission(MissionProgress progress, Mission mission) {
        progress.setStatus(MissionProgress.MissionStatus.COMPLETED);
        progress.setCompletedAt(LocalDateTime.now());
        progressRepository.save(progress);

        // Otorgar XP por completar misión
        try {
            gamificationService.awardXP(
                    progress.getUserId().toString(),
                    mission.getXpReward(),
                    "MISSION_COMPLETE"
            );
            logger.info("Otorgados {} XP a usuario {} por completar misión '{}'",
                    mission.getXpReward(), progress.getUserId(), mission.getTitle());
        } catch (Exception e) {
            logger.error("Error otorgando XP por misión completada", e);
        }

        // Publicar evento de misión completada
        MissionCompletedEvent event = new MissionCompletedEvent(
                this,
                progress.getUserId(),
                mission.getId(),
                mission.getTitle(),
                mission.getCategory().name(),
                mission.getXpReward(),
                mission.getCo2ImpactKg(),
                mission.getWeekNumber(),
                mission.getYear(),
                progress.getCompletedAt()
        );

        eventPublisher.publishEvent(event);

        logger.info("Usuario {} completó misión '{}' - XP: {}, CO2 Impact: {} kg",
                progress.getUserId(), mission.getTitle(), mission.getXpReward(), mission.getCo2ImpactKg());
    }

    /**
     * Mapea categoría de cálculo a categoría de misión.
     */
    private Mission.MissionCategory mapCalculationToMissionCategory(String calculationCategory) {
        return switch (calculationCategory.toLowerCase()) {
            case "electricidad" -> Mission.MissionCategory.ELECTRICITY;
            case "transporte" -> Mission.MissionCategory.TRANSPORT;
            case "residuos" -> Mission.MissionCategory.WASTE;
            default -> null;
        };
    }

    /**
     * Obtiene el número de semana ISO del año.
     */
    private String getCurrentWeekNumber(LocalDateTime date) {
        int weekNum = date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        return String.format("%04d-W%02d", date.getYear(), weekNum);
    }
}
