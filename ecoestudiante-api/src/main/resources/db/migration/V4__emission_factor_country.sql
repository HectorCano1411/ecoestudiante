-- V4: Soporte de país en emission_factor y ayudas de vigencia

-- 1) Agregar columna de país ISO-2 (mayúsculas). NULL = factor nacional/genérico
ALTER TABLE emission_factor
  ADD COLUMN IF NOT EXISTS country char(2);

-- 2) Normalizar a mayúsculas (si existieran valores ya insertados)
UPDATE emission_factor
SET country = upper(country)
WHERE country IS NOT NULL;

-- 3) Índice útil para búsquedas por categoría y país
CREATE INDEX IF NOT EXISTS ix_emission_factor_cat_country
  ON emission_factor (category, country);

-- 4) Índices de ayuda para vigencia en factor_version (si no existen)
CREATE INDEX IF NOT EXISTS ix_factor_version_valid_from ON factor_version (valid_from);
CREATE INDEX IF NOT EXISTS ix_factor_version_valid_to   ON factor_version (valid_to);
