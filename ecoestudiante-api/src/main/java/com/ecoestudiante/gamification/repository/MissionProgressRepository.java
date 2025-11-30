package com.ecoestudiante.gamification.repository;

import com.ecoestudiante.gamification.model.MissionProgress;
import com.ecoestudiante.gamification.model.MissionProgress.MissionStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio para el acceso a datos de Progreso de Misiones.
 *
 * Utiliza JdbcTemplate para operaciones CRUD sobre la tabla mission_progress.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Repository
public class MissionProgressRepository {

    private final JdbcTemplate jdbc;

    public MissionProgressRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Busca un progreso de misión por ID
     */
    public Optional<MissionProgress> findById(Long id) {
        String sql = """
                SELECT id, user_id, mission_id, current_progress, target_progress,
                       status, started_at, completed_at, baseline_value
                FROM mission_progress
                WHERE id = ?
                """;

        try {
            MissionProgress progress = jdbc.queryForObject(sql, progressRowMapper(), id);
            return Optional.ofNullable(progress);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Busca el progreso de un usuario en una misión específica
     */
    public Optional<MissionProgress> findByUserAndMission(Long userId, Long missionId) {
        String sql = """
                SELECT id, user_id, mission_id, current_progress, target_progress,
                       status, started_at, completed_at, baseline_value
                FROM mission_progress
                WHERE user_id = ? AND mission_id = ?
                """;

        try {
            MissionProgress progress = jdbc.queryForObject(sql, progressRowMapper(), userId, missionId);
            return Optional.ofNullable(progress);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Obtiene todas las misiones activas de un usuario
     */
    public List<MissionProgress> findActiveByUserId(Long userId) {
        String sql = """
                SELECT id, user_id, mission_id, current_progress, target_progress,
                       status, started_at, completed_at, baseline_value
                FROM mission_progress
                WHERE user_id = ? AND status = 'ACTIVE'::mission_status
                ORDER BY started_at DESC
                """;

        return jdbc.query(sql, progressRowMapper(), userId);
    }

    /**
     * Obtiene todas las misiones completadas de un usuario
     */
    public List<MissionProgress> findCompletedByUserId(Long userId) {
        String sql = """
                SELECT id, user_id, mission_id, current_progress, target_progress,
                       status, started_at, completed_at, baseline_value
                FROM mission_progress
                WHERE user_id = ? AND status = 'COMPLETED'::mission_status
                ORDER BY completed_at DESC
                """;

        return jdbc.query(sql, progressRowMapper(), userId);
    }

    /**
     * Obtiene todas las misiones de un usuario (cualquier estado)
     */
    public List<MissionProgress> findAllByUserId(Long userId) {
        String sql = """
                SELECT id, user_id, mission_id, current_progress, target_progress,
                       status, started_at, completed_at, baseline_value
                FROM mission_progress
                WHERE user_id = ?
                ORDER BY started_at DESC
                """;

        return jdbc.query(sql, progressRowMapper(), userId);
    }

    /**
     * Obtiene misiones por usuario y estado
     */
    public List<MissionProgress> findByUserIdAndStatus(Long userId, MissionStatus status) {
        String sql = """
                SELECT id, user_id, mission_id, current_progress, target_progress,
                       status, started_at, completed_at, baseline_value
                FROM mission_progress
                WHERE user_id = ? AND status = ?::mission_status
                ORDER BY started_at DESC
                """;

        return jdbc.query(sql, progressRowMapper(), userId, status.name());
    }

    /**
     * Cuenta misiones completadas por usuario en un rango de fechas
     */
    public int countCompletedByUserBetweenDates(Long userId, java.time.LocalDateTime startDate, java.time.LocalDateTime endDate) {
        String sql = """
                SELECT COUNT(*) FROM mission_progress
                WHERE user_id = ?
                  AND status = 'COMPLETED'::mission_status
                  AND completed_at BETWEEN ? AND ?
                """;

        Integer count = jdbc.queryForObject(sql, Integer.class, userId,
                Timestamp.valueOf(startDate),
                Timestamp.valueOf(endDate));
        return count != null ? count : 0;
    }

    /**
     * Guarda o actualiza un progreso de misión
     */
    public MissionProgress save(MissionProgress progress) {
        if (progress.getId() == null) {
            return insert(progress);
        } else {
            return update(progress);
        }
    }

    /**
     * Inserta un nuevo progreso de misión
     */
    private MissionProgress insert(MissionProgress progress) {
        String sql = """
                INSERT INTO mission_progress
                (user_id, mission_id, current_progress, target_progress, status, baseline_value)
                VALUES (?, ?, ?, ?, ?::mission_status, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, progress.getUserId());
            ps.setLong(2, progress.getMissionId());
            ps.setBigDecimal(3, progress.getCurrentProgress());
            ps.setBigDecimal(4, progress.getTargetProgress());
            ps.setString(5, progress.getStatus() != null ? progress.getStatus().name() : MissionStatus.ACTIVE.name());

            if (progress.getBaselineValue() != null) {
                ps.setBigDecimal(6, progress.getBaselineValue());
            } else {
                ps.setNull(6, java.sql.Types.DECIMAL);
            }

            return ps;
        }, keyHolder);

        Long generatedId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
        progress.setId(generatedId);

        return findById(generatedId).orElse(progress);
    }

    /**
     * Actualiza un progreso existente
     */
    private MissionProgress update(MissionProgress progress) {
        String sql = """
                UPDATE mission_progress
                SET current_progress = ?,
                    target_progress = ?,
                    status = ?::mission_status,
                    completed_at = ?,
                    baseline_value = ?
                WHERE id = ?
                """;

        Timestamp completedAt = progress.getCompletedAt() != null
                ? Timestamp.valueOf(progress.getCompletedAt())
                : null;

        jdbc.update(sql,
                progress.getCurrentProgress(),
                progress.getTargetProgress(),
                progress.getStatus().name(),
                completedAt,
                progress.getBaselineValue(),
                progress.getId()
        );

        return findById(progress.getId()).orElse(progress);
    }

    /**
     * Actualiza solo el progreso actual
     */
    public int updateProgress(Long progressId, java.math.BigDecimal newProgress) {
        String sql = """
                UPDATE mission_progress
                SET current_progress = ?
                WHERE id = ?
                """;

        return jdbc.update(sql, newProgress, progressId);
    }

    /**
     * Marca una misión como completada
     */
    public int markAsCompleted(Long progressId) {
        String sql = """
                UPDATE mission_progress
                SET status = 'COMPLETED'::mission_status,
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """;

        return jdbc.update(sql, progressId);
    }

    /**
     * Marca misiones expiradas (fin de semana sin completar)
     */
    public int markExpiredMissions(String weekNumber, Integer year) {
        String sql = """
                UPDATE mission_progress mp
                SET status = 'EXPIRED'::mission_status
                FROM missions m
                WHERE mp.mission_id = m.id
                  AND mp.status = 'ACTIVE'::mission_status
                  AND m.week_number = ?
                  AND m.year = ?
                """;

        return jdbc.update(sql, weekNumber, year);
    }

    /**
     * Elimina un progreso de misión
     */
    public int deleteById(Long id) {
        String sql = "DELETE FROM mission_progress WHERE id = ?";
        return jdbc.update(sql, id);
    }

    /**
     * Verifica si existe un progreso para usuario y misión
     */
    public boolean existsByUserAndMission(Long userId, Long missionId) {
        String sql = "SELECT COUNT(*) FROM mission_progress WHERE user_id = ? AND mission_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId, missionId);
        return count != null && count > 0;
    }

    /**
     * RowMapper para convertir ResultSet a MissionProgress
     */
    private RowMapper<MissionProgress> progressRowMapper() {
        return (rs, rowNum) -> {
            MissionProgress progress = new MissionProgress();

            progress.setId(rs.getLong("id"));
            progress.setUserId(rs.getLong("user_id"));
            progress.setMissionId(rs.getLong("mission_id"));
            progress.setCurrentProgress(rs.getBigDecimal("current_progress"));
            progress.setTargetProgress(rs.getBigDecimal("target_progress"));
            progress.setStatus(MissionStatus.valueOf(rs.getString("status")));

            var startedAt = rs.getTimestamp("started_at");
            if (startedAt != null) {
                progress.setStartedAt(startedAt.toLocalDateTime());
            }

            var completedAt = rs.getTimestamp("completed_at");
            if (completedAt != null) {
                progress.setCompletedAt(completedAt.toLocalDateTime());
            }

            var baselineValue = rs.getBigDecimal("baseline_value");
            if (baselineValue != null) {
                progress.setBaselineValue(baselineValue);
            }

            return progress;
        };
    }
}
