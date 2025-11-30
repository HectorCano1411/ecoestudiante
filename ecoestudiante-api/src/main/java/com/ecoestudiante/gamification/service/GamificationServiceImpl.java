package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.dto.GamificationDtos;
import com.ecoestudiante.gamification.model.GamificationProfile;
import com.ecoestudiante.gamification.model.XpTransaction;
import com.ecoestudiante.gamification.repository.GamificationProfileRepository;
import com.ecoestudiante.gamification.repository.XpTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Implementación del servicio de Gamificación.
 *
 * Gestiona perfiles de gamificación, XP, niveles y streaks.
 * Integrado con el nuevo módulo de Misiones Verdes.
 *
 * @author EcoEstudiante Team
 * @version 2.0.0
 * @since 2025-11-30
 */
@Service
public class GamificationServiceImpl implements GamificationService {

    private static final Logger logger = LoggerFactory.getLogger(GamificationServiceImpl.class);

    private final GamificationProfileRepository profileRepository;
    private final XpTransactionRepository xpTransactionRepository;

    public GamificationServiceImpl(
            GamificationProfileRepository profileRepository,
            XpTransactionRepository xpTransactionRepository) {
        this.profileRepository = profileRepository;
        this.xpTransactionRepository = xpTransactionRepository;
        logger.info("GamificationService inicializado con repositorios reales");
    }

    @Override
    public List<GamificationDtos.Challenge> getActiveChallenges(String userId) {
        logger.debug("getActiveChallenges llamado para usuario: {}", userId);

        // Nota: Los "Challenges" del DTO legacy se mapean a "Missions" en el nuevo diseño
        // Este método se mantiene por compatibilidad pero se recomienda usar MissionService

        // Por ahora retorna vacío y se recomienda usar MissionService.getActiveMissionsForUser()
        logger.warn("getActiveChallenges es legacy - usar MissionService.getActiveMissionsForUser()");
        return Collections.emptyList();
    }

    @Override
    public GamificationDtos.XPBalance getXPBalance(String userId) {
        logger.debug("getXPBalance llamado para usuario: {}", userId);

        try {
            UUID userIdUuid = UUID.fromString(userId);

            GamificationProfile profile = profileRepository.findByUserId(userIdUuid)
                    .orElseGet(() -> createDefaultProfile(userIdUuid));

            // Calcular XP del mes actual
            LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime monthEnd = LocalDateTime.now().plusMonths(1).withDayOfMonth(1).withHour(0).minusSeconds(1);
            Integer xpThisMonth = xpTransactionRepository.sumXpByUserBetweenDates(userIdUuid, monthStart, monthEnd);
            
            // Asegurar que xpThisMonth nunca sea null
            if (xpThisMonth == null) {
                xpThisMonth = 0;
            }
            
            // Asegurar que totalXp nunca sea null
            Long totalXp = profile.getTotalXp();
            if (totalXp == null) {
                totalXp = 0L;
            }
            
            // Asegurar que currentLevel nunca sea null
            Integer currentLevel = profile.getCurrentLevel();
            if (currentLevel == null) {
                currentLevel = 1;
            }

            // Calcular XP necesario para siguiente nivel (después de validar valores)
            long nextLevelXp = (long) Math.pow(currentLevel + 1, 2) * 100;
            int xpToNextLevel = (int) (nextLevelXp - totalXp);
            
            // Asegurar que updatedAt nunca sea null
            LocalDateTime updatedAt = profile.getUpdatedAt();
            if (updatedAt == null) {
                updatedAt = LocalDateTime.now();
            }

            return new GamificationDtos.XPBalance(
                    totalXp.intValue(),
                    currentLevel,
                    xpToNextLevel > 0 ? xpToNextLevel : 0,
                    xpThisMonth,
                    updatedAt
            );
        } catch (Exception e) {
            logger.error("Error al obtener balance de XP para usuario {}: {}", userId, e.getMessage());
            return new GamificationDtos.XPBalance(0, 1, 100, 0, LocalDateTime.now());
        }
    }

    @Override
    public GamificationDtos.StreakInfo getStreaks(String userId) {
        logger.debug("getStreaks llamado para usuario: {}", userId);

        try {
            UUID userIdUuid = UUID.fromString(userId);

            GamificationProfile profile = profileRepository.findByUserId(userIdUuid)
                    .orElseGet(() -> createDefaultProfile(userIdUuid));
            
            // Asegurar que los valores nunca sean null
            Integer currentStreak = profile.getCurrentStreak();
            if (currentStreak == null) {
                currentStreak = 0;
            }
            
            Integer bestStreak = profile.getBestStreak();
            if (bestStreak == null) {
                bestStreak = 0;
            }

            return new GamificationDtos.StreakInfo(
                    currentStreak,
                    bestStreak,
                    profile.getLastActivityDate() != null
                            ? profile.getLastActivityDate().atStartOfDay()
                            : null,
                    profile.getLastActivityDate() != null
                            ? profile.getLastActivityDate().atStartOfDay()
                            : null,
                    "CALCULATION" // Tipo de streak (legacy)
            );
        } catch (Exception e) {
            logger.error("Error al obtener streaks para usuario {}: {}", userId, e.getMessage());
            return new GamificationDtos.StreakInfo(0, 0, null, null, "CALCULATION");
        }
    }

    @Override
    public List<GamificationDtos.Achievement> getAchievements(String userId) {
        logger.debug("getAchievements llamado para usuario: {}", userId);

        // TODO: Implementar sistema de logros/achievements
        // Por ahora retorna lista vacía
        logger.info("Sistema de achievements aún no implementado");
        return Collections.emptyList();
    }

    @Override
    @Transactional
    public void awardXP(String userId, Integer xpAmount, String reason) {
        logger.info("Otorgando {} XP a usuario {} por razón: {}", xpAmount, userId, reason);

        try {
            UUID userIdUuid = UUID.fromString(userId);

            // Asegurar que existe el perfil
            GamificationProfile profile = profileRepository.findByUserId(userIdUuid)
                    .orElseGet(() -> createAndSaveProfile(userIdUuid));

            // Actualizar XP total
            profileRepository.addXp(userIdUuid, xpAmount);

            // Registrar transacción
            XpTransaction transaction = new XpTransaction();
            transaction.setUserId(userIdUuid);
            transaction.setAmount(xpAmount);
            transaction.setSource(mapReasonToSource(reason));
            transaction.setDescription(reason);
            xpTransactionRepository.save(transaction);

            // Actualizar última actividad
            profileRepository.updateLastActivity(userIdUuid, LocalDate.now());

            // Verificar y actualizar streak
            updateStreakIfNeeded(userIdUuid, profile);

            logger.info("XP otorgado exitosamente a usuario {}", userId);
        } catch (Exception e) {
            logger.error("Error al otorgar XP a usuario {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Error al otorgar XP", e);
        }
    }

    // =========================================================================
    // Métodos auxiliares
    // =========================================================================

    private GamificationProfile createDefaultProfile(UUID userId) {
        logger.debug("Creando perfil por defecto para usuario {}", userId);

        GamificationProfile profile = new GamificationProfile();
        profile.setUserId(userId);
        profile.setTotalXp(0L);
        profile.setCurrentLevel(1);
        profile.setCurrentStreak(0);
        profile.setBestStreak(0);
        profile.setLastActivityDate(null);
        
        // Establecer updatedAt para evitar null
        profile.setUpdatedAt(LocalDateTime.now());

        return profile;
    }

    private GamificationProfile createAndSaveProfile(UUID userId) {
        logger.info("Creando y guardando perfil de gamificación para usuario {}", userId);

        GamificationProfile profile = createDefaultProfile(userId);
        return profileRepository.save(profile);
    }

    private XpTransaction.XpSource mapReasonToSource(String reason) {
        if (reason == null) return XpTransaction.XpSource.MANUAL;

        return switch (reason.toUpperCase()) {
            case "MISSION_COMPLETE", "MISSION_COMPLETED" -> XpTransaction.XpSource.MISSION_COMPLETE;
            case "CALCULATION", "CALC" -> XpTransaction.XpSource.CALCULATION;
            case "STREAK", "STREAK_BONUS" -> XpTransaction.XpSource.STREAK_BONUS;
            case "ACHIEVEMENT" -> XpTransaction.XpSource.ACHIEVEMENT;
            default -> XpTransaction.XpSource.MANUAL;
        };
    }

    private void updateStreakIfNeeded(UUID userId, GamificationProfile profile) {
        LocalDate today = LocalDate.now();
        LocalDate lastActivity = profile.getLastActivityDate();

        if (lastActivity == null) {
            // Primera actividad
            profileRepository.updateStreak(userId, 1);
            logger.debug("Iniciando streak para usuario {}", userId);
        } else if (lastActivity.isEqual(today)) {
            // Ya tuvo actividad hoy, no hacer nada
            logger.debug("Usuario {} ya tuvo actividad hoy", userId);
        } else if (lastActivity.plusDays(1).isEqual(today)) {
            // Actividad día consecutivo - incrementar streak
            int newStreak = profile.getCurrentStreak() + 1;
            profileRepository.updateStreak(userId, newStreak);
            logger.info("Streak incrementado a {} para usuario {}", newStreak, userId);
        } else {
            // Se rompió el streak - resetear a 1
            profileRepository.updateStreak(userId, 1);
            logger.info("Streak reseteado para usuario {} (último: {})", userId, lastActivity);
        }
    }
}
