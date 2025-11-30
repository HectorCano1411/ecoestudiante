package com.ecoestudiante.gamification.repository;

import com.ecoestudiante.gamification.model.GamificationProfile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio para el acceso a datos de Perfiles de Gamificación.
 *
 * Utiliza JdbcTemplate para operaciones CRUD sobre la tabla gamification_profiles.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Repository
public class GamificationProfileRepository {

    private final JdbcTemplate jdbc;

    public GamificationProfileRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Busca un perfil de gamificación por ID de usuario
     *
     * @param userId ID del usuario
     * @return Optional con el perfil encontrado o vacío
     */
    public Optional<GamificationProfile> findByUserId(UUID userId) {
        String sql = """
                SELECT id, user_id, total_xp, current_level, current_streak, best_streak,
                       last_activity_date, created_at, updated_at
                FROM gamification_profiles
                WHERE user_id = ?
                """;

        try {
            GamificationProfile profile = jdbc.queryForObject(sql, profileRowMapper(), userId);
            return Optional.ofNullable(profile);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Busca un perfil por su ID
     *
     * @param id ID del perfil
     * @return Optional con el perfil encontrado o vacío
     */
    public Optional<GamificationProfile> findById(Long id) {
        String sql = """
                SELECT id, user_id, total_xp, current_level, current_streak, best_streak,
                       last_activity_date, created_at, updated_at
                FROM gamification_profiles
                WHERE id = ?
                """;

        try {
            GamificationProfile profile = jdbc.queryForObject(sql, profileRowMapper(), id);
            return Optional.ofNullable(profile);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Obtiene los top N perfiles por XP total
     *
     * @param limit Número máximo de perfiles a retornar
     * @return Lista de perfiles ordenados por XP descendente
     */
    public List<GamificationProfile> findTopByXp(int limit) {
        String sql = """
                SELECT id, user_id, total_xp, current_level, current_streak, best_streak,
                       last_activity_date, created_at, updated_at
                FROM gamification_profiles
                ORDER BY total_xp DESC
                LIMIT ?
                """;

        return jdbc.query(sql, profileRowMapper(), limit);
    }

    /**
     * Guarda o actualiza un perfil de gamificación
     *
     * @param profile Perfil a guardar
     * @return Perfil guardado con ID generado si es nuevo
     */
    public GamificationProfile save(GamificationProfile profile) {
        if (profile.getId() == null) {
            // Insert
            return insert(profile);
        } else {
            // Update
            return update(profile);
        }
    }

    /**
     * Inserta un nuevo perfil de gamificación
     */
    private GamificationProfile insert(GamificationProfile profile) {
        String sql = """
                INSERT INTO gamification_profiles
                (user_id, total_xp, current_level, current_streak, best_streak, last_activity_date)
                VALUES (?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
            ps.setObject(1, profile.getUserId());
            ps.setLong(2, profile.getTotalXp() != null ? profile.getTotalXp() : 0L);
            ps.setInt(3, profile.getCurrentLevel() != null ? profile.getCurrentLevel() : 1);
            ps.setInt(4, profile.getCurrentStreak() != null ? profile.getCurrentStreak() : 0);
            ps.setInt(5, profile.getBestStreak() != null ? profile.getBestStreak() : 0);

            if (profile.getLastActivityDate() != null) {
                ps.setDate(6, Date.valueOf(profile.getLastActivityDate()));
            } else {
                ps.setNull(6, java.sql.Types.DATE);
            }

            return ps;
        }, keyHolder);

        Long generatedId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
        profile.setId(generatedId);

        return findById(generatedId).orElse(profile);
    }

    /**
     * Actualiza un perfil existente
     */
    private GamificationProfile update(GamificationProfile profile) {
        String sql = """
                UPDATE gamification_profiles
                SET total_xp = ?,
                    current_level = ?,
                    current_streak = ?,
                    best_streak = ?,
                    last_activity_date = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """;

        jdbc.update(sql,
                profile.getTotalXp(),
                profile.getCurrentLevel(),
                profile.getCurrentStreak(),
                profile.getBestStreak(),
                profile.getLastActivityDate() != null ? Date.valueOf(profile.getLastActivityDate()) : null,
                profile.getId()
        );

        return findById(profile.getId()).orElse(profile);
    }

    /**
     * Actualiza el XP total de un perfil
     *
     * @param userId   ID del usuario
     * @param xpAmount Cantidad de XP a agregar (puede ser negativo)
     * @return Número de filas afectadas
     */
    public int addXp(UUID userId, int xpAmount) {
        String sql = """
                UPDATE gamification_profiles
                SET total_xp = total_xp + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """;

        return jdbc.update(sql, xpAmount, userId);
    }

    /**
     * Actualiza el streak de un usuario
     *
     * @param userId      ID del usuario
     * @param newStreak   Nuevo valor del streak
     * @return Número de filas afectadas
     */
    public int updateStreak(UUID userId, int newStreak) {
        String sql = """
                UPDATE gamification_profiles
                SET current_streak = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """;

        return jdbc.update(sql, newStreak, userId);
    }

    /**
     * Actualiza la última fecha de actividad
     *
     * @param userId         ID del usuario
     * @param activityDate   Nueva fecha de actividad
     * @return Número de filas afectadas
     */
    public int updateLastActivity(UUID userId, java.time.LocalDate activityDate) {
        String sql = """
                UPDATE gamification_profiles
                SET last_activity_date = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """;

        return jdbc.update(sql, Date.valueOf(activityDate), userId);
    }

    /**
     * Elimina un perfil por ID de usuario
     *
     * @param userId ID del usuario
     * @return Número de filas eliminadas
     */
    public int deleteByUserId(UUID userId) {
        String sql = "DELETE FROM gamification_profiles WHERE user_id = ?";
        return jdbc.update(sql, userId);
    }

    /**
     * Verifica si existe un perfil para un usuario
     *
     * @param userId ID del usuario
     * @return true si existe, false en caso contrario
     */
    public boolean existsByUserId(UUID userId) {
        String sql = "SELECT COUNT(*) FROM gamification_profiles WHERE user_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId);
        return count != null && count > 0;
    }

    /**
     * RowMapper para convertir ResultSet a GamificationProfile
     */
    private RowMapper<GamificationProfile> profileRowMapper() {
        return (rs, rowNum) -> {
            GamificationProfile profile = new GamificationProfile();

            profile.setId(rs.getLong("id"));
            profile.setUserId((UUID) rs.getObject("user_id"));
            profile.setTotalXp(rs.getLong("total_xp"));
            profile.setCurrentLevel(rs.getInt("current_level"));
            profile.setCurrentStreak(rs.getInt("current_streak"));
            profile.setBestStreak(rs.getInt("best_streak"));

            // Fechas (pueden ser null)
            var lastActivityDate = rs.getDate("last_activity_date");
            if (lastActivityDate != null) {
                profile.setLastActivityDate(lastActivityDate.toLocalDate());
            }

            var createdAt = rs.getTimestamp("created_at");
            if (createdAt != null) {
                profile.setCreatedAt(createdAt.toLocalDateTime());
            }

            var updatedAt = rs.getTimestamp("updated_at");
            if (updatedAt != null) {
                profile.setUpdatedAt(updatedAt.toLocalDateTime());
            }

            return profile;
        };
    }
}
