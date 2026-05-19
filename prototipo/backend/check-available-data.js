const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

BigInt.prototype.toJSON = function() { return this.toString(); };

async function checkData() {
  console.log('\n📊 Verificando datos disponibles:\n');
  
  // Verificar países
  const paises = await prisma.nupais.findMany({ take: 2 });
  console.log('Países disponibles:', paises.length > 0 ? paises.map(p => `${p.nupaiid.trim()} - ${p.nupaidescr.trim()}`).join(', ') : 'NINGUNO');
  
  // Verificar provincias
  const provincias = await prisma.nuprovin.findMany({ take: 2 });
  console.log('Provincias disponibles:', provincias.length > 0 ? provincias.map(p => `${p.nuproid.trim()} (País ${p.nupaiid.trim()})`).join(', ') : 'NINGUNO');
  
  // Verificar localidades
  const localidades = await prisma.nulocali.findMany({ take: 2 });
  console.log('Localidades disponibles:', localidades.length > 0 ? localidades.map(l => `${l.nulocid.trim()} - ${l.nulocdescr.trim()}`).join(', ') : 'NINGUNO');
  
  // Verificar rubros
  const rubros = await prisma.carubro.findMany({ take: 3 });
  console.log('Rubros disponibles:', rubros.length > 0 ? rubros.map(r => `${r.carubid.trim()} - ${r.carubdescr.trim()}`).join(', ') : 'NINGUNO');
  
  // Verificar especialidades
  const especialidades = await prisma.caespeci.findMany({ take: 3 });
  console.log('Especialidades disponibles:', especialidades.length > 0 ? especialidades.map(e => `${e.caespid.trim()} (Rubro ${e.carubid.trim()})`).join(', ') : 'NINGUNO');
  
  // Verificar nuplaid en cacartil
  const cartillas = await prisma.$queryRaw`SELECT DISTINCT nuplaid FROM cacartil LIMIT 3`;
  console.log('Planes (nuplaid) disponibles:', cartillas.length > 0 ? cartillas.map(c => c.nuplaid.trim()).join(', ') : 'NINGUNO');
  
  console.log('\n');
  await prisma.$disconnect();
}

checkData();
