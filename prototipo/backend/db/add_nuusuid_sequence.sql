-- Crear secuencia para nuusuid
CREATE SEQUENCE IF NOT EXISTS nuusuari_seq START WITH 1;

-- Asignar la secuencia como valor por defecto para nuusuid
ALTER TABLE nuusuari 
ALTER COLUMN nuusuid SET DEFAULT LPAD(nextval('nuusuari_seq')::text, 40, '0');

-- Configurar valores por defecto para otros campos
ALTER TABLE nuusuari ALTER COLUMN nuusutelef SET DEFAULT '';
ALTER TABLE nuusuari ALTER COLUMN nuusuidbil SET DEFAULT '';
ALTER TABLE nuusuari ALTER COLUMN nuusuqrbil SET DEFAULT '';
ALTER TABLE nuusuari ALTER COLUMN nuusuultno SET DEFAULT 0;
ALTER TABLE nuusuari ALTER COLUMN nuusunivel SET DEFAULT 0;
ALTER TABLE nuusuari ALTER COLUMN nuusubajaf SET DEFAULT '0001-01-01'::timestamp;

-- Verificar la configuración
\d nuusuari
