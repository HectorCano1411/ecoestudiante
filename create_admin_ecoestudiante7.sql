-- =============================================================================
-- Script SQL para crear/actualizar usuario Administrador
-- Email: ecoestudiante7@gmail.com
-- Password: Inacap2025*-/
-- =============================================================================
-- 
-- IMPORTANTE: Este script crea el usuario pero con un hash temporal.
-- Para que funcione correctamente, necesitas:
--   1. Crear el usuario vía API de registro (genera hash correcto)
--   2. O iniciar sesión una vez para actualizar el hash
--
-- Uso:
--   docker exec -it eco-postgres-dev psql -U eco -d ecoestudiante -f create_admin_ecoestudiante7.sql
--   O copiar y pegar el contenido
-- =============================================================================

-- Verificar si el usuario ya existe
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id UUID;
BEGIN
    SELECT EXISTS(SELECT 1 FROM app_user WHERE email = 'ecoestudiante7@gmail.com' OR username = 'ecoestudiante7') INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE 'Usuario ecoestudiante7 ya existe. Actualizando a rol ADMIN...';
        
        -- Actualizar usuario existente a ADMIN
        UPDATE app_user 
        SET 
            role = 'ADMIN',
            enabled = true,
            email_verified = true
        WHERE email = 'ecoestudiante7@gmail.com' OR username = 'ecoestudiante7';
        
        RAISE NOTICE 'Usuario actualizado exitosamente a ADMIN';
    ELSE
        RAISE NOTICE 'Creando nuevo usuario administrador...';
        
        -- Crear nuevo usuario administrador
        -- NOTA: El password_hash es temporal. Necesitas actualizarlo usando:
        -- 1. El endpoint de registro del backend, o
        -- 2. Iniciar sesión una vez para que se actualice
        INSERT INTO app_user (
            username,
            email,
            password_hash,
            role,
            enabled,
            email_verified,
            carrera,
            jornada,
            created_at,
            updated_at
        ) VALUES (
            'ecoestudiante7',
            'ecoestudiante7@gmail.com',
            '$2a$10$placeholder_hash_will_be_updated',  -- Hash temporal - ACTUALIZAR
            'ADMIN',
            true,
            true,
            'Administración',
            'Completa',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Usuario administrador creado exitosamente';
        RAISE NOTICE '⚠️  IMPORTANTE: El password_hash es temporal.';
        RAISE NOTICE '   Actualiza el hash usando el backend o iniciando sesión una vez.';
    END IF;
END $$;

-- Verificar que se creó/actualizó correctamente
SELECT 
    id,
    username,
    email,
    role,
    enabled,
    email_verified,
    carrera,
    jornada,
    CASE 
        WHEN password_hash LIKE '%placeholder%' THEN 'Hash temporal - ACTUALIZAR'
        WHEN password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' THEN 'Hash válido'
        ELSE 'Verificar hash'
    END as hash_status,
    created_at
FROM app_user 
WHERE email = 'ecoestudiante7@gmail.com' OR username = 'ecoestudiante7';

-- Mostrar todos los administradores
SELECT 
    id,
    username,
    email,
    role,
    enabled,
    email_verified
FROM app_user 
WHERE role = 'ADMIN'
ORDER BY created_at DESC;

-- =============================================================================
-- CREDENCIALES:
-- =============================================================================
-- Username: ecoestudiante7
-- Email: ecoestudiante7@gmail.com
-- Password: Inacap2025*-/
-- Rol: ADMIN
-- =============================================================================
-- 
-- NOTA: Si el hash es temporal, actualízalo:
--   1. Usando el endpoint: POST /api/v1/auth/register
--   2. O iniciando sesión una vez (el sistema actualizará el hash)
-- =============================================================================
