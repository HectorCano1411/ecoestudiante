-- V3: Índice de idempotencia por usuario + idempotencyKey para categoría electricidad

-- Elimina si existe con ese nombre (seguro)
DROP INDEX IF EXISTS uq_calc_idem_electricidad;

-- Índice único parcial correcto
CREATE UNIQUE INDEX IF NOT EXISTS uq_calc_idem_electricidad
ON calculation (user_id, (input_json->>'idempotencyKey'))
WHERE category = 'electricidad';
