-- V10__add_google_oauth_fields.sql
-- Agregar campos para autenticación con Google OAuth2
ALTER TABLE app_user 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS picture_url VARCHAR(500);

-- Crear índice para búsqueda por Google ID
CREATE INDEX IF NOT EXISTS idx_user_google_id ON app_user(google_id) WHERE google_id IS NOT NULL;

-- Crear índice para auth_provider
CREATE INDEX IF NOT EXISTS idx_user_auth_provider ON app_user(auth_provider);

-- Actualizar usuarios existentes para que tengan auth_provider = 'local'
UPDATE app_user SET auth_provider = 'local' WHERE auth_provider IS NULL;

