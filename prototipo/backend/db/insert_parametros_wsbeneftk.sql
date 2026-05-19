-- Inserción de parámetros para endpoints de servicios SOAP
-- Grupo: wsbeneftk (Web Services Beneficios Tekhne)
-- 
-- Estructura: componentes separados para construir URLs

-- Eliminar parámetros anteriores si existen
DELETE FROM nusispar WHERE nusisgrupa = 'wsbeneftk';

-- Componentes de conexión
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('wsbeneftk', 'Host', 'test17.osep.gob.ar');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('wsbeneftk', 'Port', '443');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('wsbeneftk', 'Secure', '1');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('wsbeneftk', 'BaseUrl', '/OSEP_BENEF17_TEST_WS/');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('wsbeneftk', 'Servicio', 'com.tekhne.abe_ws');

-- Credenciales HTTP Headers
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('wsbeneftk', 'User', 'mariar');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('wsbeneftk', 'Password', 'ignacio11');

-- Verificar inserción
SELECT nusisgrupa, nusistippa, nusisvalpa 
FROM nusispar 
WHERE nusisgrupa = 'wsbeneftk' 
ORDER BY nusistippa;
