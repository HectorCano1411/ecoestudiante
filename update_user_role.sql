-- Script para actualizar el rol de un usuario a ADMIN
-- Uso: Ejecutar en pgAdmin o psql conectado a la base de datos ecoestudiante

-- Verificar el usuario actual
SELECT id, username, email, role, enabled, email_verified 
FROM app_user 
WHERE email = 'ecoestudiante7@gmail.com';

-- Actualizar el rol a ADMIN
UPDATE app_user 
SET role = 'ADMIN' 
WHERE email = 'ecoestudiante7@gmail.com';

-- Verificar que se actualizó correctamente
SELECT id, username, email, role, enabled, email_verified 
FROM app_user 
WHERE email = 'ecoestudiante7@gmail.com';

-- IMPORTANTE: Después de actualizar el rol, el usuario debe:
-- 1. Cerrar sesión completamente
-- 2. Iniciar sesión nuevamente para obtener un nuevo token JWT con el rol ADMIN
-- 3. El token anterior no tendrá el rol actualizado






