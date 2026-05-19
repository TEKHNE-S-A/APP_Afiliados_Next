-- Script para insertar datos de prueba en las tablas
-- Simula un grupo familiar con 3 integrantes

-- 1. Insertar usuario en nuusuari
INSERT INTO public.nuusuari (
    nuusuid, nuusumail, nuusuafili, nuusupassw, nuusufecha
) VALUES (
    '0000000000000000000000000000000000000099',
    'demo@test.com',
    '000000001000000000001000000001', -- AfiliadoId del titular
    'demo-hash', -- Hash de contraseña (no se usa para este test)
    CURRENT_DATE - INTERVAL '30 days' -- Fecha registración hace 30 días
) ON CONFLICT (nuusuid) DO NOTHING;

-- 2. Insertar credencial del TITULAR
INSERT INTO public.crcreden (
    crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno,
    crcreafili, crcrecuil, crcreplaid, crcredocum, crcresexo,
    crcrefecha, crcrehash, crcreifech, crcreparen
) VALUES (
    '000000001000000000001000000001', -- ID titular
    CURRENT_DATE + INTERVAL '365 days', -- Vence en 1 año
    'https://example.com/credencial1.jpg',
    '001-000001-0',
    'GARCIA, JUAN CARLOS',
    '000000001000000000001000000001',
    20123456789,
    'PLAN FAMILIAR INTEGRAL',
    '12345678',
    'M',
    '1980-03-15',
    'hash-titular-001',
    CURRENT_TIMESTAMP,
    'Titular'
) ON CONFLICT (crcreid) DO UPDATE SET
    crcrefecvi = EXCLUDED.crcrefecvi,
    crcreapeno = EXCLUDED.crcreapeno,
    crcreparen = EXCLUDED.crcreparen;

-- 3. Insertar credencial del CÓNYUGE
INSERT INTO public.crcreden (
    crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno,
    crcreafili, crcrecuil, crcreplaid, crcredocum, crcresexo,
    crcrefecha, crcrehash, crcreifech, crcreparen
) VALUES (
    '000000001000000000001000000002', -- ID cónyuge
    CURRENT_DATE + INTERVAL '365 days',
    'https://example.com/credencial2.jpg',
    '001-000001-1',
    'LOPEZ, MARIA FERNANDA',
    '000000001000000000001000000002',
    27987654321,
    'PLAN FAMILIAR INTEGRAL',
    '98765432',
    'F',
    '1982-07-20',
    'hash-conyuge-001',
    CURRENT_TIMESTAMP,
    'Cónyuge'
) ON CONFLICT (crcreid) DO UPDATE SET
    crcrefecvi = EXCLUDED.crcrefecvi,
    crcreapeno = EXCLUDED.crcreapeno,
    crcreparen = EXCLUDED.crcreparen;

-- 4. Insertar credencial del HIJO
INSERT INTO public.crcreden (
    crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno,
    crcreafili, crcrecuil, crcreplaid, crcredocum, crcresexo,
    crcrefecha, crcrehash, crcreifech, crcreparen
) VALUES (
    '000000001000000000001000000003', -- ID hijo
    CURRENT_DATE + INTERVAL '365 days',
    'https://example.com/credencial3.jpg',
    '001-000001-2',
    'GARCIA, SOFIA',
    '000000001000000000001000000003',
    20456789123,
    'PLAN FAMILIAR INTEGRAL',
    '45678912',
    'F',
    '2010-11-05',
    'hash-hijo-001',
    CURRENT_TIMESTAMP,
    'Hijo/a'
) ON CONFLICT (crcreid) DO UPDATE SET
    crcrefecvi = EXCLUDED.crcrefecvi,
    crcreapeno = EXCLUDED.crcreapeno,
    crcreparen = EXCLUDED.crcreparen;

-- 5. Insertar relaciones usuario-credencial (TITULAR)
INSERT INTO public.crcredus (nuusuid, crcreid, crcrepropi)
VALUES ('0000000000000000000000000000000000000099', '000000001000000000001000000001', 'S')
ON CONFLICT (nuusuid, crcreid) DO UPDATE SET crcrepropi = 'S';

-- 6. Insertar relaciones usuario-credencial (CÓNYUGE)
INSERT INTO public.crcredus (nuusuid, crcreid, crcrepropi)
VALUES ('0000000000000000000000000000000000000099', '000000001000000000001000000002', 'N')
ON CONFLICT (nuusuid, crcreid) DO NOTHING;

-- 7. Insertar relaciones usuario-credencial (HIJO)
INSERT INTO public.crcredus (nuusuid, crcreid, crcrepropi)
VALUES ('0000000000000000000000000000000000000099', '000000001000000000001000000003', 'N')
ON CONFLICT (nuusuid, crcreid) DO NOTHING;

-- Verificar resultados
SELECT 
    c.crcreid,
    c.crcreapeno AS nombre,
    c.crcreparen AS parentesco,
    cu.crcrepropi AS es_titular,
    c.crcrefecvi AS vencimiento,
    c.crcreplaid AS plan
FROM crcreden c
INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
WHERE cu.nuusuid = '0000000000000000000000000000000000000099'
ORDER BY cu.crcrepropi DESC, c.crcreapeno;

-- Resultado esperado:
-- 3 credenciales ordenadas (titular primero, luego miembros)
