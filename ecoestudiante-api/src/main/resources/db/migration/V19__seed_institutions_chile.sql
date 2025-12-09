-- V19: Seed de instituciones educativas chilenas
-- Fecha: 2025-12-08
-- Descripción: Inserta las principales instituciones educativas de Chile con sus campus principales

-- Universidades
INSERT INTO institution (id, name, type, code, website, city, region, country) VALUES
-- Universidades Estatales
(gen_random_uuid(), 'Universidad de Chile', 'UNIVERSIDAD', 'UCH', 'https://www.uchile.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad de Santiago de Chile', 'UNIVERSIDAD', 'USACH', 'https://www.usach.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad de Concepción', 'UNIVERSIDAD', 'UDEC', 'https://www.udec.cl', 'Concepción', 'Región del Biobío', 'Chile'),
(gen_random_uuid(), 'Universidad Técnica Federico Santa María', 'UNIVERSIDAD', 'UTFSM', 'https://www.usm.cl', 'Valparaíso', 'Región de Valparaíso', 'Chile'),
(gen_random_uuid(), 'Universidad de Valparaíso', 'UNIVERSIDAD', 'UV', 'https://www.uv.cl', 'Valparaíso', 'Región de Valparaíso', 'Chile'),
(gen_random_uuid(), 'Universidad de Talca', 'UNIVERSIDAD', 'UTALCA', 'https://www.utalca.cl', 'Talca', 'Región del Maule', 'Chile'),
(gen_random_uuid(), 'Universidad de La Frontera', 'UNIVERSIDAD', 'UFRO', 'https://www.ufro.cl', 'Temuco', 'Región de La Araucanía', 'Chile'),
(gen_random_uuid(), 'Universidad de Antofagasta', 'UNIVERSIDAD', 'UANT', 'https://www.uantof.cl', 'Antofagasta', 'Región de Antofagasta', 'Chile'),
(gen_random_uuid(), 'Universidad de Tarapacá', 'UNIVERSIDAD', 'UTA', 'https://www.uta.cl', 'Arica', 'Región de Arica y Parinacota', 'Chile'),
(gen_random_uuid(), 'Universidad de Atacama', 'UNIVERSIDAD', 'UDA', 'https://www.uda.cl', 'Copiapó', 'Región de Atacama', 'Chile'),
(gen_random_uuid(), 'Universidad de La Serena', 'UNIVERSIDAD', 'ULS', 'https://www.userena.cl', 'La Serena', 'Región de Coquimbo', 'Chile'),
(gen_random_uuid(), 'Universidad del Bío-Bío', 'UNIVERSIDAD', 'UBB', 'https://www.ubb.cl', 'Concepción', 'Región del Biobío', 'Chile'),
(gen_random_uuid(), 'Universidad de Los Lagos', 'UNIVERSIDAD', 'ULAGOS', 'https://www.ulagos.cl', 'Osorno', 'Región de Los Lagos', 'Chile'),
(gen_random_uuid(), 'Universidad de Magallanes', 'UNIVERSIDAD', 'UMAG', 'https://www.umag.cl', 'Punta Arenas', 'Región de Magallanes', 'Chile'),
(gen_random_uuid(), 'Universidad Arturo Prat', 'UNIVERSIDAD', 'UNAP', 'https://www.unap.cl', 'Iquique', 'Región de Tarapacá', 'Chile'),

-- Universidades Privadas
(gen_random_uuid(), 'Pontificia Universidad Católica de Chile', 'UNIVERSIDAD', 'PUC', 'https://www.uc.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad Adolfo Ibáñez', 'UNIVERSIDAD', 'UAI', 'https://www.uai.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad Diego Portales', 'UNIVERSIDAD', 'UDP', 'https://www.udp.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad del Desarrollo', 'UNIVERSIDAD', 'UDD', 'https://www.udd.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad Andrés Bello', 'UNIVERSIDAD', 'UNAB', 'https://www.unab.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad Finis Terrae', 'UNIVERSIDAD', 'UFT', 'https://www.uft.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad Mayor', 'UNIVERSIDAD', 'UMAYOR', 'https://www.umayor.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Universidad San Sebastián', 'UNIVERSIDAD', 'USS', 'https://www.uss.cl', 'Santiago', 'Región Metropolitana', 'Chile'),

-- Institutos Profesionales
(gen_random_uuid(), 'Instituto Profesional INACAP', 'INSTITUTO_PROFESIONAL', 'IP_INACAP', 'https://www.inacap.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Instituto Profesional DUOC UC', 'INSTITUTO_PROFESIONAL', 'IP_DUOC', 'https://www.duoc.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Instituto Profesional Santo Tomás', 'INSTITUTO_PROFESIONAL', 'IP_ST', 'https://www.santotomas.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Instituto Profesional AIEP', 'INSTITUTO_PROFESIONAL', 'IP_AIEP', 'https://www.aiep.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Instituto Profesional Virginio Gómez', 'INSTITUTO_PROFESIONAL', 'IP_VG', 'https://www.virginiogomez.cl', 'Concepción', 'Región del Biobío', 'Chile'),
(gen_random_uuid(), 'Instituto Profesional Los Leones', 'INSTITUTO_PROFESIONAL', 'IP_LL', 'https://www.losleones.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Instituto Profesional Providencia', 'INSTITUTO_PROFESIONAL', 'IP_PROV', 'https://www.providencia.cl', 'Santiago', 'Región Metropolitana', 'Chile'),

-- Centros de Formación Técnica
(gen_random_uuid(), 'Centro de Formación Técnica INACAP', 'CENTRO_FORMACION_TECNICA', 'CFT_INACAP', 'https://www.inacap.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Centro de Formación Técnica Santo Tomás', 'CENTRO_FORMACION_TECNICA', 'CFT_ST', 'https://www.santotomas.cl', 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Centro de Formación Técnica CEDUC UCN', 'CENTRO_FORMACION_TECNICA', 'CFT_CEDUC', 'https://www.ceduc.cl', 'Antofagasta', 'Región de Antofagasta', 'Chile'),
(gen_random_uuid(), 'Centro de Formación Técnica PUCV', 'CENTRO_FORMACION_TECNICA', 'CFT_PUCV', 'https://www.cft.pucv.cl', 'Valparaíso', 'Región de Valparaíso', 'Chile'),
(gen_random_uuid(), 'Centro de Formación Técnica Lota Arauco', 'CENTRO_FORMACION_TECNICA', 'CFT_LOTA', 'https://www.cftlota.cl', 'Lota', 'Región del Biobío', 'Chile'),
(gen_random_uuid(), 'Centro de Formación Técnica ENAC', 'CENTRO_FORMACION_TECNICA', 'CFT_ENAC', 'https://www.enac.cl', 'Santiago', 'Región Metropolitana', 'Chile'),

-- Liceos Técnico Profesionales (Principales)
(gen_random_uuid(), 'Liceo Técnico Profesional Industrial', 'LICEO_TECNICO_PROFESIONAL', 'LTP_INDUSTRIAL', NULL, 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Liceo Técnico Profesional Comercial', 'LICEO_TECNICO_PROFESIONAL', 'LTP_COMERCIAL', NULL, 'Santiago', 'Región Metropolitana', 'Chile'),
(gen_random_uuid(), 'Liceo Técnico Profesional Agrícola', 'LICEO_TECNICO_PROFESIONAL', 'LTP_AGRICOLA', NULL, 'Santiago', 'Región Metropolitana', 'Chile')
ON CONFLICT (code) DO NOTHING;

-- Insertar campus principales para algunas instituciones (ejemplos)
-- Universidad de Chile - Campus principales
INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Campus Casa Central',
    'CASA_CENTRAL',
    'Santiago',
    'Región Metropolitana',
    'Av. Libertador Bernardo O''Higgins 1058'
FROM institution i WHERE i.code = 'UCH';

INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Campus Juan Gómez Millas',
    'JGM',
    'Santiago',
    'Región Metropolitana',
    'Av. Grecia 3401'
FROM institution i WHERE i.code = 'UCH';

-- INACAP - Campus principales
INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Sede Santiago Centro',
    'SANTIAGO_CENTRO',
    'Santiago',
    'Región Metropolitana',
    'Av. Ejército 146'
FROM institution i WHERE i.code = 'IP_INACAP';

INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Sede Valparaíso',
    'VALPARAISO',
    'Valparaíso',
    'Región de Valparaíso',
    'Av. España 2250'
FROM institution i WHERE i.code = 'IP_INACAP';

INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Sede Concepción',
    'CONCEPCION',
    'Concepción',
    'Región del Biobío',
    'Av. Collao 1202'
FROM institution i WHERE i.code = 'IP_INACAP';

-- DUOC UC - Campus principales
INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Sede San Carlos de Apoquindo',
    'SAN_CARLOS',
    'Santiago',
    'Región Metropolitana',
    'Av. San Carlos de Apoquindo 2200'
FROM institution i WHERE i.code = 'IP_DUOC';

INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Sede Valparaíso',
    'VALPARAISO',
    'Valparaíso',
    'Región de Valparaíso',
    'Av. Brasil 2161'
FROM institution i WHERE i.code = 'IP_DUOC';

-- PUC - Campus principales
INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Campus San Joaquín',
    'SAN_JOAQUIN',
    'Santiago',
    'Región Metropolitana',
    'Av. Vicuña Mackenna 4860'
FROM institution i WHERE i.code = 'PUC';

INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Campus Casa Central',
    'CASA_CENTRAL',
    'Santiago',
    'Región Metropolitana',
    'Av. Alameda 340'
FROM institution i WHERE i.code = 'PUC';

-- Universidad de Concepción - Campus principales
INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Campus Concepción',
    'CONCEPCION',
    'Concepción',
    'Región del Biobío',
    'Av. Víctor Lamas 1290'
FROM institution i WHERE i.code = 'UDEC';

INSERT INTO campus (id, institution_id, name, code, city, region, address)
SELECT 
    gen_random_uuid(),
    i.id,
    'Campus Los Ángeles',
    'LOS_ANGELES',
    'Los Ángeles',
    'Región del Biobío',
    'Juan Antonio Coloma 0201'
FROM institution i WHERE i.code = 'UDEC';
