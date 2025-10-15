-- V6: Factor nacional (country = NULL) vigente desde 2025-01-01 en adelante
-- Esquema real: factor_version (PK entera, valid_to NOT NULL)

-- 1) Inserta versión 2025 si no existe (identificada por hash)
INSERT INTO factor_version (
  source_id,  scope,        region_level, year,
  unit,       valid_from,   valid_to,     hash
)
SELECT
  'demo-source-national', 'national', 'country', 2025,
  'kgCO2e/kWh', DATE '2025-01-01', DATE '9999-12-31', 'demo-abc123-national-2025'
WHERE NOT EXISTS (
  SELECT 1 FROM factor_version WHERE hash = 'demo-abc123-national-2025'
);

-- 2) Inserta el factor nacional 2025 (country = NULL) si no existe
INSERT INTO emission_factor (
  version_id, category, value, unit, country
)
SELECT
  fv.id, 'electricidad', 0.450, 'kgCO2e/kWh', NULL
FROM factor_version fv
WHERE fv.hash = 'demo-abc123-national-2025'
  AND NOT EXISTS (
    SELECT 1
    FROM emission_factor ef
    JOIN factor_version fv2 ON fv2.id = ef.version_id
    WHERE ef.category = 'electricidad'
      AND ef.country  IS NULL
      AND fv2.hash    = 'demo-abc123-national-2025'
  );
