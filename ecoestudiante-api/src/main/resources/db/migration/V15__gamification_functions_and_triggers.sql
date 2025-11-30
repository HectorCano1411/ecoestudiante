-- =============================================================================
-- Migración V15: Módulo de Gamificación - Funciones y Triggers
-- =============================================================================
-- Autor: Sistema EcoEstudiante
-- Fecha: 2025-11-30
-- Descripción: Crea funciones auxiliares y triggers para automatizar:
--              - Actualización de updated_at
--              - Cálculo automático de niveles
--              - Validaciones de integridad
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Función: Actualizar timestamp updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gamification_profiles
CREATE TRIGGER trg_gamification_profiles_updated_at
    BEFORE UPDATE ON gamification_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Actualiza automáticamente el campo updated_at';

-- -----------------------------------------------------------------------------
-- 2. Función: Calcular nivel desde XP total
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp BIGINT)
RETURNS INTEGER AS $$
BEGIN
    -- Formula: level = floor(sqrt(xp / 100))
    -- Ejemplos:
    --   100 XP  → Nivel 1
    --   400 XP  → Nivel 2
    --   900 XP  → Nivel 3
    --   2500 XP → Nivel 5
    RETURN FLOOR(SQRT(xp::NUMERIC / 100))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_level_from_xp(BIGINT) IS 'Calcula el nivel desde XP total usando formula sqrt(xp/100)';

-- -----------------------------------------------------------------------------
-- 3. Función: Actualizar nivel automáticamente
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_level_on_xp_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcula el nivel cada vez que cambia total_xp
    NEW.current_level = calculate_level_from_xp(NEW.total_xp);

    -- Asegura que el nivel mínimo sea 1
    IF NEW.current_level < 1 THEN
        NEW.current_level = 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar nivel automáticamente
CREATE TRIGGER trg_gamification_profiles_update_level
    BEFORE INSERT OR UPDATE OF total_xp ON gamification_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_level_on_xp_change();

COMMENT ON FUNCTION update_level_on_xp_change() IS 'Recalcula automáticamente el nivel cuando cambia el XP total';

-- -----------------------------------------------------------------------------
-- 4. Función: Actualizar best_streak
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_best_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Si current_streak supera best_streak, actualiza best_streak
    IF NEW.current_streak > NEW.best_streak THEN
        NEW.best_streak = NEW.current_streak;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar best_streak
CREATE TRIGGER trg_gamification_profiles_update_best_streak
    BEFORE UPDATE OF current_streak ON gamification_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_best_streak();

COMMENT ON FUNCTION update_best_streak() IS 'Actualiza best_streak si current_streak lo supera';

-- -----------------------------------------------------------------------------
-- 5. Función: Validar completitud de misión
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_mission_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el progreso alcanza o supera el objetivo
    IF NEW.current_progress >= NEW.target_progress AND NEW.status = 'ACTIVE' THEN
        NEW.status = 'COMPLETED';
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar completitud automáticamente
CREATE TRIGGER trg_mission_progress_check_completion
    BEFORE UPDATE OF current_progress ON mission_progress
    FOR EACH ROW
    EXECUTE FUNCTION check_mission_completion();

COMMENT ON FUNCTION check_mission_completion() IS 'Marca misión como COMPLETED si se alcanza el objetivo';

-- -----------------------------------------------------------------------------
-- 6. Función: Obtener semana ISO actual
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_current_iso_week()
RETURNS VARCHAR(10) AS $$
BEGIN
    -- Retorna semana en formato '2025-W01'
    RETURN TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW');
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_iso_week() IS 'Retorna la semana ISO actual en formato YYYY-WXX';

-- -----------------------------------------------------------------------------
-- 7. Función: Obtener año ISO actual
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_current_iso_year()
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(ISOYEAR FROM CURRENT_DATE)::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_iso_year() IS 'Retorna el año ISO actual';

-- -----------------------------------------------------------------------------
-- 8. Función: Calcular multiplicador de streak
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_streak_multiplier(streak INTEGER)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    -- Multiplier basado en streak:
    -- Semana 1-2: 1.0x
    -- Semana 3-4: 1.2x
    -- Semana 5-7: 1.5x
    -- Semana 8+:  2.0x
    CASE
        WHEN streak <= 2 THEN RETURN 1.0;
        WHEN streak <= 4 THEN RETURN 1.2;
        WHEN streak <= 7 THEN RETURN 1.5;
        ELSE RETURN 2.0;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_streak_multiplier(INTEGER) IS 'Calcula el multiplicador de XP según el streak actual';

-- -----------------------------------------------------------------------------
-- 9. Vista: Ranking Actual (Top 100)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_current_leaderboard AS
SELECT
    lc.rank_position,
    lc.user_id,
    u.username,
    lc.co2_avoided_kg,
    lc.missions_completed,
    lc.total_xp_week,
    lc.week_number,
    lc.year
FROM leaderboard_cache lc
INNER JOIN users u ON lc.user_id = u.id
WHERE lc.week_number = get_current_iso_week()
  AND lc.year = get_current_iso_year()
ORDER BY lc.rank_position ASC
LIMIT 100;

COMMENT ON VIEW v_current_leaderboard IS 'Vista del ranking de la semana actual (Top 100)';

-- -----------------------------------------------------------------------------
-- 10. Vista: Perfil de Gamificación Extendido
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_gamification_profile_extended AS
SELECT
    gp.id,
    gp.user_id,
    u.username,
    u.email,
    gp.total_xp,
    gp.current_level,
    gp.current_streak,
    gp.best_streak,
    gp.last_activity_date,

    -- Título según nivel
    CASE
        WHEN gp.current_level BETWEEN 1 AND 2 THEN 'Eco-Aprendiz'
        WHEN gp.current_level BETWEEN 3 AND 5 THEN 'Guardián Verde'
        WHEN gp.current_level BETWEEN 6 AND 9 THEN 'Héroe Sostenible'
        WHEN gp.current_level BETWEEN 10 AND 15 THEN 'Campeón del Planeta'
        ELSE 'Leyenda Ecológica'
    END AS level_title,

    -- Progreso al siguiente nivel
    gp.total_xp - (gp.current_level * gp.current_level * 100) AS xp_current_level,
    ((gp.current_level + 1) * (gp.current_level + 1) * 100) - (gp.current_level * gp.current_level * 100) AS xp_needed_next_level,

    -- Multiplicador actual
    get_streak_multiplier(gp.current_streak) AS current_multiplier,

    gp.created_at,
    gp.updated_at
FROM gamification_profiles gp
INNER JOIN users u ON gp.user_id = u.id;

COMMENT ON VIEW v_gamification_profile_extended IS 'Vista extendida con título, progreso y multiplicador calculados';

-- -----------------------------------------------------------------------------
-- 11. Vista: Misiones Activas del Usuario
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_user_active_missions AS
SELECT
    mp.id AS progress_id,
    mp.user_id,
    mp.mission_id,
    m.title,
    m.description,
    m.category,
    m.type,
    m.difficulty,
    m.xp_reward,
    m.co2_impact_kg,
    m.week_number,
    mp.current_progress,
    mp.target_progress,
    mp.status,
    mp.started_at,

    -- Porcentaje de completitud
    ROUND((mp.current_progress / mp.target_progress * 100)::NUMERIC, 1) AS completion_percentage,

    -- Días restantes de la semana
    7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER AS days_remaining
FROM mission_progress mp
INNER JOIN missions m ON mp.mission_id = m.id
WHERE mp.status = 'ACTIVE'
  AND m.week_number = get_current_iso_week()
  AND m.year = get_current_iso_year();

COMMENT ON VIEW v_user_active_missions IS 'Misiones activas con progreso y días restantes';

-- =============================================================================
-- Índices Adicionales para Optimización
-- =============================================================================

-- Índice compuesto para consultas de leaderboard
CREATE INDEX idx_leaderboard_cache_week_rank
    ON leaderboard_cache(week_number, year, rank_position)
    WHERE rank_position IS NOT NULL;

-- Índice para búsqueda rápida de misiones activas de un usuario
CREATE INDEX idx_mission_progress_user_active
    ON mission_progress(user_id, status)
    WHERE status = 'ACTIVE';

-- Índice para búsqueda de templates de misiones
CREATE INDEX idx_missions_templates
    ON missions(category, difficulty)
    WHERE is_template = TRUE;

-- =============================================================================
-- Fin de la migración V15
-- =============================================================================
