/**
 * Repository para ABM de Cartilla
 * 
 * CRUD completo para gestión de entidades de cartilla con sus relaciones:
 * - caentida (entidad principal)
 * - caendire (direcciones)
 * - caentele (teléfonos)
 * - carubro (rubros)
 * - caespeci (especialidades)
 * - cacartil (relación entidad-rubro-especialidad)
 * 
 * Semana 15: Soporte para filtros geográficos (lat/lng/radioKm)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Listar entidades con paginación y filtros
 * Soporta filtros geográficos con cálculo de distancia (Haversine)
 */
async function listEntidades({ 
  page = 1, 
  limit = 20, 
  q = '', 
  rubroId = null,
  excludeRubroId = null, // EXCLUIR entidades con este/estos rubroId(s). Puede ser string o array de strings
  especialidadId = null,
  localidadId = null,
  conGeo = null, // 'S' = solo con coordenadas, 'N' = solo sin coordenadas
  lat = null, // Latitud de referencia para búsqueda por proximidad
  lng = null, // Longitud de referencia para búsqueda por proximidad
  radioKm = 10, // Radio en kilómetros (default 10km)
  orderBy = 'distancia', // 'distancia', 'nombre', 'prioridad'
  includeInactivas = false // true = mostrar también las dadas de baja (solo para admin)
}) {
  const offset = (page - 1) * limit;

  // Construir WHERE dinámicamente
  const whereConditions = [];
  const params = [];

  // FILTRO CRÍTICO: Solo entidades activas por defecto (API pública)
  // Admin puede incluir inactivas pasando includeInactivas=true
  // NOTA: caentmarca invertido → false=ACTIVA, true=BAJA
  if (!includeInactivas) {
    whereConditions.push('e.caentmarca = false');
  }

  if (q) {
    // Buscar en descripción/nombre de entidad (campo texto)
    // CAST para asegurar que todos los campos son tratados como texto
    const qParamIndex = params.length + 1;
    whereConditions.push(`(
      CAST(e.caentapeno AS TEXT) ILIKE $${qParamIndex}
      OR EXISTS (
        SELECT 1 FROM caendire d2 
        WHERE d2.caentid = e.caentid 
        AND CAST(d2.caendirecc AS TEXT) ILIKE $${qParamIndex}
      )
    )`);
    params.push(`%${q}%`);
  }

  if (rubroId) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM cacartil c 
      WHERE c.caentid = e.caentid 
      AND TRIM(c.carubid) = TRIM($${params.length + 1})
    )`);
    params.push(rubroId);
  }

  if (excludeRubroId) {
    // Soportar un solo rubroId o array de rubroIds para excluir
    const excludeIds = Array.isArray(excludeRubroId) ? excludeRubroId : [excludeRubroId];
    
    if (excludeIds.length > 0) {
      // Generar placeholders para cada rubroId a excluir
      const placeholders = excludeIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM cacartil c 
        WHERE c.caentid = e.caentid 
        AND TRIM(c.carubid) IN (${placeholders})
      )`);
      excludeIds.forEach(id => params.push(id));
    }
  }

  if (especialidadId) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM cacartil c 
      WHERE c.caentid = e.caentid 
      AND TRIM(c.caespid) = TRIM($${params.length + 1})
    )`);
    params.push(especialidadId);
  }

  if (localidadId) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM caendire d 
      WHERE d.caentid = e.caentid 
      AND TRIM(d.nulocid) = TRIM($${params.length + 1})
    )`);
    params.push(localidadId);
  }

  if (conGeo === 'S') {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM caendire d 
      WHERE d.caentid = e.caentid 
      AND d.caendlat IS NOT NULL 
      AND d.caendlng IS NOT NULL
    )`);
  } else if (conGeo === 'N') {
    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM caendire d 
      WHERE d.caentid = e.caentid 
      AND d.caendlat IS NOT NULL 
      AND d.caendlng IS NOT NULL
    )`);
  }

  // Filtro geográfico: solo si lat/lng están presentes
  let distanceSelect = 'NULL as distancia_km';
  let havingClause = '';
  let latParamIndex = null;
  let lngParamIndex = null;
  let radioParamIndex = null;
  
  if (lat !== null && lng !== null) {
    // Agregar parámetros una sola vez
    params.push(lat, lng, radioKm);
    latParamIndex = params.length - 2;
    lngParamIndex = params.length - 1;
    radioParamIndex = params.length;
    
    // Fórmula de Haversine para calcular distancia en km
    // Radius tierra = 6371 km
    // IMPORTANTE: Usar MAX() porque caendlat/caendlng no están en GROUP BY
    // LEAST/GREATEST para evitar errores de dominio acos
    distanceSelect = `
      (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians($${latParamIndex})) * 
          cos(radians(CAST(MAX(d.caendlat) AS NUMERIC))) * 
          cos(radians(CAST(MAX(d.caendlng) AS NUMERIC)) - radians($${lngParamIndex})) + 
          sin(radians($${latParamIndex})) * 
          sin(radians(CAST(MAX(d.caendlat) AS NUMERIC)))
        ))
      )) as distancia_km
    `;
  }
  
  // Construir HAVING clause (filtro radio + exclusión de rubros)
  let havingConditions = [];
  if (lat !== null && lng !== null) {
    havingConditions.push(`(6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians($${latParamIndex})) * 
        cos(radians(CAST(MAX(d.caendlat) AS NUMERIC))) * 
        cos(radians(CAST(MAX(d.caendlng) AS NUMERIC)) - radians($${lngParamIndex})) + 
        sin(radians($${latParamIndex})) * 
        sin(radians(CAST(MAX(d.caendlat) AS NUMERIC)))
      ))
    )) <= $${radioParamIndex}`);
  }
  
  havingClause = havingConditions.length > 0
    ? `HAVING ${havingConditions.join(' AND ')}`
    : '';
  havingClause = havingConditions.length > 0
    ? `HAVING ${havingConditions.join(' AND ')}`
    : '';

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  // Determinar ORDER BY
  let orderByClause;
  if (lat !== null && lng !== null && orderBy === 'distancia') {
    orderByClause = 'ORDER BY distancia_km ASC NULLS LAST';
  } else if (orderBy === 'prioridad') {
    orderByClause = 'ORDER BY e.caentprior ASC, e.caentapeno ASC';
  } else {
    orderByClause = 'ORDER BY e.caentapeno ASC';
  }

  // Query de datos
  const entidades = await prisma.$queryRawUnsafe(`
    SELECT 
      e.caentid,
      e.caentapeno,
      e.caentmail,
      e.caentweb,
      e.caentmarca,
      e.caentprior,
      COUNT(DISTINCT d.caendid) as total_direcciones,
      COUNT(DISTINCT t.caenteleid) as total_telefonos,
      MAX(d.caendlat) as lat,
      MAX(d.caendlng) as lng,
      MAX(d.caendgeost) as geo_status,
      MAX(l.nulocdescr) as localidad,
      MAX(r.carubdescr) as carubdescr,
      MAX(esp.caespdescr) as caespecial,
      ${distanceSelect}
    FROM caentida e
    LEFT JOIN caendire d ON e.caentid = d.caentid
    LEFT JOIN caentele t ON e.caentid = t.caentid
    LEFT JOIN nulocali l ON d.nulocid = l.nulocid
    LEFT JOIN cacartil c ON c.caentid = e.caentid
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    LEFT JOIN caespeci esp ON TRIM(c.caespid) = TRIM(esp.caespid) AND TRIM(c.carubid) = TRIM(esp.carubid)
    ${whereClause}
    GROUP BY e.caentid, e.caentapeno, e.caentmail, e.caentweb, e.caentmarca, e.caentprior
    ${havingClause}
    ${orderByClause}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, ...params, limit, offset);

  // Query de total (mismo filtro geográfico)
  let totalQuery;
  let totalParams = [];
  
  if (lat !== null && lng !== null) {
    // Los parámetros ya están en params (sin limit/offset que se agregan inline)
    // params = [q, ...otros filtros..., lat, lng, radioKm]
    // Para totalQuery usamos los mismos params
    totalParams = [...params];
    
    totalQuery = `
      SELECT COUNT(DISTINCT e.caentid) as total
      FROM caentida e
      LEFT JOIN caendire d ON e.caentid = d.caentid
      LEFT JOIN cacartil c ON c.caentid = e.caentid
      LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
      LEFT JOIN caespeci esp ON TRIM(c.caespid) = TRIM(esp.caespid) AND TRIM(c.carubid) = TRIM(esp.carubid)
      ${whereClause}
      GROUP BY e.caentid
      ${havingClause}
    `;
  } else {
    totalQuery = `
      SELECT COUNT(DISTINCT e.caentid) as total
      FROM caentida e
      LEFT JOIN caendire d ON e.caentid = d.caentid
      LEFT JOIN cacartil c ON c.caentid = e.caentid
      LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
      LEFT JOIN caespeci esp ON TRIM(c.caespid) = TRIM(esp.caespid) AND TRIM(c.carubid) = TRIM(esp.carubid)
      ${whereClause}
    `;
    // Sin geo, params no tiene lat/lng/radioKm, solo filtros de texto/etc
    totalParams = [...params];
  }

  const totalResult = await prisma.$queryRawUnsafe(totalQuery, ...totalParams);
  
  // Si hay HAVING, totalResult es array de filas, sino es [{total: N}]
  const total = lat !== null && lng !== null 
    ? totalResult.length 
    : Number(totalResult[0]?.total || 0);

  return {
    data: entidades.map(e => ({
      ...e,
      distancia_km: e.distancia_km ? Number(e.distancia_km).toFixed(2) : null
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    filters: {
      ...(lat !== null && lng !== null ? { 
        lat, 
        lng, 
        radioKm,
        ordenadoPor: orderBy 
      } : {})
    }
  };
}

/**
 * Obtener detalle completo de entidad por ID
 */
async function getEntidadById(caentid) {
  const entidad = await prisma.caentida.findUnique({
    where: { caentid }
  });

  if (!entidad) {
    return null;
  }

  // Direcciones con localidad/provincia (sin relaciones definidas en schema)
  const direcciones = await prisma.$queryRaw`
    SELECT 
      d.*,
      l.nulocdescr,
      p.nuprodescr,
      p.nuproid
    FROM caendire d
    LEFT JOIN nulocali l ON TRIM(d.nulocid) = TRIM(l.nulocid)
    LEFT JOIN nuprovin p ON TRIM(l.nuproid) = TRIM(p.nuproid)
    WHERE TRIM(d.caentid) = TRIM(${caentid})
    ORDER BY d.caendirpri DESC, d.caendid
  `;

  // Teléfonos
  const telefonos = await prisma.caentele.findMany({
    where: { caentid }
  });

  // Rubros y especialidades (sin relaciones definidas en schema)
  const cartillas = await prisma.$queryRaw`
    SELECT 
      c.cacarid,
      c.nuplaid,
      c.carubid,
      c.caespid,
      r.carubdescr,
      e.caespdescr
    FROM cacartil c
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    LEFT JOIN caespeci e ON TRIM(c.caespid) = TRIM(e.caespid) AND TRIM(c.carubid) = TRIM(e.carubid)
    WHERE TRIM(c.caentid) = TRIM(${caentid})
  `;

  const primeraCartilla = cartillas.length > 0 ? cartillas[0] : null;
  
  // Obtener primera dirección (para edición)
  const primeraDireccion = direcciones.length > 0 ? direcciones[0] : null;
  
  // Obtener primer teléfono (para edición)
  const primerTelefono = telefonos.length > 0 ? telefonos[0] : null;

  // Mapear datos para frontend (compatibilidad con formulario de edición)
  return {
    // Datos de caentida
    caentid: entidad.caentid,
    caentapeno: entidad.caentapeno,
    caentmail: entidad.caentmail,
    caentmarca: entidad.caentmarca,
    caentprior: entidad.caentprior,
    caentweb: entidad.caentweb,
    caentmatri: entidad.caentmatri, // Matrícula profesional
    caentobs: entidad.caentobs, // Observaciones
    caentelefo: primerTelefono?.caentelefo || null, // Primer teléfono
    
    // Campos mapeados para formulario de edición (de primera cartilla)
    caentdescri: entidad.caentapeno, // Usar nombre como descripción
    carubid: primeraCartilla?.carubid || null,
    caespid: primeraCartilla?.caespid || null,
    
    // Campos de primera dirección
    caentdireccion: primeraDireccion?.caendirecc || null,
    nulocid: primeraDireccion?.nulocid || null,
    caentestado: entidad.caentmarca ? 'I' : 'A', // Mapear bool a A/I (invertido: false=A, true=I)
    
    // Objetos relacionados para modal de Ver Detalle
    rubro: primeraCartilla ? {
      carubid: primeraCartilla.carubid,
      carubdescr: primeraCartilla.carubdescr
    } : null,
    
    especialidad: primeraCartilla && primeraCartilla.caespid ? {
      caespid: primeraCartilla.caespid,
      caespdescr: primeraCartilla.caespdescr
    } : null,
    
    localidad: primeraDireccion && primeraDireccion.nulocid ? {
      nulocid: primeraDireccion.nulocid,
      nulocdescr: primeraDireccion.nulocdescr,
      provincia: primeraDireccion.nuprodescr ? {
        nuproid: primeraDireccion.nuproid,
        nuprodescr: primeraDireccion.nuprodescr
      } : null
    } : null,
    
    // Arrays completos para consulta avanzada
    direcciones,
    telefonos,
    cartillas,
    
    // Stats
    total_direcciones: direcciones.length,
    total_telefonos: telefonos.length
  };
}

/**
 * Crear nueva entidad (desde formulario frontend)
 */
async function createEntidad(formData) {
  // VALIDACIONES OBLIGATORIAS
  if (!formData.carubid) {
    throw new Error('El campo Rubro es obligatorio');
  }
  if (!formData.caespid) {
    throw new Error('El campo Especialidad es obligatorio');
  }
  
  // Generar ID único para la entidad
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const caentid = `${timestamp}${random}`.padEnd(30);

  // Mapear caentestado (A/I) a caentmarca (bool invertido: A=false, I=true)
  const caentmarca = formData.caentestado === 'I';

  // Crear entidad principal
  const newEntidad = await prisma.caentida.create({
    data: {
      caentid: caentid,
      caentapeno: formData.caentdescri || 'Sin nombre', // Usar caentdescri como nombre
      caentmail: formData.caentmail || '',
      caentweb: formData.caentweb || '',
      caentmarca: caentmarca,
      caentprior: formData.caentprior || 999, // Prioridad baja por defecto
      caentmatri: formData.caentmatri || null, // Matrícula profesional
      caentobs: formData.caentobs || null // Observaciones
    }
  });

  // Crear dirección si se proporcionó
  if (formData.nulocid && formData.caentdireccion) {
    const direccionId = `${caentid.substring(0, 20)}01`.padEnd(30);
    await prisma.caendire.create({
      data: {
        caentid: caentid,
        caendid: direccionId,
        nulocid: formData.nulocid.toString().padEnd(30),
        caendirecc: formData.caentdireccion,
        caendirpri: 'S', // Marcar como principal
        caendgeolo: ''.padEnd(50), // Longitud/latitud texto (vacío por ahora)
        caendhorat: ''.padEnd(100), // Horario de atención (vacío por ahora)
        caendpenge: 'N' // Pendiente geocoding
      }
    });
    
    // Crear teléfono si se proporcionó
    if (formData.caentelefo) {
      const telefonoId = `${caentid.substring(0, 20)}01`.padEnd(30);
      await prisma.caentele.create({
        data: {
          caentid: caentid,
          caendid: direccionId, // Mismo caendid que la dirección
          caenteleid: telefonoId,
          caentelefo: formData.caentelefo.substring(0, 20), // Máximo 20 caracteres
          caentelepr: 'S' // Marcar como principal
        }
      });
    }
  }

  // Crear cartilla (rubro/especialidad) - AHORA OBLIGATORIO
  const cartillaId = `${caentid.substring(0, 15)}-CART-${Date.now().toString().slice(-10)}`.substring(0, 36);
  
  await prisma.cacartil.create({
    data: {
      cacarid: cartillaId,
      nuplaid: '1'.padEnd(30), // Plan 1 (default importado)
      carubid: formData.carubid.toString().padEnd(30),
      caespid: formData.caespid.toString().padEnd(30),
      caentid: caentid
    }
  });

  return await getEntidadById(caentid);
}

/**
 * Actualizar entidad existente (desde formulario frontend)
 */
async function updateEntidad(caentid, formData) {
  // VALIDACIONES OBLIGATORIAS
  if (!formData.carubid) {
    throw new Error('El campo Rubro es obligatorio');
  }
  if (!formData.caespid) {
    throw new Error('El campo Especialidad es obligatorio');
  }
  
  // Mapear caentestado (A/I) a caentmarca (bool invertido: A=false, I=true)
  const caentmarca = formData.caentestado === 'I';

  // Actualizar entidad principal
  await prisma.caentida.update({
    where: { caentid },
    data: {
      caentapeno: formData.caentdescri || 'Sin nombre',
      caentmail: formData.caentmail || '',
      caentweb: formData.caentweb || '',
      caentprior: formData.caentprior || 999,
      caentmatri: formData.caentmatri || null,
      caentobs: formData.caentobs || null,
      caentmarca: caentmarca
      // No actualizamos caentmail, caentweb, caentprior porque no están en el formulario
    }
  });

  // Actualizar o crear dirección principal
  if (formData.nulocid && formData.caentdireccion) {
    // Buscar dirección principal existente
    const direccionExistente = await prisma.caendire.findFirst({
      where: { 
        caentid,
        caendirpri: 'S'
      }
    });

    let direccionId;
    
    if (direccionExistente) {
      // Actualizar dirección existente
      await prisma.caendire.update({
        where: { 
          caentid_caendid: {
            caentid: direccionExistente.caentid,
            caendid: direccionExistente.caendid
          }
        },
        data: {
          nulocid: formData.nulocid.toString().padEnd(30),
          caendirecc: formData.caentdireccion,
          caendpenge: 'N' // Marcar para re-geocodificar si cambió
        }
      });
      direccionId = direccionExistente.caendid;
    } else {
      // Crear nueva dirección principal
      direccionId = `${caentid.substring(0, 20)}01`.padEnd(30);
      await prisma.caendire.create({
        data: {
          caentid: caentid,
          caendid: direccionId,
          nulocid: formData.nulocid.toString().padEnd(30),
          caendirecc: formData.caentdireccion,
          caendirpri: 'S',
          caendgeolo: ''.padEnd(50),
          caendhorat: ''.padEnd(100),
          caendpenge: 'N'
        }
      });
    }
    
    // Actualizar o crear teléfono si se proporcionó
    if (formData.caentelefo) {
      // Buscar teléfono principal existente
      const telefonoExistente = await prisma.caentele.findFirst({
        where: { 
          caentid,
          caentelepr: 'S'
        }
      });

      if (telefonoExistente) {
        // Actualizar teléfono existente
        await prisma.caentele.update({
          where: { 
            caentid_caendid_caenteleid: {
              caentid: telefonoExistente.caentid,
              caendid: telefonoExistente.caendid,
              caenteleid: telefonoExistente.caenteleid
            }
          },
          data: {
            caentelefo: formData.caentelefo.substring(0, 20)
          }
        });
      } else {
        // Crear nuevo teléfono principal
        const telefonoId = `${caentid.substring(0, 20)}01`.padEnd(30);
        await prisma.caentele.create({
          data: {
            caentid: caentid,
            caendid: direccionId,
            caenteleid: telefonoId,
            caentelefo: formData.caentelefo.substring(0, 20),
            caentelepr: 'S'
          }
        });
      }
    }
  }

  // Actualizar o crear cartilla (rubro/especialidad) - AHORA OBLIGATORIO
  // Buscar cartilla existente
  const cartillaExistente = await prisma.cacartil.findFirst({
    where: { caentid }
  });

  const carubidPadded = formData.carubid.toString().padEnd(30);
  const caespidPadded = formData.caespid.toString().padEnd(30);

  if (cartillaExistente) {
    // Actualizar cartilla existente
    await prisma.cacartil.update({
      where: { cacarid: cartillaExistente.cacarid },
      data: {
        carubid: carubidPadded,
        caespid: caespidPadded
      }
    });
  } else {
    // Crear nueva cartilla
    const cartillaId = `${caentid.substring(0, 15)}-CART-${Date.now().toString().slice(-10)}`.substring(0, 36);
    await prisma.cacartil.create({
      data: {
        cacarid: cartillaId,
        nuplaid: '1'.padEnd(30), // Plan 1 (default importado)
        carubid: carubidPadded,
        caespid: caespidPadded,
        caentid: caentid
      }
    });
  }

  return await getEntidadById(caentid);
}

/**
 * Eliminar entidad (baja lógica)
 */
async function deleteEntidad(caentid) {
  // NOTA: caentmarca invertido → false=ACTIVA, true=BAJA
  await prisma.caentida.update({
    where: { caentid },
    data: { caentmarca: true }
  });

  return { success: true, message: 'Entidad marcada como baja lógica' };
}

/**
 * Listar rubros
 */
async function listRubros() {
  return await prisma.carubro.findMany({
    orderBy: { carubdescr: 'asc' }
  });
}

/**
 * Listar especialidades por rubro
 */
async function listEspecialidades(carubid = null) {
  if (carubid) {
    // Si se especifica rubro, devolver especialidades de ese rubro
    return await prisma.caespeci.findMany({
      where: { carubid },
      orderBy: { caespdescr: 'asc' }
    });
  } else {
    // Si NO se especifica rubro, devolver especialidades DISTINTAS (sin duplicados)
    const result = await prisma.$queryRaw`
      SELECT DISTINCT ON (caespid, caespdescr) 
        caespid, 
        caespdescr,
        carubid
      FROM caespeci
      ORDER BY caespid, caespdescr, carubid
    `;
    
    // Ordenar por descripción después de obtener los resultados
    return result.sort((a, b) => a.caespdescr.localeCompare(b.caespdescr));
  }
}

/**
 * Listar localidades
 */
async function listLocalidades() {
  return await prisma.$queryRaw`
    SELECT 
      l.nulocid,
      l.nulocdescr,
      p.nuproid,
      p.nuprodescr
    FROM nulocali l
    LEFT JOIN nuprovin p ON l.nuproid = p.nuproid
    ORDER BY l.nulocdescr
  `;
}

/**
 * Obtener cambios incrementales de cartilla (sync incremental - Semana 20)
 * 
 * Devuelve entidades nuevas/modificadas y bajas lógicas desde un timestamp.
 * Si no se proporciona since, funciona como listado completo (fallback).
 * 
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.since - Timestamp ISO 8601 de última sync (opcional)
 * @param {string} options.rubroId - Filtrar por rubro específico (opcional)
 * @param {string} options.excludeRubroId - Excluir rubro específico (opcional)
 * @param {number} options.page - Número de página (default 1)
 * @param {number} options.limit - Items por página (default 50, máx 200)
 * @returns {Promise<{items: Array, deleted: Array, pagination: Object, sync: Object}>}
 */
async function getChanges({ 
  since = null, 
  rubroId = null,
  excludeRubroId = null,
  page = 1, 
  limit = 50 
}) {
  const offset = (page - 1) * limit;
  
  // Modo DELTA (con since) vs FULL (sin since)
  const isDeltaMode = since !== null;
  
  // ========================================
  // 1. QUERY PRINCIPAL: Items (nuevos y modificados)
  // ========================================
  
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;
  
  // Filtro de timestamp (modo delta)
  if (isDeltaMode) {
    whereConditions.push(`e.caentupdated > $${paramIndex}::timestamp`);
    params.push(since);
    paramIndex++;
  }
  
  // Filtro de activos (solo entidades activas)
  whereConditions.push(`e.caentactivo = true`);
  
  // Filtro por rubro (inclusión)
  if (rubroId) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM cacartil c 
      WHERE c.caentid = e.caentid 
      AND TRIM(c.carubid) = $${paramIndex}
    )`);
    params.push(rubroId);
    paramIndex++;
  }
  
  // Filtro por rubro (exclusión)
  if (excludeRubroId) {
    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM cacartil c 
      WHERE c.caentid = e.caentid 
      AND TRIM(c.carubid) = $${paramIndex}
    )`);
    params.push(excludeRubroId);
    paramIndex++;
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  // Query items principal
  const queryItems = `
    SELECT 
      TRIM(e.caentid) as caentid,
      e.caentapeno,
      e.caentweb,
      e.caentactivo,
      e.caentupdated,
      MAX(r.carubdescr) as carubdescr,
      MAX(esp.caespdescr) as caespecial,
      MAX(d.caendirecc) as caendirecc,
      MAX(l.nulocdescr) as localidad,
      MAX(d.caendlat) as lat,
      MAX(d.caendlng) as lng,
      MAX(d.caendgeost) as geo_status
    FROM caentida e
    LEFT JOIN cacartil c ON c.caentid = e.caentid
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    LEFT JOIN caespeci esp ON TRIM(c.caespid) = TRIM(esp.caespid)
    LEFT JOIN caendire d ON d.caentid = e.caentid AND d.caendirpri = 'S'
    LEFT JOIN nulocali l ON TRIM(d.nulocid) = TRIM(l.nulocid)
    ${whereClause}
    GROUP BY e.caentid, e.caentapeno, e.caentweb, e.caentactivo, e.caentupdated
    ORDER BY e.caentupdated ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  params.push(limit, offset);
  const items = await prisma.$queryRawUnsafe(queryItems, ...params);
  
  // Agregar changeType a cada item
  const itemsWithType = items.map(item => ({
    ...item,
    changeType: isDeltaMode ? 'modified' : 'new',
    caentupdated: item.caentupdated ? item.caentupdated.toISOString() : null
  }));
  
  // ========================================
  // 2. QUERY SECUNDARIA: Deleted (bajas lógicas)
  // ========================================
  
  let deleted = [];
  if (isDeltaMode) {
    // Solo en modo delta, buscar bajas lógicas desde since
    let whereDeletedConditions = [
      'e.caentactivo = false',
      'e.caentupdated > $1::timestamp' // usa el mismo since del inicio
    ];
    
    // Aplicar mismos filtros de rubro si existen
    if (rubroId) {
      whereDeletedConditions.push(`EXISTS (
        SELECT 1 FROM cacartil c 
        WHERE c.caentid = e.caentid 
        AND TRIM(c.carubid) = '${rubroId}'
      )`);
    }
    
    if (excludeRubroId) {
      whereDeletedConditions.push(`NOT EXISTS (
        SELECT 1 FROM cacartil c 
        WHERE c.caentid = e.caentid 
        AND TRIM(c.carubid) = '${excludeRubroId}'
      )`);
    }
    
    const queryDeleted = `
      SELECT 
        TRIM(e.caentid) as caentid,
        e.caentapeno,
        e.caentupdated as deletedAt
      FROM caentida e
      WHERE ${whereDeletedConditions.join(' AND ')}
      ORDER BY e.caentupdated ASC
    `;
    
    deleted = await prisma.$queryRawUnsafe(queryDeleted, since);
    deleted = deleted.map(item => ({
      ...item,
      deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null
    }));
  }
  
  // ========================================
  // 3. QUERY COUNT: Total de cambios
  // ========================================
  
  // Reusar whereConditions del query principal
  const queryCount = `
    SELECT COUNT(DISTINCT e.caentid) as total
    FROM caentida e
    LEFT JOIN cacartil c ON c.caentid = e.caentid
    ${whereClause}
  `;
  
  const countResult = await prisma.$queryRawUnsafe(
    queryCount, 
    ...(isDeltaMode ? [since] : []),
    ...(rubroId ? [rubroId] : []),
    ...(excludeRubroId ? [excludeRubroId] : [])
  );
  
  const total = parseInt(countResult[0].total);
  const totalPages = Math.ceil(total / limit);
  
  // ========================================
  // 4. SYNC METADATA
  // ========================================
  
  const serverTime = new Date().toISOString();
  const lastModified = itemsWithType.length > 0 
    ? itemsWithType[itemsWithType.length - 1].caentupdated 
    : serverTime;
  const nextSince = lastModified; // Guardar este valor para próximo sync
  
  return {
    items: itemsWithType,
    deleted,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    },
    sync: {
      serverTime,
      nextSince,
      lastModified,
      totalChanges: total,
      newItems: isDeltaMode ? 0 : total, // Solo cuenta altas en modo full
      modifiedItems: isDeltaMode ? itemsWithType.length : 0,
      deletedItems: deleted.length
    }
  };
}

/**
 * Sugerencias de búsqueda inteligente (autocomplete)
 * Devuelve hasta `limit` nombres que coincidan con los tokens del query.
 * Aplica scoring: coincidencia exacta > inicio de palabra > contiene.
 * Sin dependencias de extensiones PG (no requiere pg_trgm).
 */
async function sugerirEntidades({ q = '', limit = 8, rubroId = null, excludeRubroId = null }) {
  if (!q || q.trim().length < 2) return [];

  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  // Construir condición: todos los tokens deben aparecer en nombre o dirección
  const whereConditions = ['e.caentmarca = false'];
  const params = [];

  tokens.forEach((token) => {
    const idx = params.length + 1;
    whereConditions.push(`(
      LOWER(CAST(e.caentapeno AS TEXT)) ILIKE $${idx}
      OR EXISTS (
        SELECT 1 FROM caendire d2
        WHERE d2.caentid = e.caentid
        AND LOWER(CAST(d2.caendirecc AS TEXT)) ILIKE $${idx}
      )
    )`);
    params.push(`%${token}%`);
  });

  if (rubroId) {
    params.push(rubroId);
    whereConditions.push(`EXISTS (
      SELECT 1 FROM cacartil c WHERE c.caentid = e.caentid AND TRIM(c.carubid) = TRIM($${params.length})
    )`);
  }

  if (excludeRubroId) {
    const excludeIds = Array.isArray(excludeRubroId) ? excludeRubroId : [excludeRubroId];
    if (excludeIds.length > 0) {
      const placeholders = excludeIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM cacartil c WHERE c.caentid = e.caentid AND TRIM(c.carubid) IN (${placeholders})
      )`);
      excludeIds.forEach(id => params.push(id));
    }
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      e.caentid,
      TRIM(CAST(e.caentapeno AS TEXT)) as caentapeno,
      MAX(TRIM(CAST(r.carubdescr AS TEXT))) as carubdescr,
      MAX(TRIM(CAST(esp.caespdescr AS TEXT))) as caespecial,
      MAX(TRIM(CAST(d.caendirecc AS TEXT))) as caendirecc
    FROM caentida e
    LEFT JOIN caendire d ON e.caentid = d.caentid
    LEFT JOIN cacartil c ON c.caentid = e.caentid
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    LEFT JOIN caespeci esp ON TRIM(c.caespid) = TRIM(esp.caespid) AND TRIM(c.carubid) = TRIM(esp.carubid)
    ${whereClause}
    GROUP BY e.caentid, e.caentapeno
    ORDER BY e.caentapeno ASC
    LIMIT $${params.length + 1}
  `, ...params, limit * 3); // traer más y rankear en JS

  // Rankear: exact > startsWith > contains (primer token)
  const q0 = tokens[0];
  const ranked = rows
    .map(row => {
      const nombre = (row.caentapeno || '').toLowerCase();
      let score = 0;
      if (nombre === q.toLowerCase()) score = 100;
      else if (nombre.startsWith(q0)) score = 80;
      else if (nombre.includes(q0)) score = 60;
      else score = 40;
      return { ...row, _score: score };
    })
    .sort((a, b) => b._score - a._score || a.caentapeno.localeCompare(b.caentapeno))
    .slice(0, limit)
    .map(({ _score, ...row }) => row);

  return ranked;
}

module.exports = {
  listEntidades,
  sugerirEntidades,
  getEntidadById,
  createEntidad,
  updateEntidad,
  deleteEntidad,
  listRubros,
  listEspecialidades,
  listLocalidades,
  getChanges
};
