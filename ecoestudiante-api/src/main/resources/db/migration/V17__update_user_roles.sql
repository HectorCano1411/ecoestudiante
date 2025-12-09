-- V17: Actualizar roles de usuarios
-- Fecha: 2025-01-XX
-- Descripción: Actualiza los roles existentes y agrega soporte para SUPER_ADMIN, ADMIN, PROFESOR, ESTUDIANTE

-- Actualizar roles existentes
-- ADMIN -> ADMIN (sin cambios)
-- MODERATOR -> ADMIN (convertir moderadores a admin)
-- STUDENT -> ESTUDIANTE (normalizar a español)
UPDATE app_user 
SET role = 'ADMIN' 
WHERE role = 'MODERATOR';

UPDATE app_user 
SET role = 'ESTUDIANTE' 
WHERE role = 'STUDENT' OR role IS NULL;

-- Agregar constraint para validar roles válidos
ALTER TABLE app_user 
DROP CONSTRAINT IF EXISTS check_user_role;

ALTER TABLE app_user 
ADD CONSTRAINT check_user_role 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'PROFESOR', 'ESTUDIANTE'));

-- Actualizar comentario de la columna
COMMENT ON COLUMN app_user.role IS 'Rol del usuario: SUPER_ADMIN, ADMIN, PROFESOR, ESTUDIANTE';

