-- V21: Agregar institución y campus a usuarios
-- Fecha: 2025-12-08
-- Descripción: Agrega campos institution_id y campus_id a app_user para asociar estudiantes con instituciones y campus

-- Agregar columnas para institución y campus
ALTER TABLE app_user
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institution(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES campus(id) ON DELETE SET NULL;

-- Crear índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_user_institution_id ON app_user(institution_id);
CREATE INDEX IF NOT EXISTS idx_user_campus_id ON app_user(campus_id);

-- Agregar comentarios para documentación
COMMENT ON COLUMN app_user.institution_id IS 'ID de la institución educativa a la que pertenece el estudiante';
COMMENT ON COLUMN app_user.campus_id IS 'ID del campus/sede de la institución donde estudia el estudiante';

-- NOTA: Los campos son NULL por defecto para usuarios existentes
-- Los nuevos registros de estudiantes deberán proporcionar estos valores
