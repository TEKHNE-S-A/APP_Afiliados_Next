-- Schema inicial para APP_Afiliados (PostgreSQL)
-- Ejecutar con: psql -h <HOST> -U <USER> -d <DB> -f schema.sql

BEGIN;

-- Extension para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios (autenticación básica / perfil)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(150) UNIQUE NOT NULL,
  email VARCHAR(255),
  password_hash TEXT, -- en producción: almacenar hash (bcrypt/argon2)
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Beneficiarios (tabla base para datos de afiliados)
CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_afiliado VARCHAR(50) UNIQUE,
  dni VARCHAR(50),
  nombre VARCHAR(150),
  apellido VARCHAR(150),
  fecha_nacimiento DATE,
  parentesco VARCHAR(80),
  plan VARCHAR(120),
  vigencia_desde DATE,
  foto_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trámites (solicitudes realizadas por usuarios)
CREATE TABLE IF NOT EXISTS tramites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(150) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'Pendiente',
  fecha DATE DEFAULT CURRENT_DATE,
  usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
  beneficiario_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transacciones / Movimientos financieros
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ARS',
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
  external_ref VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de configuración centralizada (opcional)
-- Aquí podríamos guardar endpoints si se quiere guardarlos en DB en lugar de config.json
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auditar cambios simples
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity TEXT,
  entity_id UUID,
  action VARCHAR(50),
  payload JSONB,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMIT;

-- Índices sugeridos
CREATE INDEX IF NOT EXISTS idx_beneficiaries_numero_afiliado ON beneficiaries(numero_afiliado);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_tramites_estado ON tramites(estado);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
