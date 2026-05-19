/**
 * Asignar coordenadas a las delegaciones sin geocodificar
 * Catamarca centro como referencia
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const coordenadasPorId = {
  // Capital - San Fernando del Valle de Catamarca
  '00613148595332': { lat: -28.4696, lng: -65.7795 }, // CENTRAL (nueva)
  '00303': { lat: -27.5833, lng: -66.3167 }, // ANDALGALA
  '00157': { lat: null, lng: null }, // ANQUINCILA (no encontrada, dejar null)
  '00308': { lat: -28.4167, lng: -65.8333 }, // BAÑADO DE OVANTA
  '00301': { lat: -27.6500, lng: -67.0333 }, // BELEN
  '00310': { lat: -28.3333, lng: -65.9000 }, // FRAY MAMERTO ESQUIU
  '00304': { lat: -28.3978, lng: -66.1419 }, // POMAN
  '00302': { lat: -28.0667, lng: -67.5667 }, // TINOGASTA
  '00311': { lat: -28.5000, lng: -65.6333 }  // VALLE VIEJO
};

async function main() {
  console.log('\n📍 Actualizando coordenadas de Delegaciones...\n');

  for (const [id, coords] of Object.entries(coordenadasPorId)) {
    if (coords.lat && coords.lng) {
      // Buscar la dirección principal de la entidad
      const direccion = await prisma.$queryRaw`
        SELECT caendid
        FROM caendire
        WHERE TRIM(caentid) = ${id}
        AND caendirpri = 'S'
        LIMIT 1
      `;

      if (direccion.length > 0) {
        const caendid = direccion[0].caendid;

        await prisma.$executeRaw`
          UPDATE caendire
          SET 
            caendlat = ${coords.lat},
            caendlng = ${coords.lng},
            caendgeolo = 'manual',
            caendgeost = 'S',
            caendupdated = CURRENT_TIMESTAMP
          WHERE TRIM(caentid) = ${id}
            AND TRIM(caendid) = ${caendid.trim()}
        `;

        console.log(`✅ ${id} - Coordenadas asignadas: ${coords.lat}, ${coords.lng}`);
      } else {
        console.log(`⚠️  ${id} - No tiene dirección principal`);
      }
    } else {
      console.log(`⏭️  ${id} - Sin coordenadas (omitida)`);
    }
  }

  // Verificación final
  console.log('\n📊 Estado final:');
  const resultado = await prisma.$queryRaw`
    SELECT 
      COUNT(DISTINCT CASE WHEN d.caendlat IS NOT NULL AND d.caendlng IS NOT NULL THEN e.caentid END) as con_coordenadas,
      COUNT(DISTINCT CASE WHEN d.caendlat IS NULL OR d.caendlng IS NULL THEN e.caentid END) as sin_coordenadas,
      COUNT(DISTINCT e.caentid) as total
    FROM caentida e
    INNER JOIN cacartil c ON TRIM(e.caentid) = TRIM(c.caentid)
    LEFT JOIN caendire d ON TRIM(e.caentid) = TRIM(d.caentid)
    WHERE TRIM(c.carubid) = '000000009'
      AND e.caentmarca = false
  `;
  console.table(resultado);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
