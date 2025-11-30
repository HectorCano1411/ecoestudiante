-- =============================================================================
-- Migración V14: Módulo de Gamificación - Tablas Principales
-- =============================================================================
-- Autor: Sistema EcoEstudiante
-- Fecha: 2025-11-30
-- Descripción: Crea las tablas necesarias para el módulo de gamificación:
--              - gamification_profiles: Perfil de gamificación por usuario
--              - missions: Catálogo de misiones verdes
--              - mission_progress: Progreso individual en misiones
--              - xp_transactions: Registro auditado de XP
--              - leaderboard_cache: Cache del ranking semanal
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla: gamification_profiles
-- -----------------------------------------------------------------------------
-- Perfil de gamificación de cada usuario (relación 1:1 con users)
-- -----------------------------------------------------------------------------

CREATE TABLE gamification_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL UNIQUE,
    total_xp            BIGINT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    current_level       INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    current_streak      INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    best_streak         INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    last_activity_date  DATE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key a app_user
    CONSTRAINT fk_gamification_profile_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(id)
        ON DELETE CASCADE
);

-- Índices para gamification_profiles
CREATE INDEX idx_gamification_profiles_user_id ON gamification_profiles(user_id);
CREATE INDEX idx_gamification_profiles_total_xp ON gamification_profiles(total_xp DESC);
CREATE INDEX idx_gamification_profiles_current_level ON gamification_profiles(current_level DESC);

-- Comentarios
COMMENT ON TABLE gamification_profiles IS 'Perfil de gamificación de cada usuario';
COMMENT ON COLUMN gamification_profiles.total_xp IS 'Experiencia total acumulada';
COMMENT ON COLUMN gamification_profiles.current_level IS 'Nivel actual (calculado desde total_xp)';
COMMENT ON COLUMN gamification_profiles.current_streak IS 'Racha actual en semanas';
COMMENT ON COLUMN gamification_profiles.best_streak IS 'Mejor racha histórica';
COMMENT ON COLUMN gamification_profiles.last_activity_date IS 'Última fecha de actividad (para calcular streaks)';

-- -----------------------------------------------------------------------------
-- 2. Tabla: missions
-- -----------------------------------------------------------------------------
-- Catálogo de misiones verdes (templates y instancias semanales)
-- -----------------------------------------------------------------------------

CREATE TYPE mission_category AS ENUM ('ELECTRICITY', 'TRANSPORT', 'WASTE', 'GENERAL', 'BONUS');
CREATE TYPE mission_type AS ENUM ('REDUCTION', 'FREQUENCY', 'DISCOVERY', 'BONUS');
CREATE TYPE mission_difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');

CREATE TABLE missions (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    category            mission_category NOT NULL,
    type                mission_type NOT NULL,
    difficulty          mission_difficulty NOT NULL DEFAULT 'MEDIUM',

    -- Objetivo de la misión
    target_value        DECIMAL(10, 2) NOT NULL CHECK (target_value > 0),
    target_unit         VARCHAR(50) NOT NULL, -- 'kg_co2', 'times', 'percentage', 'days'

    -- Recompensas
    xp_reward           INTEGER NOT NULL CHECK (xp_reward > 0),
    co2_impact_kg       DECIMAL(10, 2) DEFAULT 0 CHECK (co2_impact_kg >= 0),

    -- Temporalidad
    week_number         VARCHAR(10), -- '2025-W01' formato ISO
    year                INTEGER,

    -- Template vs Instancia
    is_template         BOOLEAN NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Si no es template, debe tener week y year
    CONSTRAINT chk_mission_temporal
        CHECK (is_template = TRUE OR (week_number IS NOT NULL AND year IS NOT NULL))
);

-- Índices para missions
CREATE INDEX idx_missions_category ON missions(category);
CREATE INDEX idx_missions_week_year ON missions(week_number, year);
CREATE INDEX idx_missions_is_template ON missions(is_template);
CREATE INDEX idx_missions_difficulty ON missions(difficulty);

-- Comentarios
COMMENT ON TABLE missions IS 'Catálogo de misiones verdes (templates y asignaciones semanales)';
COMMENT ON COLUMN missions.is_template IS 'TRUE si es plantilla reutilizable, FALSE si es instancia semanal';
COMMENT ON COLUMN missions.target_value IS 'Valor objetivo (ej: 3 para "3 veces", 10 para "10%")';
COMMENT ON COLUMN missions.target_unit IS 'Unidad del objetivo (kg_co2, times, percentage, days)';

-- -----------------------------------------------------------------------------
-- 3. Tabla: mission_progress
-- -----------------------------------------------------------------------------
-- Progreso individual de cada usuario en cada misión
-- -----------------------------------------------------------------------------

CREATE TYPE mission_status AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'FAILED');

CREATE TABLE mission_progress (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL,
    mission_id          BIGINT NOT NULL,

    -- Progreso
    current_progress    DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
    target_progress     DECIMAL(10, 2) NOT NULL CHECK (target_progress > 0),

    -- Estado
    status              mission_status NOT NULL DEFAULT 'ACTIVE',

    -- Timestamps
    started_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMP,

    -- Baseline para misiones de reducción
    baseline_value      DECIMAL(10, 2),

    -- Foreign Keys
    CONSTRAINT fk_mission_progress_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mission_progress_mission
        FOREIGN KEY (mission_id)
        REFERENCES missions(id)
        ON DELETE CASCADE,

    -- Constraint: Un usuario no puede tener la misma misión activa dos veces
    CONSTRAINT uk_mission_progress_user_mission
        UNIQUE (user_id, mission_id)
);

-- Índices para mission_progress
CREATE INDEX idx_mission_progress_user_id ON mission_progress(user_id);
CREATE INDEX idx_mission_progress_mission_id ON mission_progress(mission_id);
CREATE INDEX idx_mission_progress_status ON mission_progress(status);
CREATE INDEX idx_mission_progress_user_status ON mission_progress(user_id, status);

-- Comentarios
COMMENT ON TABLE mission_progress IS 'Progreso individual de cada usuario en sus misiones asignadas';
COMMENT ON COLUMN mission_progress.baseline_value IS 'Valor de referencia (promedio previo) para misiones de reducción';
COMMENT ON COLUMN mission_progress.current_progress IS 'Progreso actual hacia el objetivo';
COMMENT ON COLUMN mission_progress.target_progress IS 'Valor objetivo para completar la misión';

-- -----------------------------------------------------------------------------
-- 4. Tabla: xp_transactions
-- -----------------------------------------------------------------------------
-- Registro auditado de todas las transacciones de XP
-- -----------------------------------------------------------------------------

CREATE TYPE xp_source AS ENUM ('MISSION_COMPLETE', 'CALCULATION', 'STREAK_BONUS', 'ACHIEVEMENT', 'MANUAL');

CREATE TABLE xp_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL,
    amount              INTEGER NOT NULL CHECK (amount != 0), -- Puede ser negativo (penalizaciones)
    source              xp_source NOT NULL,

    -- Referencia al origen (mission_id, calculation_id, etc)
    reference_id        BIGINT,
    reference_type      VARCHAR(50), -- 'mission', 'calculation', 'streak', etc

    -- Metadata
    description         TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key
    CONSTRAINT fk_xp_transaction_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(id)
        ON DELETE CASCADE
);

-- Índices para xp_transactions
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX idx_xp_transactions_source ON xp_transactions(source);

-- Comentarios
COMMENT ON TABLE xp_transactions IS 'Registro auditado de todas las transacciones de XP (para análisis y debugging)';
COMMENT ON COLUMN xp_transactions.amount IS 'Cantidad de XP (positivo = ganado, negativo = penalización)';
COMMENT ON COLUMN xp_transactions.reference_id IS 'ID del registro origen (misión, cálculo, etc)';

-- -----------------------------------------------------------------------------
-- 5. Tabla: leaderboard_cache
-- -----------------------------------------------------------------------------
-- Cache pre-calculado del ranking semanal (optimización)
-- -----------------------------------------------------------------------------

CREATE TABLE leaderboard_cache (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL,
    week_number         VARCHAR(10) NOT NULL, -- '2025-W01'
    year                INTEGER NOT NULL,

    -- Métricas
    co2_avoided_kg      DECIMAL(10, 2) NOT NULL DEFAULT 0,
    missions_completed  INTEGER NOT NULL DEFAULT 0,
    total_xp_week       INTEGER NOT NULL DEFAULT 0,

    -- Ranking
    rank_position       INTEGER,

    -- Metadata
    calculated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key
    CONSTRAINT fk_leaderboard_cache_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(id)
        ON DELETE CASCADE,

    -- Constraint: Un usuario solo puede estar una vez por semana
    CONSTRAINT uk_leaderboard_cache_user_week
        UNIQUE (user_id, week_number, year)
);

-- Índices para leaderboard_cache
CREATE INDEX idx_leaderboard_cache_week_year ON leaderboard_cache(week_number, year);
CREATE INDEX idx_leaderboard_cache_rank ON leaderboard_cache(week_number, year, rank_position);
CREATE INDEX idx_leaderboard_cache_co2 ON leaderboard_cache(week_number, year, co2_avoided_kg DESC);

-- Comentarios
COMMENT ON TABLE leaderboard_cache IS 'Cache del ranking semanal pre-calculado (se recalcula 1 vez/día)';
COMMENT ON COLUMN leaderboard_cache.co2_avoided_kg IS 'Kilogramos de CO2 evitados en la semana vs baseline';
COMMENT ON COLUMN leaderboard_cache.rank_position IS 'Posición en el ranking (1 = primero)';

-- =============================================================================
-- Datos Iniciales: Templates de Misiones
-- =============================================================================

INSERT INTO missions (title, description, category, type, difficulty, target_value, target_unit, xp_reward, co2_impact_kg, is_template)
VALUES
-- Misiones de Transporte
('Usa Transporte Público', 'Utiliza transporte público al menos 3 veces esta semana', 'TRANSPORT', 'FREQUENCY', 'EASY', 3, 'times', 50, 5.0, TRUE),
('Bicicleta al Campus', 'Ve al campus en bicicleta 5 días esta semana', 'TRANSPORT', 'FREQUENCY', 'MEDIUM', 5, 'days', 100, 8.0, TRUE),
('Reduce tu Huella de Transporte', 'Reduce en 10% tus emisiones de transporte esta semana', 'TRANSPORT', 'REDUCTION', 'MEDIUM', 10, 'percentage', 150, 12.0, TRUE),
('Cero Auto Esta Semana', 'No uses auto particular durante toda la semana', 'TRANSPORT', 'FREQUENCY', 'HARD', 7, 'days', 200, 20.0, TRUE),

-- Misiones de Electricidad
('Apaga las Luces', 'Reduce 5% tu consumo eléctrico esta semana', 'ELECTRICITY', 'REDUCTION', 'EASY', 5, 'percentage', 50, 3.0, TRUE),
('Desconecta Aparatos', 'Desconecta dispositivos en standby por 5 días', 'ELECTRICITY', 'FREQUENCY', 'MEDIUM', 5, 'days', 100, 4.0, TRUE),
('Ahorro Energético Pro', 'Reduce 15% tu consumo eléctrico esta semana', 'ELECTRICITY', 'REDUCTION', 'HARD', 15, 'percentage', 200, 10.0, TRUE),

-- Misiones de Residuos
('Clasifica tus Residuos', 'Clasifica correctamente tus residuos 5 días', 'WASTE', 'FREQUENCY', 'EASY', 5, 'days', 50, 2.0, TRUE),
('Semana Sin Plástico', 'Evita usar plástico desechable durante 7 días', 'WASTE', 'FREQUENCY', 'HARD', 7, 'days', 200, 5.0, TRUE),
('Reduce tu Basura', 'Reduce 20% la cantidad de residuos generados', 'WASTE', 'REDUCTION', 'MEDIUM', 20, 'percentage', 150, 8.0, TRUE),

-- Misiones de Descubrimiento
('Explora el Dashboard', 'Visita la sección de analytics y revisa tus estadísticas', 'GENERAL', 'DISCOVERY', 'EASY', 1, 'times', 30, 0, TRUE),
('Primer Cálculo de Residuos', 'Registra tu primer cálculo de huella de residuos', 'WASTE', 'DISCOVERY', 'EASY', 1, 'times', 40, 0, TRUE),
('Completa tu Perfil', 'Completa todos los datos de tu perfil ecológico', 'GENERAL', 'DISCOVERY', 'EASY', 1, 'times', 50, 0, TRUE),

-- Misiones Bonus
('Racha de Fuego', 'Mantén tu streak activo por 7 días consecutivos', 'BONUS', 'BONUS', 'MEDIUM', 7, 'days', 150, 0, TRUE),
('Misión Imposible', 'Completa todas las misiones de la semana', 'BONUS', 'BONUS', 'HARD', 100, 'percentage', 300, 0, TRUE),
('Campeón Semanal', 'Alcanza el Top 10 del leaderboard esta semana', 'BONUS', 'BONUS', 'HARD', 10, 'rank', 250, 0, TRUE);

-- =============================================================================
-- Fin de la migración V14
-- =============================================================================
