-- V8__add_user_fields_and_email_verification.sql
-- Agregar campos adicionales para registro de estudiantes
ALTER TABLE app_user 
ADD COLUMN IF NOT EXISTS carrera VARCHAR(100),
ADD COLUMN IF NOT EXISTS jornada VARCHAR(50),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMP;

-- Crear índice para búsqueda por token de verificación
CREATE INDEX IF NOT EXISTS idx_user_verification_token ON app_user(verification_token) WHERE verification_token IS NOT NULL;

-- Actualizar usuarios existentes para que tengan email verificado
UPDATE app_user SET email_verified = true WHERE email_verified IS NULL OR email_verified = false;

