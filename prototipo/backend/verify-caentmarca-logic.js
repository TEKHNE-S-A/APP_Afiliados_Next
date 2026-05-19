/**
 * Verificar el significado real de caentmarca
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando significado de caentmarca...\n');

  // Contar por estado
  const stats = await prisma.$queryRaw`
    SELECT 
      caentmarca,
      COUNT(*) as cantidad
    FROM caentida
    GROUP BY caentmarca
    ORDER BY caentmarca
  `;
  
  console.log('📊 Distribución:');
  console.log(stats);
  console.log('');
  
  // Si caentmarca=false son 2898 y caentmarca=true es 1
  // Y el usuario dice que CENTRAL (la única con true) está de BAJA
  // Entonces: caentmarca=true = BAJA, caentmarca=false = ACTIVA
  
  console.log('💡 Conclusión:');
  console.log('   caentmarca = true  → BAJA (inactiva)');
  console.log('   caentmarca = false → ACTIVA (disponible)');
  console.log('');
  console.log('   La lógica está INVERTIDA respecto a lo intuitivo.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
