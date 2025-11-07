-- Migración V11: Agregar factores de emisión para transporte
-- Factores basados en datos del IPCC y DEFRA (UK)

-- Crear versión de factores para transporte
-- Usamos DATE '9999-12-31' para indicar que está vigente indefinidamente (valid_to es NOT NULL)
INSERT INTO factor_version (source_id, scope, region_level, year, unit, valid_from, valid_to, hash)
SELECT
  'IPCC-2024', 'global', 'country', 2024, 'kgCO2e/km', DATE '2024-01-01', DATE '9999-12-31', 'transport-v1-2024'
WHERE NOT EXISTS (
  SELECT 1 FROM factor_version WHERE hash = 'transport-v1-2024'
);

-- Factores de emisión para transporte (kgCO2e por km)
-- Valores promedio globales, pueden ajustarse por país después

-- Auto - Gasolina
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'auto_gasolina', NULL, 0.120, 'kgCO2e/km', 'Auto promedio gasolina (1 pasajero)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Auto - Diésel
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'auto_diesel', NULL, 0.130, 'kgCO2e/km', 'Auto promedio diésel (1 pasajero)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Auto - Eléctrico
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'auto_electrico', NULL, 0.050, 'kgCO2e/km', 'Auto eléctrico (mix eléctrico promedio)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Auto - Híbrido
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'auto_hibrido', NULL, 0.080, 'kgCO2e/km', 'Auto híbrido (1 pasajero)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Motocicleta - Gasolina
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'motocicleta_gasolina', NULL, 0.113, 'kgCO2e/km', 'Motocicleta promedio gasolina'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Bus/Transporte Público
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'bus', NULL, 0.089, 'kgCO2e/km', 'Bus promedio (por pasajero, ocupación promedio)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Metro/Tren
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'metro', NULL, 0.014, 'kgCO2e/km', 'Metro/Tren eléctrico (por pasajero)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Bicicleta (0 emisiones directas, pero puede tener emisiones indirectas por fabricación)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'bicicleta', NULL, 0.000, 'kgCO2e/km', 'Bicicleta (0 emisiones directas)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Caminando (0 emisiones)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'caminando', NULL, 0.000, 'kgCO2e/km', 'Caminando (0 emisiones)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Avión (corto recorrido, por pasajero)
INSERT INTO emission_factor (version_id, category, subcategory, region_code, value, unit, notes)
SELECT id, 'transporte', 'avion', NULL, 0.255, 'kgCO2e/km', 'Avión corto recorrido (por pasajero)'
FROM factor_version WHERE hash = 'transport-v1-2024'
ON CONFLICT DO NOTHING;

-- Nota: Los factores pueden ajustarse por país/región agregando más registros con region_code específico

