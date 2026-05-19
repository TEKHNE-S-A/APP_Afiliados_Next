-- Test Suite: Constraints de Integridad (Ítem 4 + Ítem 6)
-- Fecha: 05/05/2026

-- ============================================================================
-- SETUP: Crear datos de prueba
-- ============================================================================

DELETE FROM public.nuusuari WHERE nuusumail = 'test.unique@test.com';
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-001', 'TEST-AFILI-001', '1', CURRENT_DATE, '12345678', 'M', 
   'TEST USER', 'S', '1234567890', 'test.unique@test.com', 'N', 'ID-BILL-001',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-001', 1, CURRENT_TIMESTAMP, 1);

DELETE FROM public.crcreden WHERE crcrecuil = 9876543210;
INSERT INTO public.crcreden
  (crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno, crcreafili, crcrecuil,
   crcreplaid, crcredocum, crcresexo, crcrefecha, crcrehash, crcreifech)
VALUES
  ('TEST-CRED-001', CURRENT_DATE, '', '98765432', 'TEST PERSON', 'TEST-AFILI-001', 9876543210,
   '1', '98765432', 'M', '1990-01-01', '0000000000000000000000000000000000000000', CURRENT_TIMESTAMP);

DELETE FROM public.crcredus WHERE nuusuid = 'TEST-UNIQUE-001' AND crcreid = 'TEST-CRED-001';
INSERT INTO public.crcredus (nuusuid, crcreid, crcrepropi)
VALUES ('TEST-UNIQUE-001', 'TEST-CRED-001', 'S');

-- ============================================================================
-- TEST 1: UNIQUE constraint en nuusumail (Ítem 4) - DEBE FALLAR
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'TEST 1: UNIQUE email duplicado (debe fallar)'
\echo '========================================='

BEGIN;
  INSERT INTO public.nuusuari 
    (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
     nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
     nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
  VALUES 
    ('TEST-UNIQUE-DUP', 'TEST-AFILI-DUP', '1', CURRENT_DATE, '87654321', 'F', 
     'DUP USER', 'N', '9876543210', 'test.unique@test.com', 'N', 'ID-BILL-002',
     CURRENT_TIMESTAMP, 'S', 'QR-TEST-002', 1, CURRENT_TIMESTAMP, 1);
ROLLBACK;

-- ============================================================================
-- TEST 2: UNIQUE constraint en crcrecuil (Ítem 4) - DEBE FALLAR
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'TEST 2: UNIQUE CUIL duplicado (debe fallar)'
\echo '========================================='

BEGIN;
  INSERT INTO public.crcreden
    (crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno, crcreafili, crcrecuil,
     crcreplaid, crcredocum, crcresexo, crcrefecha, crcrehash, crcreifech)
  VALUES
    ('TEST-CRED-DUP', CURRENT_DATE, '', '87654321', 'DUP PERSON', 'TEST-AFILI-DUP', 9876543210,
     '1', '87654321', 'F', '1995-05-15', '0000000000000000000000000000000000000000', CURRENT_TIMESTAMP);
ROLLBACK;

-- ============================================================================
-- TEST 3: FK ON DELETE CASCADE en crcredus (Ítem 6)
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'TEST 3: FK ON DELETE CASCADE'
\echo '========================================='

\echo 'Antes de borrar usuario:'
SELECT COUNT(*) as "crcredus_count_before" FROM public.crcredus WHERE nuusuid = 'TEST-UNIQUE-001';

\echo 'Borrando usuario TEST-UNIQUE-001...'
DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-001';

\echo 'Después de borrar usuario (debe ser 0):'
SELECT COUNT(*) as "crcredus_count_after" FROM public.crcredus WHERE nuusuid = 'TEST-UNIQUE-001';

-- ============================================================================
-- TEST 4: FK ON DELETE CASCADE en nuusuauth (Ítem 6)
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'TEST 4: FK ON DELETE CASCADE en nuusuauth'
\echo '========================================='

-- Setup para test 4
DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-002';
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-002', 'TEST-AFILI-002', '1', CURRENT_DATE, '11111111', 'M', 
   'TEST USER 2', 'S', '1111111111', 'test.unique2@test.com', 'N', 'ID-BILL-002',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-002', 1, CURRENT_TIMESTAMP, 1);

DELETE FROM public.nuusuauth WHERE nuusuid = 'TEST-UNIQUE-002';
INSERT INTO public.nuusuauth (nuusuid, nuusupass)
VALUES ('TEST-UNIQUE-002', 'hash_password_aqui');

\echo 'Antes de borrar usuario:'
SELECT COUNT(*) as "nuusuauth_count_before" FROM public.nuusuauth WHERE nuusuid = 'TEST-UNIQUE-002';

\echo 'Borrando usuario TEST-UNIQUE-002...'
DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-002';

\echo 'Después de borrar usuario (debe ser 0):'
SELECT COUNT(*) as "nuusuauth_count_after" FROM public.nuusuauth WHERE nuusuid = 'TEST-UNIQUE-002';

-- ============================================================================
-- RESUMEN
-- ============================================================================

\echo ''
\echo '========================================='
\echo '✅ Tests completados!'
\echo '========================================='
\echo ''
\echo 'Resultado esperado:'
\echo '  TEST 1: ERROR (violates unique constraint)'
\echo '  TEST 2: ERROR (violates unique constraint)'
\echo '  TEST 3: crcredus_count_after = 0'
\echo '  TEST 4: nuusuauth_count_after = 0'
\echo ''
