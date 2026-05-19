/**
 * Servicio de importación de cartillas desde archivo JSON externo
 * Soporta prestadores, farmacias y delegaciones
 * 
 * Estructura esperada (JSONL - un JSON por línea):
 * {
 *   IdMovimiento: "A|B|M" (Alta/Baja/Modificación),
 *   EntidadId: "0000010001",
 *   EntidadNombre: "SANATORIO PASTEUR S. A.",
 *   EntidadEmail: "info@ejemplo.com",
 *   EntidadWeb: "http://ejemplo.com",
 *   EntidadPrioridad: "1",
 *   EntidadDirecciones: [{
 *     DireccionId: "0000010001",
 *     DireccionPrincipal: "S",
 *     Direccion: "CHACABUCO 675",
 *     LocalidadId: "04853",
 *     LocalidadDescripcion: "SAN FERNANDO DEL VALLE DE CATA",
 *     ProvinciaId: "1",
 *     ProvinciaNombre: "CATAMARCA",
 *     PaisId: "AR",
 *     PaisNombre: "ARGENTINA",
 *     DireccionTelefonos: [{
 *       TelefonoId: "000001000101",
 *       TelefonoPrincipal: "S",
 *       Telefono: "(0383) 4432000"
 *     }]
 *   }],
 *   EntidadPlanes: [{
 *     PlanId: "1",
 *     PlanDescripcion: "PLAN UNICO",
 *     PlanRubros: [{
 *       RubroId: "000000007",
 *       RubroDescripcion: "SANATORIO",
 *       RubroTipo: "CAR",
 *       RubroEspecialidades: [{
 *         EspecialidadId: "MGR",
 *         EspecialidadDescripcion: "MEDICINA GENERAL"
 *       }]
 *     }]
 *   }]
 * }
 */

const fs = require('fs');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Importar archivo JSONL de cartillas
 * @param {string} filePath - Ruta completa al archivo JSONL
 * @param {object} options - Opciones de importación
 * @param {boolean} options.dryRun - Si true, solo analiza sin guardar
 * @param {number} options.batchSize - Tamaño de lote para inserts (default: 100)
 * @returns {object} Resultado { success, totalLineas, procesadas, insertadas, actualizadas, errores, details }
 */
async function importCartillaFromFile(filePath, options = {}) {
  const {
    dryRun = false,
    batchSize = 100,
  } = options;

  const stats = {
    success: true,
    totalLineas: 0,
    procesadas: 0,
    insertadas: 0,
    actualizadas: 0,
    bajas: 0,
    errores: 0,
    detalles: [],
    entidadesPorRubro: {},
    prestadoresImportados: 0,
    farmaciasDetectadas: 0
  };

  console.log(`\n📦 Iniciando importación de cartilla...`);
  console.log(`   Archivo: ${filePath}`);
  console.log(`   Modo: ${dryRun ? 'DRY RUN (sin guardar)' : 'PRODUCCIÓN'}`);
  console.log(`   Batch size: ${batchSize}\n`);

  // Verificar archivo
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch = [];

  try {
    for await (const line of rl) {
      stats.totalLineas++;
      
      if (!line.trim()) {
        continue; // Skip líneas vacías
      }

      try {
        // Parsear JSON (las líneas vienen envueltas en comillas dobles y con "" escapadas)
        let cleanLine = line.trim();
        
        // Remover comillas externas si existen
        if (cleanLine.startsWith('"') && cleanLine.endsWith('"')) {
          cleanLine = cleanLine.substring(1, cleanLine.length - 1);
        }
        
        // Reemplazar dobles comillas escapadas por comillas simples
        cleanLine = cleanLine.replace(/""/g, '"');
        
        const entidad = JSON.parse(cleanLine);
        
        batch.push(entidad);
        
        // Procesar batch cuando alcanza el tamaño
        if (batch.length >= batchSize) {
          const batchStats = await processBatch(batch, dryRun);
          mergeBatchStats(stats, batchStats);
          batch = [];
        }
      } catch (error) {
        stats.errores++;
        stats.detalles.push({
          linea: stats.totalLineas,
          error: error.message,
          contenido: line.substring(0, 100) + '...'
        });
        console.error(`❌ Error línea ${stats.totalLineas}: ${error.message}`);
      }
    }

    // Procesar último batch
    if (batch.length > 0) {
      const batchStats = await processBatch(batch, dryRun);
      mergeBatchStats(stats, batchStats);
    }

    console.log(`\n✅ Importación completada`);
    console.log(`   Total líneas: ${stats.totalLineas}`);
    console.log(`   Procesadas: ${stats.procesadas}`);
    console.log(`   Insertadas: ${stats.insertadas}`);
    console.log(`   Actualizadas: ${stats.actualizadas}`);
    console.log(`   Bajas lógicas: ${stats.bajas}`);
    console.log(`   Errores: ${stats.errores}`);
    console.log(`\n📊 Detección automática:`);
    console.log(`   🏥 Prestadores (con rubro): ${stats.prestadoresImportados}`);
    console.log(`   💊 Farmacias (sin rubro/especialidad): ${stats.farmaciasDetectadas}`);
    console.log(`\n📊 Entidades por rubro:`);
    Object.entries(stats.entidadesPorRubro).forEach(([rubro, count]) => {
      console.log(`   ${rubro}: ${count}`);
    });

  } catch (error) {
    stats.success = false;
    console.error(`\n❌ Error fatal en importación: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return stats;
}

/**
 * Procesar lote de entidades
 */
async function processBatch(entidades, dryRun) {
  const stats = {
    procesadas: 0,
    insertadas: 0,
    actualizadas: 0,
    bajas: 0,
    errores: 0,
    entidadesPorRubro: {},
    prestadoresImportados: 0,
    farmaciasDetectadas: 0
  };

  for (const entidad of entidades) {
    try {
      stats.procesadas++;
      
      // Lógica según IdMovimiento
      if (entidad.IdMovimiento === 'B') {
        // Baja lógica
        if (!dryRun) {
          await procesarBajaEntidad(entidad.EntidadId);
        }
        stats.bajas++;
        continue;
      }

      // Alta (A) o Modificación (M)
      const resultado = await procesarEntidad(entidad, dryRun);
      
      if (resultado.insertada) {
        stats.insertadas++;
      } else if (resultado.actualizada) {
        stats.actualizadas++;
      }

      // Contar prestadores vs farmacias
      if (resultado.esFarmacia) {
        stats.farmaciasDetectadas++;
      } else {
        stats.prestadoresImportados++;
      }

      // Contar rubros
      entidad.EntidadPlanes?.forEach(plan => {
        plan.PlanRubros?.forEach(rubro => {
          const rubroKey = rubro.RubroDescripcion || 'SIN RUBRO';
          stats.entidadesPorRubro[rubroKey] = (stats.entidadesPorRubro[rubroKey] || 0) + 1;
        });
      });

      // Si es farmacia sin rubro en JSON, contabilizar como FARMACIA
      if (resultado.esFarmacia) {
        stats.entidadesPorRubro['FARMACIA'] = (stats.entidadesPorRubro['FARMACIA'] || 0) + 1;
      }

    } catch (error) {
      stats.errores++;
      console.error(`❌ Error procesando entidad ${entidad.EntidadId}: ${error.message}`);
    }
  }

  return stats;
}

/**
 * Procesar una entidad (ALTA o MODIFICACIÓN)
 */
async function procesarEntidad(entidad, dryRun) {
  const resultado = { insertada: false, actualizada: false, esFarmacia: false };

  if (dryRun) {
    console.log(`[DRY RUN] Entidad ${entidad.EntidadId}: ${entidad.EntidadNombre}`);
    return resultado;
  }

  // **LÓGICA DE DETECCIÓN AUTOMÁTICA DE FARMACIAS**
  // Extraer primer rubro y especialidad del JSON (si existen)
  let rubroId = null;
  let especialidadId = null;

  if (entidad.EntidadPlanes && Array.isArray(entidad.EntidadPlanes)) {
    for (const plan of entidad.EntidadPlanes) {
      if (plan.PlanRubros && Array.isArray(plan.PlanRubros) && plan.PlanRubros.length > 0) {
        const primerRubro = plan.PlanRubros[0];
        rubroId = primerRubro.RubroId;
        
        if (primerRubro.RubroEspecialidades && Array.isArray(primerRubro.RubroEspecialidades) && primerRubro.RubroEspecialidades.length > 0) {
          especialidadId = primerRubro.RubroEspecialidades[0].EspecialidadId;
        }
        break; // Solo tomamos el primer rubro
      }
    }
  }

  // **REGLA DE NEGOCIO**: Si NO tiene rubro NI especialidad → Es FARMACIA
  let esFarmacia = false;
  if (!rubroId && !especialidadId) {
    rubroId = '000000008'; // FARMACIA
    esFarmacia = true;
    resultado.esFarmacia = true;
    console.log(`💊 Farmacia detectada automáticamente: ${entidad.EntidadId} - ${entidad.EntidadNombre}`);
  } else {
    console.log(`🏥 Prestador con rubro: ${rubroId || 'N/A'} | ${entidad.EntidadId} - ${entidad.EntidadNombre}`);
  }

  // 1. UPSERT en caentida (tabla principal)
  const entidadData = {
    caentid: entidad.EntidadId.substring(0, 30),
    caentapeno: entidad.EntidadNombre?.substring(0, 50) || '',
    caentmail: entidad.EntidadEmail?.substring(0, 100) || '',
    caentweb: entidad.EntidadWeb?.substring(0, 1000) || '',
    caentmarca: false, // Por defecto no está marcada como destacada
    caentprior: parseInt(entidad.EntidadPrioridad) || 1,
    // **CAMPOS AGREGADOS PARA FILTROS**
    carubid: rubroId ? rubroId.substring(0, 30).padEnd(30, ' ') : null,
    caespid: especialidadId ? especialidadId.substring(0, 30).padEnd(30, ' ') : null,
  };

  const entidadExiste = await prisma.caentida.findUnique({
    where: { caentid: entidadData.caentid }
  });

  if (entidadExiste) {
    await prisma.caentida.update({
      where: { caentid: entidadData.caentid },
      data: entidadData
    });
    resultado.actualizada = true;
    console.log(`🔄 Actualizada: ${entidadData.caentid} - ${entidadData.caentapeno}`);
  } else {
    await prisma.caentida.create({ data: entidadData });
    resultado.insertada = true;
    console.log(`✅ Insertada: ${entidadData.caentid} - ${entidadData.caentapeno}`);
  }

  // 2. Procesar direcciones
  if (entidad.EntidadDirecciones && Array.isArray(entidad.EntidadDirecciones)) {
    for (const dir of entidad.EntidadDirecciones) {
      await procesarDireccion(entidad.EntidadId, dir);
    }
  }

  // 3. Procesar planes, rubros y especialidades
  if (entidad.EntidadPlanes && Array.isArray(entidad.EntidadPlanes)) {
    for (const plan of entidad.EntidadPlanes) {
      if (plan.PlanRubros && Array.isArray(plan.PlanRubros)) {
        for (const rubro of plan.PlanRubros) {
          await procesarRubroYEspecialidades(entidad.EntidadId, plan.PlanId, rubro);
        }
      }
    }
  } else if (esFarmacia && rubroId) {
    // **FARMACIA AUTO-DETECTADA**: Crear registro básico en cacartil sin plan
    await procesarRubroFarmacia(entidad.EntidadId, rubroId);
  }

  return resultado;
}

/**
 * Procesar una dirección (tabla caendire)
 * Incluye UPSERT de catálogos: país, provincia, localidad
 * Campos reales de BD: caendid, caentid, nulocid, caendirecc, caendirpri, caendgeolo, caendhorat, caendpenge
 */
async function procesarDireccion(entidadId, direccion) {
  // 1. UPSERT catálogos geográficos
  const paisId = direccion.PaisId?.substring(0, 20) || 'AR';
  const provinciaId = direccion.ProvinciaId?.substring(0, 30) || '0';
  const localidadId = direccion.LocalidadId?.substring(0, 30) || '00000';

  // 1.1. UPSERT país
  if (direccion.PaisNombre) {
    await prisma.nupais.upsert({
      where: { nupaiid: paisId },
      update: { nupaidescr: direccion.PaisNombre.substring(0, 40) },
      create: {
        nupaiid: paisId,
        nupaidescr: direccion.PaisNombre.substring(0, 40)
      }
    });
  }

  // 1.2. UPSERT provincia
  if (direccion.ProvinciaNombre) {
    const provinciaData = {
      nuproid: provinciaId,
      nupaiid: paisId,
      nuprodescr: direccion.ProvinciaNombre.substring(0, 40)
    };

    const provinciaExiste = await prisma.nuprovin.findFirst({
      where: {
        nuproid: provinciaData.nuproid,
        nupaiid: provinciaData.nupaiid
      }
    });

    if (provinciaExiste) {
      await prisma.nuprovin.updateMany({
        where: {
          nuproid: provinciaData.nuproid,
          nupaiid: provinciaData.nupaiid
        },
        data: provinciaData
      });
    } else {
      await prisma.nuprovin.create({ data: provinciaData });
    }
  }

  // 1.3. UPSERT localidad
  if (direccion.LocalidadDescripcion) {
    const localidadData = {
      nulocid: localidadId,
      nuproid: provinciaId,
      nulocdescr: direccion.LocalidadDescripcion.substring(0, 40)
    };

    const localidadExiste = await prisma.nulocali.findFirst({
      where: {
        nulocid: localidadData.nulocid,
        nuproid: localidadData.nuproid
      }
    });

    if (localidadExiste) {
      await prisma.nulocali.updateMany({
        where: {
          nulocid: localidadData.nulocid,
          nuproid: localidadData.nuproid
        },
        data: localidadData
      });
    } else {
      await prisma.nulocali.create({ data: localidadData });
    }
  }

  // 2. UPSERT dirección
  const direccionData = {
    caendid: direccion.DireccionId.substring(0, 30),
    caentid: entidadId.substring(0, 30),
    nulocid: localidadId,
    caendirecc: direccion.Direccion?.substring(0, 1024) || '',
    caendirpri: direccion.DireccionPrincipal === 'S' ? 'S' : 'N',
    caendgeolo: 'pending', // Marcar para geocodificación (formato lat,lng después)
    caendhorat: '', // Horario atención (vacío por ahora)
    caendpenge: 'N', // Flag pendiente geocoding
  };

  const direccionExiste = await prisma.caendire.findFirst({
    where: {
      caentid: direccionData.caentid,
      caendid: direccionData.caendid
    }
  });

  if (direccionExiste) {
    await prisma.caendire.updateMany({
      where: {
        caentid: direccionData.caentid,
        caendid: direccionData.caendid
      },
      data: direccionData
    });
  } else {
    await prisma.caendire.create({ data: direccionData });
  }

  // 3. Procesar teléfonos de la dirección
  if (direccion.DireccionTelefonos && Array.isArray(direccion.DireccionTelefonos)) {
    for (const tel of direccion.DireccionTelefonos) {
      await procesarTelefono(entidadId, direccionData.caendid, tel);
    }
  }
}

/**
 * Procesar un teléfono (tabla caentele)
 * PK compuesto: (caentid, caendid, caenteleid)
 */
async function procesarTelefono(entidadId, direccionId, telefono) {
  const telefonoData = {
    caentid: entidadId.substring(0, 30),
    caendid: direccionId.substring(0, 30),
    caenteleid: telefono.TelefonoId.substring(0, 30),
    caentelefo: telefono.Telefono?.substring(0, 20) || '',
    caentelepr: telefono.TelefonoPrincipal === 'S' ? 'S' : 'N',
  };

  const telefonoExiste = await prisma.caentele.findFirst({
    where: {
      caentid: telefonoData.caentid,
      caendid: telefonoData.caendid,
      caenteleid: telefonoData.caenteleid
    }
  });

  if (telefonoExiste) {
    await prisma.caentele.updateMany({
      where: {
        caentid: telefonoData.caentid,
        caendid: telefonoData.caendid,
        caenteleid: telefonoData.caenteleid
      },
      data: telefonoData
    });
  } else {
    await prisma.caentele.create({ data: telefonoData });
  }
}

/**
 * Procesar rubro de farmacia auto-detectada (sin plan ni especialidad)
 * Crea registro básico en cacartil para mantener consistencia con prestadores
 * Usa plan por defecto (primer plan de nuplan) y especialidad GENERAL
 */
async function procesarRubroFarmacia(entidadId, rubroId) {
  // Obtener primer plan de nuplan como plan por defecto
  const planDefecto = await prisma.nuplan.findFirst({
    orderBy: { nuplaid: 'asc' }
  });

  if (!planDefecto) {
    console.log(`   ⚠️  No hay planes en nuplan, saltando ${entidadId}`);
    return;
  }

  const cartillaId = `FARMACIA-${entidadId}`.substring(0, 36);
  const planId = planDefecto.nuplaid; // Primer plan de nuplan
  const especialidadId = 'GENERAL'.padEnd(30, ' '); // Especialidad GENERAL
  
  await prisma.$executeRaw`
    INSERT INTO cacartil (cacarid, nuplaid, carubid, caespid, caentid)
    VALUES (${cartillaId}, ${planId}, ${rubroId.substring(0, 30)}, ${especialidadId}, ${entidadId.substring(0, 30)})
    ON CONFLICT (cacarid) DO UPDATE SET
      nuplaid = EXCLUDED.nuplaid,
      carubid = EXCLUDED.carubid,
      caespid = EXCLUDED.caespid,
      caentid = EXCLUDED.caentid
  `;

  console.log(`   💊 Guardada en cacartil: ${cartillaId} (plan: ${planId.trim()}, esp: GENERAL)`);
}

/**
 * Procesar rubro y sus especialidades
 * Incluye UPSERT de catálogos: rubro, especialidad
 */
async function procesarRubroYEspecialidades(entidadId, planId, rubro) {
  // 1. UPSERT rubro en carubro
  const rubroData = {
    carubid: rubro.RubroId.substring(0, 30),
    carubdescr: rubro.RubroDescripcion?.substring(0, 40) || '',
    carubtipor: (rubro.RubroTipo || 'CAR').substring(0, 3),
  };

  await prisma.carubro.upsert({
    where: { carubid: rubroData.carubid },
    update: rubroData,
    create: rubroData
  });

  // 2. Procesar especialidades
  if (rubro.RubroEspecialidades && Array.isArray(rubro.RubroEspecialidades)) {
    for (const esp of rubro.RubroEspecialidades) {
      // 2.1. UPSERT especialidad en caespeci
      const especialidadData = {
        caespid: esp.EspecialidadId.substring(0, 30),
        carubid: rubro.RubroId.substring(0, 30),
        caespdescr: esp.EspecialidadDescripcion?.substring(0, 40) || '',
      };

      const especialidadExiste = await prisma.caespeci.findFirst({
        where: {
          caespid: especialidadData.caespid,
          carubid: especialidadData.carubid
        }
      });

      if (especialidadExiste) {
        await prisma.caespeci.updateMany({
          where: {
            caespid: especialidadData.caespid,
            carubid: especialidadData.carubid
          },
          data: especialidadData
        });
      } else {
        await prisma.caespeci.create({ data: especialidadData });
      }

      // 2.2. Crear/actualizar relación cacartil (plan-entidad-rubro-especialidad)
      const cartillaId = `${planId}-${entidadId}-${rubro.RubroId}-${esp.EspecialidadId}`.substring(0, 36);
      const cartillaData = {
        cacarid: cartillaId,
        nuplaid: planId.substring(0, 30),
        carubid: rubro.RubroId.substring(0, 30),
        caespid: esp.EspecialidadId.substring(0, 30),
        caentid: entidadId.substring(0, 30),
      };

      await prisma.cacartil.upsert({
        where: { cacarid: cartillaData.cacarid },
        update: cartillaData,
        create: cartillaData
      });
    }
  }
}

/**
 * Procesar baja lógica de entidad
 */
async function procesarBajaEntidad(entidadId) {
  const entidadExiste = await prisma.caentida.findUnique({
    where: { caentid: entidadId }
  });

  if (entidadExiste) {
    await prisma.caentida.update({
      where: { caentid: entidadId },
      data: { caentbajaf: new Date() }
    });
    console.log(`🗑️  Baja lógica: ${entidadId}`);
  }
}

/**
 * Combinar estadísticas de batch
 */
function mergeBatchStats(stats, batchStats) {
  stats.procesadas += batchStats.procesadas;
  stats.insertadas += batchStats.insertadas;
  stats.actualizadas += batchStats.actualizadas;
  stats.bajas += batchStats.bajas;
  stats.errores += batchStats.errores;
  stats.prestadoresImportados += batchStats.prestadoresImportados || 0;
  stats.farmaciasDetectadas += batchStats.farmaciasDetectadas || 0;
  
  // Merge rubros
  Object.entries(batchStats.entidadesPorRubro).forEach(([rubro, count]) => {
    stats.entidadesPorRubro[rubro] = (stats.entidadesPorRubro[rubro] || 0) + count;
  });
}

module.exports = {
  importCartillaFromFile,
};
