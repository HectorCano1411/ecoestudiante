-- V18: Crear tablas de instituciones educativas y campus
-- Fecha: 2025-12-08
-- Descripción: Crea tablas para gestionar instituciones educativas (Universidades, IP, CFT, Liceos TP) y sus campus

-- Tabla de tipos de instituciones
CREATE TYPE institution_type AS ENUM (
    'UNIVERSIDAD',
    'INSTITUTO_PROFESIONAL',
    'CENTRO_FORMACION_TECNICA',
    'LICEO_TECNICO_PROFESIONAL'
);

-- Tabla de instituciones educativas
CREATE TABLE institution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type institution_type NOT NULL,
    code VARCHAR(50) UNIQUE, -- Código único de la institución (ej: "UCH", "PUC")
    website VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Chile',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    created_by UUID REFERENCES app_user(id),
    updated_by UUID REFERENCES app_user(id)
);

-- Tabla de campus
CREATE TABLE campus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institution(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50), -- Código del campus (ej: "SEDE_SANTIAGO", "SEDE_VALPARAISO")
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10, 8), -- Para geolocalización
    longitude DECIMAL(11, 8), -- Para geolocalización
    phone VARCHAR(50),
    email VARCHAR(255),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    created_by UUID REFERENCES app_user(id),
    updated_by UUID REFERENCES app_user(id),
    CONSTRAINT unique_campus_code_per_institution UNIQUE (institution_id, code)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_institution_type ON institution(type);
CREATE INDEX idx_institution_enabled ON institution(enabled);
CREATE INDEX idx_institution_code ON institution(code);
CREATE INDEX idx_campus_institution_id ON campus(institution_id);
CREATE INDEX idx_campus_enabled ON campus(enabled);
CREATE INDEX idx_campus_city ON campus(city);
CREATE INDEX idx_campus_region ON campus(region);

-- Comentarios para documentación
COMMENT ON TABLE institution IS 'Instituciones educativas: Universidades, IP, CFT, Liceos TP';
COMMENT ON COLUMN institution.type IS 'Tipo de institución: UNIVERSIDAD, INSTITUTO_PROFESIONAL, CENTRO_FORMACION_TECNICA, LICEO_TECNICO_PROFESIONAL';
COMMENT ON COLUMN institution.code IS 'Código único de la institución (ej: UCH, PUC, INACAP)';
COMMENT ON TABLE campus IS 'Campus o sedes de las instituciones educativas';
COMMENT ON COLUMN campus.code IS 'Código único del campus dentro de la institución';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_institution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_institution_updated_at
    BEFORE UPDATE ON institution
    FOR EACH ROW
    EXECUTE FUNCTION update_institution_updated_at();

CREATE TRIGGER trigger_campus_updated_at
    BEFORE UPDATE ON campus
    FOR EACH ROW
    EXECUTE FUNCTION update_institution_updated_at();
