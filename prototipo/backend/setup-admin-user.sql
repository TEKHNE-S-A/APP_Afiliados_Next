-- Setup Admin User SQL
-- Crear usuario admin@test.local si no existe
-- Ejecutar: psql -h localhost -U postgres -d app_afiliados_genexus -f setup-admin-user.sql

-- 1. Crear usuario si no existe  
DO $$
DECLARE
  v_nuusuid VARCHAR(100);
  v_email VARCHAR(255) := 'admin@test.local';
  v_nombre VARCHAR(255) := 'ADMIN TEST';
  v_password_hash VARCHAR(256) := '6b8e9c8df4a2b1c3:c5e8a1f9d7b6c4e2a3f8d9c1b7e6a4f5d8c2b9e1a7f6c4d3e8b2a9f1c7e6d4b3a8f9c2e1d7b6a5f4c3e2d8b1a9f7c6e4d3b2a1f8c5e9d4b7a6f3c2e1d8b9a7f5c4e3d2b6a1f9c8e7d5b4a3f2c1e8d9b7a6f4c3e2d1b5a9';
  v_exists INT;
BEGIN
  -- Verificar si ya existe
  SELECT COUNT(*) INTO v_exists FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = LOWER(v_email);
  
  IF v_exists = 0 THEN
    -- Crear en nuusuari
    INSERT INTO nuusuari (
      nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
      nuusuapell, nuusuestit, nuusutelef, nuusumail,
      nuusubille, nuusuidbil, nuusumailf, nuusuacept,
      nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel
    ) VALUES (
      '', NULL, NOW(), '', NULL,
      v_nombre, NULL, '', v_email,
      'N', '', NOW(), 'S',
      '', 0, '0001-01-01'::timestamp, 0
    ) RETURNING nuusuid INTO v_nuusuid;
    
    -- Crear contraseña en nuusuauth (hash de "admin123")
    INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
    VALUES (v_nuusuid, v_password_hash, NOW(), NOW());
    
    RAISE NOTICE 'Usuario creado: % (nuusuid: %)', v_email, v_nuusuid;
  ELSE
    -- Obtener nuusuid existente
    SELECT nuusuid INTO v_nuusuid FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = LOWER(v_email) LIMIT 1;
    
    -- Actualizar contraseña
    INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
    VALUES (v_nuusuid, v_password_hash, NOW(), NOW())
    ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = v_password_hash, nuusuultm = NOW();
    
    RAISE NOTICE 'Usuario ya existe: % (nuusuid: %)', v_email, v_nuusuid;
  END IF;
  
  -- Agregar a lista de admins en nusispar
  INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
  VALUES ('SEGURIDAD_APP', 'BackendAdminEmails', v_email, 'Emails de administradores del backend')
  ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE 
  SET nusisvalpa = CASE 
    WHEN nusispar.nusisvalpa LIKE '%' || v_email || '%' THEN nusispar.nusisvalpa
    ELSE nusispar.nusisvalpa || ', ' || v_email
  END;
  
  RAISE NOTICE 'Admin configurado en nusispar';
END $$;

-- Verificar resultado
SELECT nuusuid, nuusumail, nuusuapell 
FROM nuusuari 
WHERE LOWER(TRIM(nuusumail)) = 'admin@test.local';

SELECT nusisvalpa as admin_emails
FROM nusispar
WHERE nusisgrupa = 'SEGURIDAD_APP' AND nusistippa = 'BackendAdminEmails';
