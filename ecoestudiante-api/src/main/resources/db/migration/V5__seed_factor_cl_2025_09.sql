-- V5: Semilla de ejemplo para electricidad CL válida desde 2025-09-01
-- Ajustada al esquema real (factor_version con PK entero y campos NOT NULL)

-- 1) Inserta la versión si no existe (identificada por hash)
INSERT INTO factor_version (
  source_id,  scope,        region_level, year,
  unit,       valid_from,   valid_to,     hash
)
SELECT
  'demo-source-cl', 'national', 'country', 2025,
  'kgCO2e/kWh', DATE '2025-09-01', DATE '9999-12-31', 'demo-abc123-cl-2025-09'
WHERE NOT EXISTS (
  SELECT 1 FROM factor_version WHERE hash = 'demo-abc123-cl-2025-09'
);

-- 2) Inserta el factor electricidad CL para esa versión si no existe ya
INSERT INTO emission_factor (
  version_id, category, value, unit, country
)
SELECT
  fv.id, 'electricidad', 0.470, 'kgCO2e/kWh', 'CL'
FROM factor_version fv
WHERE fv.hash = 'demo-abc123-cl-2025-09'
  AND NOT EXISTS (
    SELECT 1
    FROM emission_factor ef
    JOIN factor_version fv2 ON fv2.id = ef.version_id
    WHERE ef.category = 'electricidad'
      AND ef.country  = 'CL'
      AND fv2.hash    = 'demo-abc123-cl-2025-09'
  );
