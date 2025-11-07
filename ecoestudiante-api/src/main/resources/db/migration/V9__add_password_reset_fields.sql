-- V9__add_password_reset_fields.sql
-- Agregar campos para recuperación de contraseña
ALTER TABLE app_user 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Crear índice para búsqueda por token de reset
CREATE INDEX IF NOT EXISTS idx_user_reset_token ON app_user(reset_token) WHERE reset_token IS NOT NULL;

