-- V13__make_password_hash_nullable_for_auth0.sql
--
-- PROBLEMA: Usuarios de Auth0 no tienen password_hash (usan OAuth2)
-- SOLUCIÓN: Hacer password_hash nullable para soportar autenticación dual
--
-- Autenticación Dual:
-- - JWT tradicional: requiere password_hash (NOT NULL)
-- - Auth0 (Google, etc.): NO requiere password_hash (puede ser NULL)

ALTER TABLE app_user
ALTER COLUMN password_hash DROP NOT NULL;

-- Verificación: Usuarios Auth0 existentes ahora pueden insertarse sin password_hash
COMMENT ON COLUMN app_user.password_hash IS 'Password hash BCrypt. NULL para usuarios Auth0 (OAuth2), NOT NULL para usuarios JWT tradicionales';
