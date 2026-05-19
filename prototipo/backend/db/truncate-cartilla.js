// Script Node.js para blanquear TODAS las tablas de cartilla
// Uso: node truncate-cartilla.js [--confirm]
// Limpia todas las 9 tablas: datos + catalogos

const { Pool } = require('pg');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Parse argumentos
const autoConfirm = process.argv.includes('--confirm');

// Leer configuracion desde .env del backend (directorio padre)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      // Remover comillas si existen
      process.env[match[1]] = match[2].replace(/^"|"$/g, '');
    }
  });
}

// Configuracion de conexion
let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:12345678@localhost:5432/app_afiliados_genexus';
// Remover comillas si existen
dbUrl = dbUrl.replace(/^"|"$/g, '');

const pool = new Pool({
  connectionString: dbUrl
});

async function main() {
  console.log('\n=== BLANQUEAR TABLAS DE CARTILLA ===\n');
  
  try {
    // Contar registros actuales en todas las tablas
    console.log('[*] Contando registros actuales...');
    
    const counts = {
      caentele: parseInt((await pool.query('SELECT COUNT(*) FROM caentele')).rows[0].count),
      caendire: parseInt((await pool.query('SELECT COUNT(*) FROM caendire')).rows[0].count),
      cacartil: parseInt((await pool.query('SELECT COUNT(*) FROM cacartil')).rows[0].count),
      caentida: parseInt((await pool.query('SELECT COUNT(*) FROM caentida')).rows[0].count),
      caespeci: parseInt((await pool.query('SELECT COUNT(*) FROM caespeci')).rows[0].count),
      carubro: parseInt((await pool.query('SELECT COUNT(*) FROM carubro')).rows[0].count),
      nulocali: parseInt((await pool.query('SELECT COUNT(*) FROM nulocali')).rows[0].count),
      nuprovin: parseInt((await pool.query('SELECT COUNT(*) FROM nuprovin')).rows[0].count),
      nupais: parseInt((await pool.query('SELECT COUNT(*) FROM nupais')).rows[0].count)
    };
    
    console.log('\nTablas de datos:');
    console.log(`  caentele (telefonos):   ${counts.caentele}`);
    console.log(`  caendire (direcciones): ${counts.caendire}`);
    console.log(`  cacartil (cartilla):    ${counts.cacartil}`);
    console.log(`  caentida (entidades):   ${counts.caentida}`);
    console.log('\nTablas de catalogos:');
    console.log(`  caespeci (especialidades): ${counts.caespeci}`);
    console.log(`  carubro (rubros):          ${counts.carubro}`);
    console.log(`  nulocali (localidades):    ${counts.nulocali}`);
    console.log(`  nuprovin (provincias):     ${counts.nuprovin}`);
    console.log(`  nupais (paises):           ${counts.nupais}`);
    console.log('');
    
    const totalData = counts.caentele + counts.caendire + counts.cacartil + counts.caentida;
    const totalCatalogos = counts.caespeci + counts.carubro + counts.nulocali + counts.nuprovin + counts.nupais;
    const totalGeneral = totalData + totalCatalogos;
    
    if (totalGeneral === 0) {
      console.log('\x1b[32m[OK] Todas las tablas ya estan vacias. No hay nada que limpiar.\x1b[0m');
      await pool.end();
      process.exit(0);
    }
    
    // Advertencia
    console.log('\x1b[31m[!] ADVERTENCIA:\x1b[0m');
    console.log(`\x1b[31m    Este script eliminara TODAS las tablas de cartilla (datos + catalogos).\x1b[0m`);
    console.log(`\x1b[31m    Se perderan ${totalGeneral} registros totales:\x1b[0m`);
    console.log(`\x1b[31m      - Datos: ${totalData} registros\x1b[0m`);
    console.log(`\x1b[31m      - Catalogos: ${totalCatalogos} registros\x1b[0m`);
    console.log('');
    
    // Confirmacion
    if (!autoConfirm) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question("Esta seguro que desea continuar? (escriba 'SI' para confirmar): ", resolve);
      });
      rl.close();
      
      if (answer !== 'SI') {
        console.log('\x1b[33m[X] Operacion cancelada por el usuario.\x1b[0m');
        await pool.end();
        process.exit(1);
      }
    }
    
    // Ejecutar TRUNCATE en orden (respetando foreign keys)
    console.log('');
    console.log('\x1b[36m[*] Ejecutando limpieza de tablas...\x1b[0m');
    
    // Tablas de datos (dependientes)
    await pool.query('TRUNCATE TABLE caentele CASCADE');
    console.log('  [OK] caentele (telefonos) limpiada');
    
    await pool.query('TRUNCATE TABLE caendire CASCADE');
    console.log('  [OK] caendire (direcciones) limpiada');
    
    await pool.query('TRUNCATE TABLE cacartil CASCADE');
    console.log('  [OK] cacartil (cartilla) limpiada');
    
    await pool.query('TRUNCATE TABLE caentida CASCADE');
    console.log('  [OK] caentida (entidades) limpiada');
    
    // Tablas de catalogos
    await pool.query('TRUNCATE TABLE caespeci CASCADE');
    console.log('  [OK] caespeci (especialidades) limpiada');
    
    await pool.query('TRUNCATE TABLE carubro CASCADE');
    console.log('  [OK] carubro (rubros) limpiada');
    
    await pool.query('TRUNCATE TABLE nulocali CASCADE');
    console.log('  [OK] nulocali (localidades) limpiada');
    
    await pool.query('TRUNCATE TABLE nuprovin CASCADE');
    console.log('  [OK] nuprovin (provincias) limpiada');
    
    await pool.query('TRUNCATE TABLE nupais CASCADE');
    console.log('  [OK] nupais (paises) limpiada');
    
    // Verificar resultado
    const finalCounts = {
      caentele: parseInt((await pool.query('SELECT COUNT(*) FROM caentele')).rows[0].count),
      caendire: parseInt((await pool.query('SELECT COUNT(*) FROM caendire')).rows[0].count),
      cacartil: parseInt((await pool.query('SELECT COUNT(*) FROM cacartil')).rows[0].count),
      caentida: parseInt((await pool.query('SELECT COUNT(*) FROM caentida')).rows[0].count),
      caespeci: parseInt((await pool.query('SELECT COUNT(*) FROM caespeci')).rows[0].count),
      carubro: parseInt((await pool.query('SELECT COUNT(*) FROM carubro')).rows[0].count),
      nulocali: parseInt((await pool.query('SELECT COUNT(*) FROM nulocali')).rows[0].count),
      nuprovin: parseInt((await pool.query('SELECT COUNT(*) FROM nuprovin')).rows[0].count),
      nupais: parseInt((await pool.query('SELECT COUNT(*) FROM nupais')).rows[0].count)
    };
    
    const finalTotal = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);
    
    console.log('');
    console.log('\x1b[32m[OK] TODAS las tablas de cartilla blanqueadas exitosamente\x1b[0m');
    console.log(`     Total de registros restantes: ${finalTotal}`);
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n\x1b[31m[X] Error:\x1b[0m', error.message);
    await pool.end();
    process.exit(1);
  }
}

main();
