CREATE TABLE IF NOT EXISTS emission_factor (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES factor_version(id),
  category TEXT NOT NULL,
  subcategory TEXT,
  region_code TEXT,
  value NUMERIC(18,8) NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT
);

-- Seed de ejemplo (luego lo reemplazas por tu CSV real)
INSERT INTO factor_version (source_id,scope,region_level,year,unit,valid_from,valid_to,hash)
VALUES ('SEN-CL-2024','national','comuna',2024,'kgCO2e/kWh','2024-01-01','2024-12-31','demo-abc123')
ON CONFLICT DO NOTHING;

INSERT INTO emission_factor (version_id,category,subcategory,region_code,value,unit,notes)
SELECT id,'electricidad',NULL,NULL,0.45,'kgCO2e/kWh','demo factor'
FROM factor_version WHERE source_id='SEN-CL-2024' AND hash='demo-abc123'
ON CONFLICT DO NOTHING;
