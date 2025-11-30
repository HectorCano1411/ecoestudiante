package com.ecoestudiante.gamification.repository;

import com.ecoestudiante.gamification.model.LeaderboardCache;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio para el acceso a datos del Cache del Leaderboard.
 *
 * Utiliza JdbcTemplate para operaciones CRUD sobre la tabla leaderboard_cache.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Repository
public class LeaderboardCacheRepository {

    private final JdbcTemplate jdbc;

    public LeaderboardCacheRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Busca un registro de cache por ID
     */
    public Optional<LeaderboardCache> findById(Long id) {
        String sql = """
                SELECT id, user_id, week_number, year, co2_avoided_kg,
                       missions_completed, total_xp_week, rank_position, calculated_at
                FROM leaderboard_cache
                WHERE id = ?
                """;

        try {
            LeaderboardCache cache = jdbc.queryForObject(sql, cacheRowMapper(), id);
            return Optional.ofNullable(cache);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Obtiene el ranking de una semana específica
     */
    public List<LeaderboardCache> findByWeek(String weekNumber, Integer year) {
        String sql = """
                SELECT id, user_id, week_number, year, co2_avoided_kg,
                       missions_completed, total_xp_week, rank_position, calculated_at
                FROM leaderboard_cache
                WHERE week_number = ? AND year = ?
                ORDER BY rank_position ASC
                """;

        return jdbc.query(sql, cacheRowMapper(), weekNumber, year);
    }

    /**
     * Obtiene el Top N del ranking de una semana
     */
    public List<LeaderboardCache> findTopNByWeek(String weekNumber, Integer year, int limit) {
        String sql = """
                SELECT id, user_id, week_number, year, co2_avoided_kg,
                       missions_completed, total_xp_week, rank_position, calculated_at
                FROM leaderboard_cache
                WHERE week_number = ? AND year = ?
                  AND rank_position IS NOT NULL
                ORDER BY rank_position ASC
                LIMIT ?
                """;

        return jdbc.query(sql, cacheRowMapper(), weekNumber, year, limit);
    }

    /**
     * Obtiene la posición de un usuario en una semana específica
     */
    public Optional<LeaderboardCache> findByUserAndWeek(UUID userId, String weekNumber, Integer year) {
        String sql = """
                SELECT id, user_id, week_number, year, co2_avoided_kg,
                       missions_completed, total_xp_week, rank_position, calculated_at
                FROM leaderboard_cache
                WHERE user_id = ? AND week_number = ? AND year = ?
                """;

        try {
            LeaderboardCache cache = jdbc.queryForObject(sql, cacheRowMapper(), userId, weekNumber, year);
            return Optional.ofNullable(cache);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Obtiene todas las entradas de ranking de un usuario
     */
    public List<LeaderboardCache> findByUserId(UUID userId) {
        String sql = """
                SELECT id, user_id, week_number, year, co2_avoided_kg,
                       missions_completed, total_xp_week, rank_position, calculated_at
                FROM leaderboard_cache
                WHERE user_id = ?
                ORDER BY year DESC, week_number DESC
                """;

        return jdbc.query(sql, cacheRowMapper(), userId);
    }

    /**
     * Guarda o actualiza un registro de cache
     */
    public LeaderboardCache save(LeaderboardCache cache) {
        Optional<LeaderboardCache> existing = findByUserAndWeek(
                cache.getUserId(),
                cache.getWeekNumber(),
                cache.getYear()
        );

        if (existing.isPresent()) {
            cache.setId(existing.get().getId());
            return update(cache);
        } else {
            return insert(cache);
        }
    }

    /**
     * Inserta un nuevo registro de cache
     */
    private LeaderboardCache insert(LeaderboardCache cache) {
        String sql = """
                INSERT INTO leaderboard_cache
                (user_id, week_number, year, co2_avoided_kg, missions_completed,
                 total_xp_week, rank_position)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
            ps.setObject(1, cache.getUserId());
            ps.setString(2, cache.getWeekNumber());
            ps.setInt(3, cache.getYear());
            ps.setBigDecimal(4, cache.getCo2AvoidedKg());
            ps.setInt(5, cache.getMissionsCompleted() != null ? cache.getMissionsCompleted() : 0);
            ps.setInt(6, cache.getTotalXpWeek() != null ? cache.getTotalXpWeek() : 0);

            if (cache.getRankPosition() != null) {
                ps.setInt(7, cache.getRankPosition());
            } else {
                ps.setNull(7, java.sql.Types.INTEGER);
            }

            return ps;
        }, keyHolder);

        Long generatedId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
        cache.setId(generatedId);

        return findById(generatedId).orElse(cache);
    }

    /**
     * Actualiza un registro existente
     */
    private LeaderboardCache update(LeaderboardCache cache) {
        String sql = """
                UPDATE leaderboard_cache
                SET co2_avoided_kg = ?,
                    missions_completed = ?,
                    total_xp_week = ?,
                    rank_position = ?,
                    calculated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """;

        jdbc.update(sql,
                cache.getCo2AvoidedKg(),
                cache.getMissionsCompleted(),
                cache.getTotalXpWeek(),
                cache.getRankPosition(),
                cache.getId()
        );

        return findById(cache.getId()).orElse(cache);
    }

    /**
     * Elimina el cache de una semana específica
     */
    public int deleteByWeek(String weekNumber, Integer year) {
        String sql = "DELETE FROM leaderboard_cache WHERE week_number = ? AND year = ?";
        return jdbc.update(sql, weekNumber, year);
    }

    /**
     * Elimina cache antiguo (más de N semanas)
     */
    public int deleteOlderThanWeeks(int weeksToKeep) {
        String sql = """
                DELETE FROM leaderboard_cache
                WHERE calculated_at < NOW() - INTERVAL '? weeks'
                """;
        return jdbc.update(sql, weeksToKeep);
    }

    /**
     * Cuenta usuarios en el ranking de una semana
     */
    public int countByWeek(String weekNumber, Integer year) {
        String sql = "SELECT COUNT(*) FROM leaderboard_cache WHERE week_number = ? AND year = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, weekNumber, year);
        return count != null ? count : 0;
    }

    /**
     * Recalcula las posiciones del ranking para una semana
     * (actualiza rank_position basándose en co2_avoided_kg)
     */
    public int recalculateRankings(String weekNumber, Integer year) {
        String sql = """
                WITH ranked AS (
                    SELECT id,
                           ROW_NUMBER() OVER (ORDER BY co2_avoided_kg DESC, missions_completed DESC) AS new_rank
                    FROM leaderboard_cache
                    WHERE week_number = ? AND year = ?
                )
                UPDATE leaderboard_cache lc
                SET rank_position = ranked.new_rank,
                    calculated_at = CURRENT_TIMESTAMP
                FROM ranked
                WHERE lc.id = ranked.id
                """;

        return jdbc.update(sql, weekNumber, year);
    }

    /**
     * RowMapper para convertir ResultSet a LeaderboardCache
     */
    private RowMapper<LeaderboardCache> cacheRowMapper() {
        return (rs, rowNum) -> {
            LeaderboardCache cache = new LeaderboardCache();

            cache.setId(rs.getLong("id"));
            cache.setUserId((UUID) rs.getObject("user_id"));
            cache.setWeekNumber(rs.getString("week_number"));
            cache.setYear(rs.getInt("year"));
            cache.setCo2AvoidedKg(rs.getBigDecimal("co2_avoided_kg"));
            cache.setMissionsCompleted(rs.getInt("missions_completed"));
            cache.setTotalXpWeek(rs.getInt("total_xp_week"));

            int rankPosition = rs.getInt("rank_position");
            if (!rs.wasNull()) {
                cache.setRankPosition(rankPosition);
            }

            var calculatedAt = rs.getTimestamp("calculated_at");
            if (calculatedAt != null) {
                cache.setCalculatedAt(calculatedAt.toLocalDateTime());
            }

            return cache;
        };
    }
}
