-- V16: Agregar sistema de roles a usuarios
-- Fecha: 2025-11-30
-- Descripción: Agrega campo 'role' a la tabla app_user para control de acceso basado en roles

-- Agregar columna role a la tabla app_user
ALTER TABLE app_user
ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'STUDENT';

-- Crear índice para mejorar rendimiento en consultas por rol
CREATE INDEX idx_app_user_role ON app_user(role);

-- Comentario en la columna
COMMENT ON COLUMN app_user.role IS 'Rol del usuario: STUDENT, ADMIN, MODERATOR';

-- Opcional: Crear un usuario administrador de ejemplo (descomenta si lo necesitas)
-- UPDATE app_user SET role = 'ADMIN' WHERE email = 'admin@ecoestudiante.com';
