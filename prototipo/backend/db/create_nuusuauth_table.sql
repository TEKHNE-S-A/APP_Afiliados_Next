-- Tabla de autenticación de usuarios
-- Guarda las contraseñas hasheadas para login
-- Se relaciona con nuusuari por nuusuid

DROP TABLE IF EXISTS public.nuusuauth CASCADE;

CREATE TABLE public.nuusuauth (
	nuusuid bpchar(40) NOT NULL,           -- FK a nuusuari.nuusuid
	nuusupass varchar(256) NOT NULL,       -- Hash bcrypt de la contraseña
	nuusucrea timestamp NOT NULL DEFAULT NOW(),  -- Fecha creación
	nuusuultm timestamp NOT NULL DEFAULT NOW(),  -- Última modificación
	CONSTRAINT nuusuauth_pkey PRIMARY KEY (nuusuid),
	CONSTRAINT nuusuauth_nuusuid_fkey FOREIGN KEY (nuusuid) 
		REFERENCES public.nuusuari(nuusuid) ON DELETE CASCADE
);

-- Índice para búsquedas
CREATE INDEX inuusuauth_uid ON public.nuusuauth USING btree (nuusuid);

COMMENT ON TABLE public.nuusuauth IS 'Tabla de autenticación - contraseñas hasheadas de usuarios';
COMMENT ON COLUMN public.nuusuauth.nuusuid IS 'ID usuario (FK a nuusuari)';
COMMENT ON COLUMN public.nuusuauth.nuusupass IS 'Hash bcrypt de la contraseña';
COMMENT ON COLUMN public.nuusuauth.nuusucrea IS 'Fecha de creación del registro';
COMMENT ON COLUMN public.nuusuauth.nuusuultm IS 'Fecha de última modificación';
