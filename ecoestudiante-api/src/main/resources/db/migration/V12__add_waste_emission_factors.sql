-- Migración V12: Agregar factores de emisión para residuos/desechos
-- Metodología Híbrida (EPA WARM + GHG Protocol)
-- Factores basados en datos de EPA WARM (USA) y DEFRA (UK) ajustados para Latinoamérica

-- Crear versión de factores para residuos
INSERT INTO factor_version (source_id, scope, region_level, year, unit, valid_from, valid_to, hash)
SELECT
  'EPA-WARM-2024', 'global', 'country', 2024, 'kgCO2e/kg', DATE '2024-01-01', DATE '9999-12-31', 'waste-v1-2024'
WHERE NOT EXISTS (
  SELECT 1 FROM factor_version WHERE hash = 'waste-v1-2024'
);

-- ===========================================================================
-- FACTORES DE EMISIÓN PARA RESIDUOS
-- ===========================================================================
-- Estructura de subcategoría: {wasteType}_{disposalMethod}
-- Tipos: organic, paper, plastic, glass, metal, other
-- Métodos: mixed, recycling, composting, landfill
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. RESIDUOS ORGÁNICOS (organic)
-- ---------------------------------------------------------------------------

-- Orgánicos - Gestión Mixta (promedio: 60% relleno, 30% compostaje, 10% reciclaje)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'organic_mixed', 'CL', 0.40, 'kgCO2e/kg',
  'Orgánicos gestión mixta Chile (60% relleno, 30% compost, 10% otros)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Orgánicos - Reciclaje (N/A pero incluido para completitud)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'organic_recycling', 'CL', 0.40, 'kgCO2e/kg',
  'Orgánicos reciclaje (equivalente a mixed para orgánicos)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Orgánicos - Compostaje (beneficio por reducción de metano y producción de compost)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'organic_composting', 'CL', -0.10, 'kgCO2e/kg',
  'Orgánicos compostaje (NEGATIVO = beneficio ambiental por reducción de metano)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Orgánicos - Relleno Sanitario (genera metano, alto impacto)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'organic_landfill', 'CL', 0.65, 'kgCO2e/kg',
  'Orgánicos a relleno sanitario (generación de metano CH4)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. PAPEL Y CARTÓN (paper)
-- ---------------------------------------------------------------------------

-- Papel - Gestión Mixta (promedio: 50% relleno, 40% reciclaje, 10% otros)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'paper_mixed', 'CL', 0.35, 'kgCO2e/kg',
  'Papel/Cartón gestión mixta Chile (50% relleno, 40% reciclaje)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Papel - Reciclaje (gran beneficio por evitar tala de árboles y producción)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'paper_recycling', 'CL', -1.20, 'kgCO2e/kg',
  'Papel/Cartón reciclado (NEGATIVO = evita emisiones de producción nueva)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Papel - Compostaje (N/A generalmente, usar mixed)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'paper_composting', 'CL', 0.35, 'kgCO2e/kg',
  'Papel/Cartón compostaje (equivalente a mixed)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Papel - Relleno Sanitario
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'paper_landfill', 'CL', 0.90, 'kgCO2e/kg',
  'Papel/Cartón a relleno sanitario (descomposición anaeróbica)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. PLÁSTICOS (plastic)
-- ---------------------------------------------------------------------------

-- Plástico - Gestión Mixta (promedio: 70% relleno, 15% reciclaje, 15% incineración)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'plastic_mixed', 'CL', 0.45, 'kgCO2e/kg',
  'Plásticos gestión mixta Chile (70% relleno, 15% reciclaje, 15% incineración)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Plástico - Reciclaje (beneficio significativo por evitar producción de plástico virgen)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'plastic_recycling', 'CL', -0.80, 'kgCO2e/kg',
  'Plásticos reciclados (NEGATIVO = evita producción de plástico virgen)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Plástico - Compostaje (N/A para la mayoría de plásticos convencionales)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'plastic_composting', 'CL', 0.45, 'kgCO2e/kg',
  'Plásticos compostaje (solo bioplásticos, equivalente a mixed para convencionales)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Plástico - Relleno Sanitario
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'plastic_landfill', 'CL', 0.50, 'kgCO2e/kg',
  'Plásticos a relleno sanitario (persistencia larga, baja degradación)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. VIDRIO (glass)
-- ---------------------------------------------------------------------------

-- Vidrio - Gestión Mixta (promedio: 60% relleno, 30% reciclaje, 10% otros)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'glass_mixed', 'CL', 0.20, 'kgCO2e/kg',
  'Vidrio gestión mixta Chile (60% relleno, 30% reciclaje)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Vidrio - Reciclaje (beneficio moderado por reducción de temperatura de fusión)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'glass_recycling', 'CL', -0.40, 'kgCO2e/kg',
  'Vidrio reciclado (NEGATIVO = reduce energía de fusión)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Vidrio - Compostaje (N/A)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'glass_composting', 'CL', 0.20, 'kgCO2e/kg',
  'Vidrio compostaje (N/A, equivalente a mixed)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Vidrio - Relleno Sanitario (inerte, bajo impacto directo)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'glass_landfill', 'CL', 0.25, 'kgCO2e/kg',
  'Vidrio a relleno sanitario (material inerte, impacto bajo)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. METALES (metal)
-- ---------------------------------------------------------------------------

-- Metal - Gestión Mixta (promedio: 50% relleno, 40% reciclaje, 10% otros)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'metal_mixed', 'CL', 0.30, 'kgCO2e/kg',
  'Metales gestión mixta Chile (50% relleno, 40% reciclaje)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Metal - Reciclaje (GRAN beneficio por evitar minería y fundición)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'metal_recycling', 'CL', -2.50, 'kgCO2e/kg',
  'Metales reciclados (NEGATIVO = evita minería y producción primaria, mayor beneficio)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Metal - Compostaje (N/A)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'metal_composting', 'CL', 0.30, 'kgCO2e/kg',
  'Metales compostaje (N/A, equivalente a mixed)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Metal - Relleno Sanitario
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'metal_landfill', 'CL', 0.35, 'kgCO2e/kg',
  'Metales a relleno sanitario (oxidación y lixiviación)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. OTROS RESIDUOS (other)
-- ---------------------------------------------------------------------------

-- Otros - Gestión Mixta (promedio genérico)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'other_mixed', 'CL', 0.50, 'kgCO2e/kg',
  'Otros residuos gestión mixta (textiles, caucho, residuos peligrosos, etc.)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Otros - Reciclaje
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'other_recycling', 'CL', 0.50, 'kgCO2e/kg',
  'Otros residuos reciclaje (equivalente a mixed para categoría genérica)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Otros - Compostaje
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'other_composting', 'CL', 0.50, 'kgCO2e/kg',
  'Otros residuos compostaje (equivalente a mixed)'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- Otros - Relleno Sanitario
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'residuos', 'other_landfill', 'CL', 0.55, 'kgCO2e/kg',
  'Otros residuos a relleno sanitario'
FROM factor_version WHERE hash = 'waste-v1-2024'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- NOTAS METODOLÓGICAS
-- ===========================================================================
--
-- Factores negativos (ej: -1.20) indican BENEFICIO AMBIENTAL:
-- - Reciclaje de papel evita tala de árboles y producción nueva
-- - Reciclaje de metales evita minería y fundición primaria
-- - Compostaje de orgánicos evita emisiones de metano en rellenos
--
-- Gestión Mixta asume porcentajes realistas según estadísticas de Chile 2023:
-- - 60-70% relleno sanitario
-- - 15-30% reciclaje
-- - 10-15% otros (incineración, compostaje, vertederos ilegales)
--
-- Referencias:
-- - EPA WARM v15 (2020): https://www.epa.gov/warm
-- - DEFRA GHG Conversion Factors (2024)
-- - Ministerio del Medio Ambiente Chile - Estadísticas de Residuos 2023
-- - GHG Protocol - Waste Calculation Tool
-- ===========================================================================
