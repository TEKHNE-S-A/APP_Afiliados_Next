-- Script: Agregar constraints de integridad referencial y UNIQUE
-- Propósito: Ítem 4 (UNIQUE) + Ítem 6 (FK con ON DELETE CASCADE)
-- Fecha: 05/05/2026

-- ============================================================================
-- ÍTEM 4: UNIQUE constraints (prevenir duplicados)
-- ============================================================================

-- Agregar UNIQUE en nuusumail (email)
-- Esto previene que dos usuarios se registren con el mismo email
ALTER TABLE public.nuusuari
	ADD CONSTRAINT nuusuari_nuusumail_unique UNIQUE (nuusumail);
COMMENT ON CONSTRAINT nuusuari_nuusumail_unique ON public.nuusuari 
	IS 'Email debe ser único por usuario (previene duplicados en login)';

-- Agregar UNIQUE en crcrecuil (CUIL en credenciales)
-- Esto previene que dos credenciales tengan el mismo CUIL (aunque sea poco probable)
ALTER TABLE public.crcreden
	ADD CONSTRAINT crcreden_crcrecuil_unique UNIQUE (crcrecuil);
COMMENT ON CONSTRAINT crcreden_crcrecuil_unique ON public.crcreden 
	IS 'CUIL debe ser único por credencial (integridad de datos)';

-- ============================================================================
-- ÍTEM 6: FK con política ON DELETE CASCADE
-- ============================================================================

-- Agregar FK en nuusuauth.nuusuid → nuusuari.nuusuid (ya existe en create_nuusuauth_table.sql)
-- Se valida pero ya está creada correctamente con ON DELETE CASCADE
-- Si esta tabla fue recreada, la FK ya está en place.

-- Agregar FK en crcredus.nuusuid → nuusuari.nuusuid ON DELETE CASCADE
-- Si ya existe, removerla primero (con manejo de error)
BEGIN;
	ALTER TABLE public.crcredus
		DROP CONSTRAINT IF EXISTS crcredus_nuusuid_fkey;
	
	ALTER TABLE public.crcredus
		ADD CONSTRAINT crcredus_nuusuid_fkey 
		FOREIGN KEY (nuusuid) 
		REFERENCES public.nuusuari(nuusuid) 
		ON DELETE CASCADE;
	
	COMMENT ON CONSTRAINT crcredus_nuusuid_fkey ON public.crcredus 
		IS 'FK a nuusuari - si el usuario se borra, se eliminan sus credenciales';
COMMIT;

-- Agregar FK en crcredus.crcreid → crcreden.crcreid ON DELETE CASCADE
BEGIN;
	ALTER TABLE public.crcredus
		DROP CONSTRAINT IF EXISTS crcredus_crcreid_fkey;
	
	ALTER TABLE public.crcredus
		ADD CONSTRAINT crcredus_crcreid_fkey 
		FOREIGN KEY (crcreid) 
		REFERENCES public.crcreden(crcreid) 
		ON DELETE CASCADE;
	
	COMMENT ON CONSTRAINT crcredus_crcreid_fkey ON public.crcredus 
		IS 'FK a crcreden - si la credencial se borra, se elimina la asociación usuario';
COMMIT;

-- ============================================================================
-- Verificación
-- ============================================================================

-- Listar constraints de la tabla nuusuari
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'nuusuari';

-- Listar constraints de la tabla crcredus
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'crcredus';

-- Listar constraints de la tabla crcreden
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'crcreden';

-- ============================================================================
-- FIN
-- ============================================================================
COMMENT ON TABLE public.nuusuari IS 'Tabla de usuarios de la app - email único';
COMMENT ON TABLE public.crcredus IS 'Tabla de relación usuario-credencial - con FKs en cascada';
COMMENT ON TABLE public.crcreden IS 'Tabla de credenciales - CUIL único';
