-- Insertar parámetro HistorialVigencia en nusispar
-- Controla cuántos días hacia atrás se consulta el historial de atención médica
-- Valor por defecto: 180 días (aproximadamente 6 meses)

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdscpa)
VALUES ('FUNCIONES_APP', 'HistorialVigencia', '180', 'Días de historial médico a consultar (default 180 días = 6 meses)')
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdscpa = EXCLUDED.nusisdscpa;

-- Verificar inserción
SELECT nusisgrupa, nusistippa, nusisvalpa, nusisdscpa
FROM nusispar
WHERE nusisgrupa = 'FUNCIONES_APP' AND nusistippa = 'HistorialVigencia';
