package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.dto.MissionDtos;
import com.ecoestudiante.gamification.model.LeaderboardCache;
import com.ecoestudiante.gamification.repository.LeaderboardCacheRepository;
import com.ecoestudiante.gamification.repository.MissionProgressRepository;
import com.ecoestudiante.gamification.repository.XpTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementación del servicio de Leaderboard.
 *
 * Gestiona el cálculo y cache del ranking semanal basado en
 * reducción de huella de carbono.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Service
public class LeaderboardServiceImpl implements LeaderboardService {

    private static final Logger logger = LoggerFactory.getLogger(LeaderboardServiceImpl.class);

    private final LeaderboardCacheRepository leaderboardRepository;
    private final MissionProgressRepository progressRepository;
    private final XpTransactionRepository xpRepository;
    private final JdbcTemplate jdbcTemplate;

    public LeaderboardServiceImpl(
            LeaderboardCacheRepository leaderboardRepository,
            MissionProgressRepository progressRepository,
            XpTransactionRepository xpRepository,
            JdbcTemplate jdbcTemplate) {
        this.leaderboardRepository = leaderboardRepository;
        this.progressRepository = progressRepository;
        this.xpRepository = xpRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public MissionDtos.LeaderboardResponse getCurrentWeekLeaderboard(int topN) {
        String[] currentWeek = getCurrentWeekAndYear();
        return getWeekLeaderboard(currentWeek[0], Integer.parseInt(currentWeek[1]), topN);
    }

    @Override
    public MissionDtos.LeaderboardResponse getWeekLeaderboard(String weekNumber, Integer year, int topN) {
        logger.debug("Obteniendo leaderboard para semana {}-{}, top {}", weekNumber, year, topN);

        // Obtener top N del cache
        List<LeaderboardCache> topEntries = leaderboardRepository.findTopNByWeek(weekNumber, year, topN);

        // Convertir a DTOs
        List<MissionDtos.LeaderboardEntryResponse> topUsers = topEntries.stream()
                .map(entry -> toLeaderboardEntryResponse(entry, false))
                .collect(Collectors.toList());

        // Contar total de usuarios en el ranking
        int totalUsers = leaderboardRepository.countByWeek(weekNumber, year);

        return new MissionDtos.LeaderboardResponse(
                weekNumber,
                year,
                topUsers,
                null, // currentUser se establece en el controller si es necesario
                totalUsers,
                topEntries.isEmpty() ? null : topEntries.get(0).getCalculatedAt()
        );
    }

    @Override
    public MissionDtos.LeaderboardEntryResponse getUserPosition(Long userId) {
        String[] currentWeek = getCurrentWeekAndYear();
        return getUserPositionInWeek(userId, currentWeek[0], Integer.parseInt(currentWeek[1]));
    }

    @Override
    public MissionDtos.LeaderboardEntryResponse getUserPositionInWeek(Long userId, String weekNumber, Integer year) {
        logger.debug("Obteniendo posición de usuario {} en semana {}-{}", userId, weekNumber, year);

        return leaderboardRepository.findByUserAndWeek(userId, weekNumber, year)
                .map(entry -> toLeaderboardEntryResponse(entry, true))
                .orElse(null);
    }

    @Override
    @Transactional
    public int recalculateCurrentWeekLeaderboard() {
        String[] currentWeek = getCurrentWeekAndYear();
        return recalculateWeekLeaderboard(currentWeek[0], Integer.parseInt(currentWeek[1]));
    }

    @Override
    @Transactional
    public int recalculateWeekLeaderboard(String weekNumber, Integer year) {
        logger.info("Recalculando leaderboard para semana {}-{}", weekNumber, year);

        // Obtener todos los usuarios activos (que tienen al menos 1 cálculo o misión)
        String sql = """
                SELECT DISTINCT user_id FROM (
                    SELECT user_id FROM mission_progress WHERE started_at >= get_week_start(?, ?)
                    UNION
                    SELECT user_id FROM xp_transactions WHERE created_at >= get_week_start(?, ?)
                ) AS active_users
                """;

        List<Long> activeUserIds = jdbcTemplate.queryForList(
                sql, Long.class,
                weekNumber, year,
                weekNumber, year
        );

        logger.debug("Encontrados {} usuarios activos para semana {}-{}",
                activeUserIds.size(), weekNumber, year);

        // Calcular y guardar entrada para cada usuario
        for (Long userId : activeUserIds) {
            try {
                updateUserLeaderboardEntry(userId, weekNumber, year);
            } catch (Exception e) {
                logger.error("Error al actualizar leaderboard para usuario {}: {}", userId, e.getMessage());
            }
        }

        // Recalcular rankings (posiciones)
        leaderboardRepository.recalculateRankings(weekNumber, year);

        logger.info("Leaderboard recalculado para {} usuarios", activeUserIds.size());
        return activeUserIds.size();
    }

    @Override
    @Transactional
    public void updateUserLeaderboardEntry(Long userId, String weekNumber, Integer year) {
        logger.debug("Actualizando entrada de leaderboard para usuario {} en semana {}-{}",
                userId, weekNumber, year);

        // Calcular métricas
        BigDecimal co2Avoided = calculateCo2AvoidedForWeek(userId, weekNumber, year);
        int missionsCompleted = countMissionsCompletedInWeek(userId, weekNumber, year);
        int xpGained = sumXpGainedInWeek(userId, weekNumber, year);

        // Crear o actualizar entrada en cache
        LeaderboardCache entry = new LeaderboardCache();
        entry.setUserId(userId);
        entry.setWeekNumber(weekNumber);
        entry.setYear(year);
        entry.setCo2AvoidedKg(co2Avoided);
        entry.setMissionsCompleted(missionsCompleted);
        entry.setTotalXpWeek(xpGained);

        leaderboardRepository.save(entry);
    }

    @Override
    public BigDecimal calculateCo2AvoidedForWeek(Long userId, String weekNumber, Integer year) {
        // TODO: Integrar con StatsService para obtener datos reales de emisiones
        // Por ahora retorna un valor simulado basado en misiones completadas

        int missionsCompleted = countMissionsCompletedInWeek(userId, weekNumber, year);

        // Estimación: cada misión evita ~5kg CO₂ en promedio
        return BigDecimal.valueOf(missionsCompleted * 5.0);
    }

    // =========================================================================
    // Métodos auxiliares
    // =========================================================================

    private String[] getCurrentWeekAndYear() {
        LocalDate now = LocalDate.now();
        int weekNum = now.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        int year = now.get(IsoFields.WEEK_BASED_YEAR);
        String weekNumber = String.format("%d-W%02d", year, weekNum);
        return new String[]{weekNumber, String.valueOf(year)};
    }

    private int countMissionsCompletedInWeek(Long userId, String weekNumber, Integer year) {
        // Obtener rango de fechas de la semana
        LocalDateTime[] weekRange = getWeekDateRange(weekNumber, year);

        return progressRepository.countCompletedByUserBetweenDates(
                userId, weekRange[0], weekRange[1]
        );
    }

    private int sumXpGainedInWeek(Long userId, String weekNumber, Integer year) {
        LocalDateTime[] weekRange = getWeekDateRange(weekNumber, year);

        return xpRepository.sumXpByUserBetweenDates(
                userId, weekRange[0], weekRange[1]
        );
    }

    private LocalDateTime[] getWeekDateRange(String weekNumber, Integer year) {
        // Parsear weekNumber (formato: "2025-W01")
        String[] parts = weekNumber.split("-W");
        int weekNum = Integer.parseInt(parts[1]);

        // Calcular primer día de la semana
        LocalDate firstDayOfWeek = LocalDate.of(year, 1, 1)
                .with(IsoFields.WEEK_OF_WEEK_BASED_YEAR, weekNum)
                .with(java.time.DayOfWeek.MONDAY); // Lunes

        LocalDate lastDayOfWeek = firstDayOfWeek.plusDays(6); // Domingo

        return new LocalDateTime[]{
                firstDayOfWeek.atStartOfDay(),
                lastDayOfWeek.atTime(23, 59, 59)
        };
    }

    private MissionDtos.LeaderboardEntryResponse toLeaderboardEntryResponse(
            LeaderboardCache entry,
            boolean isCurrentUser) {

        if (entry == null) return null;

        // Anonimizar username (obtener de BD si es necesario)
        String username = isCurrentUser
                ? getUsername(entry.getUserId())
                : anonymizeUsername(getUsername(entry.getUserId()));

        return new MissionDtos.LeaderboardEntryResponse(
                entry.getRankPosition(),
                entry.getUserId(),
                username,
                entry.getCo2AvoidedKg(),
                entry.getMissionsCompleted(),
                entry.getTotalXpWeek(),
                isCurrentUser,
                entry.getMedalEmoji()
        );
    }

    private String getUsername(Long userId) {
        // Consultar username desde tabla users
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT username FROM users WHERE id = ?",
                    String.class,
                    userId
            );
        } catch (Exception e) {
            logger.warn("No se pudo obtener username para usuario {}", userId);
            return "Usuario-" + userId;
        }
    }

    private String anonymizeUsername(String username) {
        if (username == null || username.length() <= 3) {
            return "eco_***";
        }

        // Mostrar primeros 3 caracteres y reemplazar el resto con ***
        return username.substring(0, 3) + "_***";
    }
}
