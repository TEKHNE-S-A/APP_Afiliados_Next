-- seed.sql: datos de ejemplo para desarrollo

BEGIN;

-- Usuario demo
INSERT INTO users (id, username, email, password_hash, full_name, role)
VALUES (
  uuid_generate_v4(),
  'demo',
  'demo@example.com',
  null,
  'Usuario Demo',
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- Beneficiario demo
INSERT INTO beneficiaries (id, numero_afiliado, dni, nombre, apellido, fecha_nacimiento, parentesco, plan)
VALUES (
  uuid_generate_v4(),
  '123456789',
  '35123456',
  'Juan Carlos',
  'González',
  '1985-03-15',
  'Titular',
  'Premium Plus'
) ON CONFLICT (numero_afiliado) DO NOTHING;

COMMIT;
