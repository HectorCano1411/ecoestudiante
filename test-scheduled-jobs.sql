-- Script SQL para probar manualmente la generación de misiones
-- Ejecutar en pgAdmin (http://localhost:5050) o psql

-- ============================================
-- 1. Ver misiones existentes de la semana actual
-- ============================================
SELECT
    id,
    title,
    category,
    mission_type,
    difficulty,
    week_number,
    year,
    xp_reward,
    is_template
FROM missions
WHERE week_number = TO_CHAR(CURRENT_DATE, 'IYYY-IW')
  AND is_template = false
ORDER BY category, difficulty;

-- ============================================
-- 2. Ver cuántas misiones hay por semana
-- ============================================
SELECT
    week_number,
    year,
    COUNT(*) as total_missions,
    COUNT(*) FILTER (WHERE is_template = true) as templates,
    COUNT(*) FILTER (WHERE is_template = false) as weekly_missions
FROM missions
GROUP BY week_number, year
ORDER BY year DESC, week_number DESC;

-- ============================================
-- 3. Ver templates disponibles
-- ============================================
SELECT
    id,
    title,
    category,
    mission_type,
    difficulty,
    xp_reward
FROM missions
WHERE is_template = true
ORDER BY category, difficulty;

-- ============================================
-- 4. Ver progreso de misiones de un usuario
-- ============================================
-- Reemplazar 'USER_ID_AQUI' con un UUID real
SELECT
    mp.id,
    m.title,
    m.category,
    mp.status,
    mp.current_value,
    mp.target_value,
    mp.completion_percentage,
    mp.completed_at
FROM mission_progress mp
JOIN missions m ON mp.mission_id = m.id
WHERE mp.user_id = 'USER_ID_AQUI'  -- ← CAMBIAR AQUI
ORDER BY mp.created_at DESC
LIMIT 10;

-- ============================================
-- 5. Estadísticas de XP de usuarios
-- ============================================
SELECT
    gp.user_id,
    u.username,
    gp.total_xp,
    gp.current_level,
    gp.current_week_streak,
    gp.best_week_streak,
    (SELECT COUNT(*) FROM mission_progress mp
     WHERE mp.user_id = gp.user_id AND mp.status = 'COMPLETED') as missions_completed
FROM gamification_profiles gp
JOIN users u ON gp.user_id = u.id
ORDER BY gp.total_xp DESC
LIMIT 10;

-- ============================================
-- 6. Ver últimas transacciones de XP
-- ============================================
SELECT
    xt.id,
    u.username,
    xt.xp_amount,
    xt.source,
    xt.description,
    xt.created_at
FROM xp_transactions xt
JOIN users u ON xt.user_id = u.id
ORDER BY xt.created_at DESC
LIMIT 20;

-- ============================================
-- 7. Ver leaderboard actual
-- ============================================
SELECT
    rank,
    user_id,
    username,
    co2_avoided_kg,
    missions_completed,
    total_xp,
    week_number,
    year
FROM leaderboard_cache
WHERE week_number = TO_CHAR(CURRENT_DATE, 'IYYY-IW')
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
ORDER BY rank ASC;

-- ============================================
-- NOTA: Para generar misiones manualmente desde SQL:
-- ============================================
-- Esto es equivalente a lo que hace el scheduled job,
-- pero NO es recomendado. Es mejor usar el endpoint de la API
-- o esperar a que se ejecute automáticamente cada lunes.
