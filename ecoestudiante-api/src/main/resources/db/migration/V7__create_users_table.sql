-- V7__create_users_table.sql
CREATE TABLE IF NOT EXISTS app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_username ON app_user(username);
CREATE INDEX IF NOT EXISTS idx_user_email ON app_user(email);

-- Usuario de prueba (password: admin123)
-- Password hash generado con BCrypt para "admin123"
INSERT INTO app_user (username, email, password_hash, enabled)
VALUES ('admin', 'admin@ecoestudiante.com', '$2b$12$H364HMGB0vK6Z/fDIfoicO6PfbNemwzd.dfT0vvzPs.8UY286PT7y', true)
ON CONFLICT (username) DO NOTHING;

-- Usuario de prueba (password: user123)
-- Password hash generado con BCrypt para "user123"
INSERT INTO app_user (username, email, password_hash, enabled)
VALUES ('usuario', 'usuario@ecoestudiante.com', '$2b$12$1NTQvBSSmolobg1oHSvnT.N3V5urD0O9ib.P5/OviZZEK6p32l4J.', true)
ON CONFLICT (username) DO NOTHING;

