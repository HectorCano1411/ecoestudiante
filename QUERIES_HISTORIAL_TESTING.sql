-- ============================================================================
-- QUERIES SQL PARA CONSULTAR Y VERIFICAR HISTORIAL DE CÁLCULOS
-- ============================================================================
--
-- Este archivo contiene queries organizadas para:
-- - Explorar datos del historial
-- - Probar filtros (fechas, emisiones, subcategorías)
-- - Análisis estadístico
-- - Verificación de factores de emisión
-- - Testing y debugging
--
-- Proyecto: EcoEstudiante
-- Módulo: Historial de Cálculos
-- Fecha: 2025-11-26
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: CONSULTAS BÁSICAS - EXPLORACIÓN DE DATOS
-- ============================================================================

-- 1.1 Ver todos los usuarios registrados
-- ----------------------------------------------------------------------------
SELECT
  id::text as user_id,
  username,
  email,
  created_at,
  email_verified,
  auth0_id
FROM users
ORDER BY created_at DESC
LIMIT 20;


-- 1.2 Contar registros de cálculos por usuario
-- ----------------------------------------------------------------------------
SELECT
  u.username,
  u.email,
  COUNT(c.id) as total_calculos,
  SUM(c.result_kg_co2e) as total_emisiones_kg_co2e,
  MIN(c.created_at) as primer_calculo,
  MAX(c.created_at) as ultimo_calculo
FROM users u
LEFT JOIN calculation c ON c.user_id = u.id
GROUP BY u.id, u.username, u.email
ORDER BY total_calculos DESC;


-- 1.3 Ver todos los cálculos (últimos 50)
-- ----------------------------------------------------------------------------
SELECT
  c.id::text as calc_id,
  c.user_id::text,
  c.category,
  c.result_kg_co2e,
  c.created_at,
  c.input_json
FROM calculation c
ORDER BY c.created_at DESC
LIMIT 50;


-- 1.4 Estadísticas generales del sistema
-- ----------------------------------------------------------------------------
SELECT
  COUNT(DISTINCT user_id) as total_usuarios,
  COUNT(*) as total_calculos,
  SUM(result_kg_co2e) as total_emisiones_kg,
  AVG(result_kg_co2e) as promedio_emisiones_kg,
  MIN(result_kg_co2e) as min_emision_kg,
  MAX(result_kg_co2e) as max_emision_kg,
  MIN(created_at) as fecha_primer_calculo,
  MAX(created_at) as fecha_ultimo_calculo
FROM calculation;


-- ============================================================================
-- SECCIÓN 2: CONSULTAS POR CATEGORÍA
-- ============================================================================

-- 2.1 Resumen por categoría
-- ----------------------------------------------------------------------------
SELECT
  category,
  COUNT(*) as total_registros,
  SUM(result_kg_co2e) as total_kg_co2e,
  AVG(result_kg_co2e) as promedio_kg_co2e,
  MIN(result_kg_co2e) as min_kg_co2e,
  MAX(result_kg_co2e) as max_kg_co2e
FROM calculation
GROUP BY category
ORDER BY total_kg_co2e DESC;


-- 2.2 Cálculos de ELECTRICIDAD
-- ----------------------------------------------------------------------------
SELECT
  c.id::text as calc_id,
  c.created_at,
  c.result_kg_co2e,
  c.input_json->>'kwh' as kwh_consumidos,
  c.input_json->>'country' as pais,
  c.input_json->>'period' as periodo,
  c.input_json->>'career' as carrera,
  c.input_json->'selectedAppliances' as electrodomesticos
FROM calculation c
WHERE c.category = 'electricidad'
ORDER BY c.created_at DESC
LIMIT 20;


-- 2.3 Cálculos de TRANSPORTE
-- ----------------------------------------------------------------------------
SELECT
  c.id::text as calc_id,
  c.created_at,
  c.result_kg_co2e,
  c.input_json->>'transportMode' as modo_transporte,
  c.input_json->>'fuelType' as tipo_combustible,
  c.input_json->>'distance' as distancia_km,
  c.input_json->>'occupancy' as ocupantes,
  c.input_json->>'originAddress' as origen,
  c.input_json->>'destinationAddress' as destino
FROM calculation c
WHERE c.category = 'transporte'
ORDER BY c.created_at DESC
LIMIT 20;


-- 2.4 Cálculos de RESIDUOS
-- ----------------------------------------------------------------------------
SELECT
  c.id::text as calc_id,
  c.created_at,
  c.result_kg_co2e,
  c.input_json->>'disposalMethod' as metodo_disposicion,
  c.input_json->'wasteItems' as items_residuos,
  jsonb_array_length(c.input_json->'wasteItems') as cantidad_tipos_residuos
FROM calculation c
WHERE c.category = 'residuos'
ORDER BY c.created_at DESC
LIMIT 20;


-- ============================================================================
-- SECCIÓN 3: CONSULTAS CON FILTROS (Simulando la API)
-- ============================================================================

-- 3.1 Filtro por rango de FECHAS
-- ----------------------------------------------------------------------------
-- Ejemplo: Obtener cálculos de enero 2025
SELECT
  c.id::text as calc_id,
  c.category,
  c.result_kg_co2e,
  c.created_at,
  c.input_json
FROM calculation c
WHERE c.created_at >= '2025-01-01 00:00:00'::timestamp
  AND c.created_at <= '2025-01-31 23:59:59'::timestamp
ORDER BY c.created_at DESC;


-- 3.2 Filtro por rango de EMISIONES
-- ----------------------------------------------------------------------------
-- Ejemplo: Obtener cálculos entre 5 y 50 kg CO2e
SELECT
  c.id::text as calc_id,
  c.category,
  c.result_kg_co2e,
  c.created_at
FROM calculation c
WHERE c.result_kg_co2e >= 5.0
  AND c.result_kg_co2e <= 50.0
ORDER BY c.result_kg_co2e DESC;


-- 3.3 Filtro COMBINADO (fecha + emisión + categoría)
-- ----------------------------------------------------------------------------
-- Ejemplo: Transporte del 2025 con emisiones entre 10 y 100 kg
SELECT
  c.id::text as calc_id,
  c.category,
  c.result_kg_co2e,
  c.created_at,
  c.input_json
FROM calculation c
WHERE c.created_at >= '2025-01-01'::date
  AND c.created_at <= '2025-12-31'::date
  AND c.result_kg_co2e >= 10.0
  AND c.result_kg_co2e <= 100.0
  AND c.category = 'transporte'
ORDER BY c.created_at DESC
LIMIT 20;


-- 3.4 Filtro por usuario específico
-- ----------------------------------------------------------------------------
-- Paso 1: Obtener el user_id del usuario
SELECT id::text, username, email FROM users WHERE username = 'testuser5';

-- Paso 2: Usar ese ID en la consulta (reemplaza el UUID con el real)
SELECT
  c.id::text as calc_id,
  c.category,
  c.result_kg_co2e,
  c.created_at,
  (
    SELECT ca.factor_snapshot
    FROM calculation_audit ca
    WHERE ca.calculation_id = c.id
    ORDER BY ca.created_at DESC
    LIMIT 1
  ) as factor_info
FROM calculation c
WHERE c.user_id = '0d6e2d1a-c5ff-4670-8f78-78042e93e141'::uuid
ORDER BY c.created_at DESC
LIMIT 20;


-- ============================================================================
-- SECCIÓN 4: CONSULTAS AVANZADAS - ANÁLISIS
-- ============================================================================

-- 4.1 Distribución de emisiones por rango
-- ----------------------------------------------------------------------------
SELECT
  CASE
    WHEN result_kg_co2e < 1 THEN '0-1 kg'
    WHEN result_kg_co2e < 5 THEN '1-5 kg'
    WHEN result_kg_co2e < 10 THEN '5-10 kg'
    WHEN result_kg_co2e < 50 THEN '10-50 kg'
    WHEN result_kg_co2e < 100 THEN '50-100 kg'
    ELSE '100+ kg'
  END as rango_emision,
  COUNT(*) as cantidad,
  ROUND(AVG(result_kg_co2e)::numeric, 2) as promedio_rango
FROM calculation
GROUP BY rango_emision
ORDER BY
  CASE rango_emision
    WHEN '0-1 kg' THEN 1
    WHEN '1-5 kg' THEN 2
    WHEN '5-10 kg' THEN 3
    WHEN '10-50 kg' THEN 4
    WHEN '50-100 kg' THEN 5
    ELSE 6
  END;


-- 4.2 Top 10 usuarios con más emisiones
-- ----------------------------------------------------------------------------
SELECT
  u.username,
  u.email,
  COUNT(c.id) as total_calculos,
  ROUND(SUM(c.result_kg_co2e)::numeric, 2) as total_emisiones_kg,
  ROUND(AVG(c.result_kg_co2e)::numeric, 2) as promedio_por_calculo
FROM users u
JOIN calculation c ON c.user_id = u.id
GROUP BY u.id, u.username, u.email
ORDER BY total_emisiones_kg DESC
LIMIT 10;


-- 4.3 Tendencia de emisiones por mes
-- ----------------------------------------------------------------------------
SELECT
  DATE_TRUNC('month', created_at) as mes,
  category,
  COUNT(*) as cantidad_calculos,
  ROUND(SUM(result_kg_co2e)::numeric, 2) as total_kg_co2e
FROM calculation
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY mes, category
ORDER BY mes DESC, total_kg_co2e DESC;


-- 4.4 Análisis de subcategorías de TRANSPORTE
-- ----------------------------------------------------------------------------
SELECT
  input_json->>'transportMode' as modo_transporte,
  input_json->>'fuelType' as tipo_combustible,
  COUNT(*) as cantidad,
  ROUND(AVG((input_json->>'distance')::numeric), 2) as distancia_promedio_km,
  ROUND(AVG(result_kg_co2e)::numeric, 2) as emision_promedio_kg
FROM calculation
WHERE category = 'transporte'
  AND input_json->>'transportMode' IS NOT NULL
GROUP BY modo_transporte, tipo_combustible
ORDER BY cantidad DESC;


-- 4.5 Análisis de RESIDUOS por tipo
-- ----------------------------------------------------------------------------
SELECT
  input_json->>'disposalMethod' as metodo_disposicion,
  COUNT(*) as cantidad_calculos,
  ROUND(AVG(result_kg_co2e)::numeric, 2) as emision_promedio_kg,
  ROUND(AVG(jsonb_array_length(input_json->'wasteItems'))::numeric, 2) as promedio_tipos_residuos
FROM calculation
WHERE category = 'residuos'
GROUP BY metodo_disposicion
ORDER BY cantidad_calculos DESC;


-- ============================================================================
-- SECCIÓN 5: CONSULTAS DE VERIFICACIÓN - FACTORES DE EMISIÓN
-- ============================================================================

-- 5.1 Ver factores de emisión disponibles (vigentes hoy)
-- ----------------------------------------------------------------------------
SELECT
  ef.category,
  ef.subcategory,
  ef.country,
  ef.value as factor_valor,
  ef.unit as unidad,
  fv.valid_from,
  fv.valid_to,
  fv.hash
FROM emission_factor ef
JOIN factor_version fv ON fv.id = ef.version_id
WHERE fv.valid_from <= CURRENT_DATE
  AND (fv.valid_to IS NULL OR fv.valid_to >= CURRENT_DATE)
ORDER BY ef.category, ef.subcategory;


-- 5.2 Ver factores de TRANSPORTE
-- ----------------------------------------------------------------------------
SELECT
  ef.subcategory,
  ef.value as factor_kg_co2e_por_km,
  ef.unit,
  ef.country,
  fv.valid_from,
  fv.valid_to
FROM emission_factor ef
JOIN factor_version fv ON fv.id = ef.version_id
WHERE ef.category = 'transporte'
  AND fv.valid_from <= CURRENT_DATE
  AND (fv.valid_to IS NULL OR fv.valid_to >= CURRENT_DATE)
ORDER BY ef.subcategory;


-- 5.3 Ver factores de RESIDUOS
-- ----------------------------------------------------------------------------
SELECT
  ef.subcategory,
  ef.value as factor_kg_co2e_por_kg,
  ef.unit,
  ef.country,
  fv.valid_from,
  fv.valid_to
FROM emission_factor ef
JOIN factor_version fv ON fv.id = ef.version_id
WHERE ef.category = 'residuos'
  AND fv.valid_from <= CURRENT_DATE
  AND (fv.valid_to IS NULL OR fv.valid_to >= CURRENT_DATE)
ORDER BY ef.subcategory;


-- 5.4 Ver factores de ELECTRICIDAD
-- ----------------------------------------------------------------------------
SELECT
  ef.category,
  ef.country,
  ef.value as factor_kg_co2e_por_kwh,
  ef.unit,
  fv.valid_from,
  fv.valid_to,
  fv.source_id
FROM emission_factor ef
JOIN factor_version fv ON fv.id = ef.version_id
WHERE ef.category = 'electricidad'
  AND fv.valid_from <= CURRENT_DATE
  AND (fv.valid_to IS NULL OR fv.valid_to >= CURRENT_DATE)
ORDER BY ef.country;


-- ============================================================================
-- SECCIÓN 6: CONSULTAS PARA TESTING - VERIFICACIÓN
-- ============================================================================

-- 6.1 Verificar si existen datos para un usuario
-- ----------------------------------------------------------------------------
SELECT
  u.username,
  u.email,
  COUNT(c.id) as total_calculos,
  MIN(c.created_at) as primer_calculo,
  MAX(c.created_at) as ultimo_calculo
FROM users u
LEFT JOIN calculation c ON c.user_id = u.id
WHERE u.username = 'testuser5'
GROUP BY u.username, u.email;


-- 6.2 Ver datos completos de un cálculo específico
-- ----------------------------------------------------------------------------
-- Reemplaza el UUID con un ID real de la tabla calculation
SELECT
  c.id::text as calc_id,
  c.user_id::text,
  c.category,
  c.result_kg_co2e,
  c.factor_hash,
  c.created_at,
  c.input_json,
  ca.factor_snapshot
FROM calculation c
LEFT JOIN calculation_audit ca ON ca.calculation_id = c.id
WHERE c.id = 'REEMPLAZAR-CON-ID-REAL'::uuid;


-- 6.3 Obtener rangos reales de datos para testing
-- ----------------------------------------------------------------------------
-- Útil para saber qué valores usar en filtros de prueba
SELECT
  MIN(created_at) as fecha_min,
  MAX(created_at) as fecha_max,
  MIN(result_kg_co2e) as emision_min,
  MAX(result_kg_co2e) as emision_max,
  COUNT(*) as total_registros
FROM calculation;


-- 6.4 Listar cálculos con detalles de auditoría
-- ----------------------------------------------------------------------------
SELECT
  c.id::text as calc_id,
  c.category,
  c.result_kg_co2e,
  c.created_at,
  COUNT(ca.id) as audit_entries,
  MAX(ca.created_at) as ultima_auditoria
FROM calculation c
LEFT JOIN calculation_audit ca ON ca.calculation_id = c.id
GROUP BY c.id, c.category, c.result_kg_co2e, c.created_at
ORDER BY c.created_at DESC
LIMIT 20;


-- ============================================================================
-- SECCIÓN 7: QUERY COMPLETA - SIMULACIÓN DE LA API
-- ============================================================================

-- 7.1 Query que replica exactamente la lógica del backend con todos los filtros
-- ----------------------------------------------------------------------------
-- Esta query simula lo que hace CalcServiceImpl.getHistory() en el backend
-- Ajusta los parámetros según necesites probar diferentes escenarios

WITH filtered_calculations AS (
  SELECT
    c.id::text as calc_id,
    c.category,
    c.input_json,
    c.result_kg_co2e,
    c.created_at,
    (
      SELECT ca.factor_snapshot
      FROM calculation_audit ca
      WHERE ca.calculation_id = c.id
      ORDER BY ca.created_at DESC
      LIMIT 1
    ) as factor_snapshot
  FROM calculation c
  WHERE
    -- Filtro de usuario (obligatorio en la API)
    c.user_id = (SELECT id FROM users WHERE username = 'testuser5')

    -- Filtro de categoría (opcional - comentar para ver todas)
    -- AND c.category = 'transporte'

    -- Filtro de rango de fechas (opcional)
    AND c.created_at >= '2024-01-01 00:00:00'::timestamp
    AND c.created_at <= '2025-12-31 23:59:59'::timestamp

    -- Filtro de rango de emisiones (opcional)
    AND c.result_kg_co2e >= 0.0
    AND c.result_kg_co2e <= 1000.0

  ORDER BY c.created_at DESC
  LIMIT 20 OFFSET 0  -- Paginación
)
SELECT
  calc_id,
  category,
  result_kg_co2e,
  created_at,
  input_json,
  factor_snapshot,

  -- Extraer subcategoría según la lógica de extractSubcategory()
  CASE
    WHEN category = 'transporte' THEN
      CONCAT(
        CASE input_json->>'transportMode'
          WHEN 'car' THEN 'Auto'
          WHEN 'bus' THEN 'Bus/Transporte Público'
          WHEN 'metro' THEN 'Metro/Tren'
          WHEN 'bicycle' THEN 'Bicicleta'
          WHEN 'walking' THEN 'Caminando'
          WHEN 'plane' THEN 'Avión'
          WHEN 'motorcycle' THEN 'Motocicleta'
          ELSE input_json->>'transportMode'
        END,
        CASE
          WHEN input_json->>'fuelType' IS NOT NULL THEN
            ' - ' || CASE input_json->>'fuelType'
              WHEN 'gasoline' THEN 'Gasolina'
              WHEN 'diesel' THEN 'Diesel'
              WHEN 'electric' THEN 'Eléctrico'
              WHEN 'hybrid' THEN 'Híbrido'
              ELSE input_json->>'fuelType'
            END
          ELSE ''
        END
      )
    WHEN category = 'electricidad' THEN 'Electricidad'
    WHEN category = 'residuos' THEN 'Residuos'
    ELSE category
  END as subcategory_computed

FROM filtered_calculations;


-- ============================================================================
-- SECCIÓN 8: LIMPIEZA Y MANTENIMIENTO (USAR CON PRECAUCIÓN)
-- ============================================================================

-- 8.1 Contar cálculos huérfanos (sin auditoría)
-- ----------------------------------------------------------------------------
SELECT COUNT(*) as calculos_sin_auditoria
FROM calculation c
LEFT JOIN calculation_audit ca ON ca.calculation_id = c.id
WHERE ca.id IS NULL;


-- 8.2 Verificar integridad referencial
-- ----------------------------------------------------------------------------
-- Verificar que todos los calculation_audit apunten a cálculos existentes
SELECT COUNT(*) as auditorias_huerfanas
FROM calculation_audit ca
LEFT JOIN calculation c ON c.id = ca.calculation_id
WHERE c.id IS NULL;


-- 8.3 Estadísticas de uso de factores de emisión
-- ----------------------------------------------------------------------------
SELECT
  c.factor_hash,
  COUNT(*) as veces_usado,
  MIN(c.created_at) as primera_vez,
  MAX(c.created_at) as ultima_vez
FROM calculation c
GROUP BY c.factor_hash
ORDER BY veces_usado DESC;


-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================
/*

CÓMO CONECTARSE A LA BASE DE DATOS:

1. Si usas Docker:
   docker exec -it ecoestudiante-db-1 psql -U ecoestudiante -d ecoestudiante

2. Si usas PostgreSQL local:
   psql -h localhost -U ecoestudiante -d ecoestudiante

3. Comandos útiles de psql:
   \dt               -- Listar todas las tablas
   \d+ calculation   -- Ver estructura de tabla calculation
   \x                -- Activar modo expandido (mejor visualización)
   \x off            -- Desactivar modo expandido
   \timing           -- Mostrar tiempo de ejecución de queries
   \q                -- Salir

CÓMO EJECUTAR LAS QUERIES:

1. Copia y pega la query que necesites
2. Ajusta los parámetros según tu caso:
   - Fechas: '2025-01-01', '2025-12-31'
   - Emisiones: 5.0, 100.0
   - Username: 'testuser5'
   - Categoría: 'electricidad', 'transporte', 'residuos'

3. Para queries con parámetros variables, primero ejecuta las queries
   de exploración (Sección 1) para conocer los valores reales

EJEMPLOS DE TESTING DE FILTROS:

-- Probar filtro de fechas:
1. Ejecutar query 6.3 para ver rango de fechas disponible
2. Ejecutar query 3.1 con fechas dentro de ese rango
3. Verificar que solo retorna registros en ese rango

-- Probar filtro de emisiones:
1. Ejecutar query 6.3 para ver rango de emisiones disponible
2. Ejecutar query 3.2 con valores dentro de ese rango
3. Verificar que solo retorna registros en ese rango

-- Probar filtro combinado:
1. Ejecutar query 7.1 (la query completa)
2. Ir ajustando diferentes combinaciones de filtros
3. Verificar que los resultados sean consistentes

*/

-- ============================================================================
-- FIN DEL ARCHIVO
-- ============================================================================
