package com.ecoestudiante.gamification.repository;

import com.ecoestudiante.gamification.model.Mission;
import com.ecoestudiante.gamification.model.Mission.MissionCategory;
import com.ecoestudiante.gamification.model.Mission.MissionDifficulty;
import com.ecoestudiante.gamification.model.Mission.MissionType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio para el acceso a datos de Misiones.
 *
 * Utiliza JdbcTemplate para operaciones CRUD sobre la tabla missions.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Repository
public class MissionRepository {

    private final JdbcTemplate jdbc;

    public MissionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Busca una misión por ID
     */
    public Optional<Mission> findById(Long id) {
        String sql = """
                SELECT id, title, description, category, type, difficulty,
                       target_value, target_unit, xp_reward, co2_impact_kg,
                       week_number, year, is_template, created_at
                FROM missions
                WHERE id = ?
                """;

        try {
            Mission mission = jdbc.queryForObject(sql, missionRowMapper(), id);
            return Optional.ofNullable(mission);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Obtiene todas las misiones template (reutilizables)
     */
    public List<Mission> findAllTemplates() {
        String sql = """
                SELECT id, title, description, category, type, difficulty,
                       target_value, target_unit, xp_reward, co2_impact_kg,
                       week_number, year, is_template, created_at
                FROM missions
                WHERE is_template = true
                ORDER BY category, difficulty
                """;

        return jdbc.query(sql, missionRowMapper());
    }

    /**
     * Obtiene misiones por semana específica
     */
    public List<Mission> findByWeek(String weekNumber, Integer year) {
        String sql = """
                SELECT id, title, description, category, type, difficulty,
                       target_value, target_unit, xp_reward, co2_impact_kg,
                       week_number, year, is_template, created_at
                FROM missions
                WHERE week_number = ? AND year = ? AND is_template = false
                ORDER BY difficulty, xp_reward DESC
                """;

        return jdbc.query(sql, missionRowMapper(), weekNumber, year);
    }

    /**
     * Obtiene templates por categoría
     */
    public List<Mission> findTemplatesByCategory(MissionCategory category) {
        String sql = """
                SELECT id, title, description, category, type, difficulty,
                       target_value, target_unit, xp_reward, co2_impact_kg,
                       week_number, year, is_template, created_at
                FROM missions
                WHERE category = ?::mission_category AND is_template = true
                ORDER BY difficulty
                """;

        return jdbc.query(sql, missionRowMapper(), category.name());
    }

    /**
     * Obtiene templates por dificultad
     */
    public List<Mission> findTemplatesByDifficulty(MissionDifficulty difficulty) {
        String sql = """
                SELECT id, title, description, category, type, difficulty,
                       target_value, target_unit, xp_reward, co2_impact_kg,
                       week_number, year, is_template, created_at
                FROM missions
                WHERE difficulty = ?::mission_difficulty AND is_template = true
                ORDER BY category
                """;

        return jdbc.query(sql, missionRowMapper(), difficulty.name());
    }

    /**
     * Guarda una nueva misión
     */
    public Mission save(Mission mission) {
        if (mission.getId() == null) {
            return insert(mission);
        } else {
            return update(mission);
        }
    }

    /**
     * Inserta una nueva misión
     */
    private Mission insert(Mission mission) {
        String sql = """
                INSERT INTO missions
                (title, description, category, type, difficulty, target_value, target_unit,
                 xp_reward, co2_impact_kg, week_number, year, is_template)
                VALUES (?, ?, ?::mission_category, ?::mission_type, ?::mission_difficulty,
                        ?, ?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
            ps.setString(1, mission.getTitle());
            ps.setString(2, mission.getDescription());
            ps.setString(3, mission.getCategory().name());
            ps.setString(4, mission.getType().name());
            ps.setString(5, mission.getDifficulty().name());
            ps.setBigDecimal(6, mission.getTargetValue());
            ps.setString(7, mission.getTargetUnit());
            ps.setInt(8, mission.getXpReward());
            ps.setBigDecimal(9, mission.getCo2ImpactKg());
            ps.setString(10, mission.getWeekNumber());

            if (mission.getYear() != null) {
                ps.setInt(11, mission.getYear());
            } else {
                ps.setNull(11, java.sql.Types.INTEGER);
            }

            ps.setBoolean(12, mission.getIsTemplate() != null ? mission.getIsTemplate() : false);

            return ps;
        }, keyHolder);

        Long generatedId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
        mission.setId(generatedId);

        return findById(generatedId).orElse(mission);
    }

    /**
     * Actualiza una misión existente
     */
    private Mission update(Mission mission) {
        String sql = """
                UPDATE missions
                SET title = ?,
                    description = ?,
                    category = ?::mission_category,
                    type = ?::mission_type,
                    difficulty = ?::mission_difficulty,
                    target_value = ?,
                    target_unit = ?,
                    xp_reward = ?,
                    co2_impact_kg = ?,
                    week_number = ?,
                    year = ?,
                    is_template = ?
                WHERE id = ?
                """;

        jdbc.update(sql,
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
                mission.getIsTemplate(),
                mission.getId()
        );

        return findById(mission.getId()).orElse(mission);
    }

    /**
     * Elimina una misión por ID
     */
    public int deleteById(Long id) {
        String sql = "DELETE FROM missions WHERE id = ?";
        return jdbc.update(sql, id);
    }

    /**
     * Verifica si existe una misión para una semana y categoría específica
     */
    public boolean existsByWeekAndCategory(String weekNumber, Integer year, MissionCategory category) {
        String sql = """
                SELECT COUNT(*) FROM missions
                WHERE week_number = ? AND year = ? AND category = ?::mission_category AND is_template = false
                """;

        Integer count = jdbc.queryForObject(sql, Integer.class, weekNumber, year, category.name());
        return count != null && count > 0;
    }

    /**
     * Obtiene el total de misiones por semana
     */
    public int countByWeek(String weekNumber, Integer year) {
        String sql = """
                SELECT COUNT(*) FROM missions
                WHERE week_number = ? AND year = ? AND is_template = false
                """;

        Integer count = jdbc.queryForObject(sql, Integer.class, weekNumber, year);
        return count != null ? count : 0;
    }

    /**
     * RowMapper para convertir ResultSet a Mission
     */
    private RowMapper<Mission> missionRowMapper() {
        return (rs, rowNum) -> {
            Mission mission = new Mission();

            mission.setId(rs.getLong("id"));
            mission.setTitle(rs.getString("title"));
            mission.setDescription(rs.getString("description"));

            // Convertir ENUMs desde string
            mission.setCategory(MissionCategory.valueOf(rs.getString("category")));
            mission.setType(MissionType.valueOf(rs.getString("type")));
            mission.setDifficulty(MissionDifficulty.valueOf(rs.getString("difficulty")));

            mission.setTargetValue(rs.getBigDecimal("target_value"));
            mission.setTargetUnit(rs.getString("target_unit"));
            mission.setXpReward(rs.getInt("xp_reward"));
            mission.setCo2ImpactKg(rs.getBigDecimal("co2_impact_kg"));

            // Campos opcionales
            mission.setWeekNumber(rs.getString("week_number"));

            int year = rs.getInt("year");
            if (!rs.wasNull()) {
                mission.setYear(year);
            }

            mission.setIsTemplate(rs.getBoolean("is_template"));

            var createdAt = rs.getTimestamp("created_at");
            if (createdAt != null) {
                mission.setCreatedAt(createdAt.toLocalDateTime());
            }

            return mission;
        };
    }
}
