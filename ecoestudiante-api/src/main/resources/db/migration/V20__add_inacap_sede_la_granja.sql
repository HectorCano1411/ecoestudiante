-- V20: Agregar Sede La Granja para INACAP
-- Fecha: 2025-12-08
-- Descripción: Agrega el campus "Sede La Granja" para el Instituto Profesional INACAP

-- Verificar que INACAP existe antes de insertar
INSERT INTO campus (id, institution_id, name, code, city, region, address, enabled, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    i.id,
    'Sede La Granja',
    'LA_GRANJA',
    'Santiago',
    'Región Metropolitana',
    'Av. La Granja 2000',
    true,
    now(),
    now()
FROM institution i 
WHERE i.code = 'IP_INACAP'
  AND NOT EXISTS (
    SELECT 1 FROM campus c 
    WHERE c.institution_id = i.id 
      AND c.code = 'LA_GRANJA'
  );
