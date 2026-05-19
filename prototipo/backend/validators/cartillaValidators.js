/**
 * Validadores Zod para API Cartilla
 * Semana 14: API v1 sin filtros geográficos
 * Semana 15: API v2 con filtros geográficos
 */

const { z } = require('zod');

/**
 * Schema para query params de listado de cartilla
 * Incluye filtros geográficos (lat/lng/radioKm)
 */
const CartillaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1)
    .describe('Número de página (comienza en 1)'),
  
  limit: z.coerce.number().int().min(1).max(100).default(20)
    .describe('Cantidad de resultados por página (máx 100)'),
  
  q: z.string().max(200).optional()
    .describe('Búsqueda de texto libre en descripción de entidad'),
  
  especialidadId: z.string().max(30).optional()
    .describe('Filtrar por ID de especialidad'),
  
  rubroId: z.string().max(30).optional()
    .describe('Filtrar por ID de rubro'),
  
  localidadId: z.string().max(30).optional()
    .describe('Filtrar por ID de localidad'),
  
  conGeo: z.enum(['S', 'N']).optional()
    .describe('Filtrar por existencia de coordenadas geográficas'),
  
  // Filtros geográficos (Semana 15)
  lat: z.coerce.number().min(-90).max(90).optional()
    .describe('Latitud del punto de referencia para búsqueda por proximidad'),
  
  lng: z.coerce.number().min(-180).max(180).optional()
    .describe('Longitud del punto de referencia para búsqueda por proximidad'),
  
  radioKm: z.coerce.number().min(0.1).max(500).default(10).optional()
    .describe('Radio de búsqueda en kilómetros (máx 500km, default 10km)'),
  
  orderBy: z.enum(['distancia', 'nombre', 'prioridad']).default('distancia').optional()
    .describe('Ordenar resultados por: distancia (default si lat/lng presente), nombre, prioridad'),

  // Excluir rubros específicos (por ejemplo FARMACIA, DELEGACION)
  // Express parsea query param repetido como array: excludeRubroId=...&excludeRubroId=...
  excludeRubroId: z
    .union([
      z.string().max(30),
      z.array(z.string().max(30)).max(20)
    ])
    .optional()
    .describe('Excluir entidades que pertenezcan a uno o más rubros (carubid). Puede repetirse en query string.')
}).refine(
  (data) => {
    // Si se proporciona lat o lng, ambos deben estar presentes
    if ((data.lat !== undefined && data.lng === undefined) || 
        (data.lng !== undefined && data.lat === undefined)) {
      return false;
    }
    return true;
  },
  {
    message: 'lat y lng deben proporcionarse juntos para búsqueda geográfica',
    path: ['lat']
  }
);

/**
 * Schema para parámetros de detalle de cartilla
 */
const CartillaDetailParamsSchema = z.object({
  id: z.string().max(30)
    .describe('ID de la entidad (caentid)')
});

/**
 * Schema para query params de sync incremental (Semana 20)
 * GET /api/cartilla/changes
 */
const CartillaChangesQuerySchema = z.object({
  since: z.string().datetime({ message: 'since debe ser un timestamp ISO 8601 válido' }).optional()
    .describe('Timestamp ISO 8601 de última sincronización. Si se omite, devuelve listado completo'),
  
  rubroId: z.string().length(9, { message: 'rubroId debe tener exactamente 9 caracteres' }).optional()
    .describe('Filtrar por rubro específico (000000008=FARMACIA, 000000009=DELEGACION)'),
  
  excludeRubroId: z.string().length(9, { message: 'excludeRubroId debe tener exactamente 9 caracteres' }).optional()
    .describe('Excluir entidades de un rubro específico (ej: excluir farmacias de prestadores)'),
  
  page: z.coerce.number().int().min(1).default(1)
    .describe('Número de página para paginado del delta'),
  
  limit: z.coerce.number().int().min(1).max(200).default(50)
    .describe('Items por página (máximo 200, default 50)')
});

module.exports = {
  CartillaListQuerySchema,
  CartillaDetailParamsSchema,
  CartillaChangesQuerySchema
};
