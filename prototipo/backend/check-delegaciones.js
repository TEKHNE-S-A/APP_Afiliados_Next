/**
 * Verificar entidades de Delegaciones
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando entidades DELEGACIONES (rubroId 000000009)...\n');

  // 1. Contar por rubro
  const porRubro = await prisma.$queryRaw`
    SELECT 
      TRIM(c.carubid) as rubro_id,
      r.carubdescr as rubro_nombre,
      COUNT(DISTINCT e.caentid) as total,
      COUNT(DISTINCT CASE WHEN e.caentmarca = false THEN e.caentid END) as activas,
      COUNT(DISTINCT CASE WHEN e.caentmarca = true THEN e.caentid END) as bajas
    FROM caentida e
    INNER JOIN cacartil c ON TRIM(e.caentid) = TRIM(c.caentid)
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    GROUP BY c.carubid, r.carubdescr
    ORDER BY total DESC
    LIMIT 10
  `;
  
  console.log('📊 Top 10 rubros por cantidad:');
  console.table(porRubro);
  console.log('');

  // 2. Específicamente Delegaciones
  console.log('📋 Detalle DELEGACIONES (000000009):');
  const delegaciones = await prisma.$queryRaw`
    SELECT 
      TRIM(e.caentid) as id,
      TRIM(e.caentapeno) as nombre,
      e.caentmarca as marca_baja,
      CASE WHEN e.caentmarca = false THEN 'ACTIVA' ELSE 'BAJA' END as estado,
      TRIM(c.carubid) as rubro_id,
      TRIM(r.carubdescr) as rubro_nombre
    FROM caentida e
    INNER JOIN cacartil c ON TRIM(e.caentid) = TRIM(c.caentid)
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    WHERE TRIM(c.carubid) = '000000009'
    ORDER BY e.caentmarca, e.caentapeno
    LIMIT 20
  `;
  
  console.log(`Total encontradas: ${delegaciones.length}`);
  console.table(delegaciones);
  console.log('');

  // 3. Verificar si tienen coordenadas
  console.log('🗺️ Delegaciones con/sin coordenadas:');
  const conCoord = await prisma.$queryRaw`
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
  console.table(conCoord);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
