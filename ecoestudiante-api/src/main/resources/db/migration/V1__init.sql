-- V1__init.sql
CREATE TABLE IF NOT EXISTS factor_version (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  region_level TEXT NOT NULL,
  year INTEGER NOT NULL,
  unit TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calculation (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  input_json JSONB NOT NULL,
  result_kg_co2e NUMERIC(18,6) NOT NULL,
  factor_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calculation_audit (
  id UUID PRIMARY KEY,
  calculation_id UUID NOT NULL REFERENCES calculation(id),
  factor_snapshot JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkin (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_job (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL,
  params JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
