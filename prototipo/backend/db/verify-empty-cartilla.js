// Verificar que las tablas de cartilla estén vacías
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Leer .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, '');
    }
  });
}

let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:12345678@localhost:5432/app_afiliados_genexus';
dbUrl = dbUrl.replace(/^"|"$/g, '');

const pool = new Pool({ connectionString: dbUrl });

async function verify() {
  console.log('\n🔍 Verificando estado de tablas de cartilla\n');
  
  try {
    const tables = [
      { name: 'caentele', desc: 'Teléfonos' },
      { name: 'caendire', desc: 'Direcciones' },
      { name: 'cacartil', desc: 'Cartilla' },
      { name: 'caentida', desc: 'Entidades' },
      { name: 'caespeci', desc: 'Especialidades' },
      { name: 'carubro', desc: 'Rubros' },
      { name: 'nulocali', desc: 'Localidades' },
      { name: 'nuprovin', desc: 'Provincias' },
      { name: 'nupais', desc: 'Países' }
    ];
    
    let allEmpty = true;
    
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table.name}`);
      const count = parseInt(result.rows[0].count);
      
      if (count === 0) {
        console.log(`  ✅ ${table.desc.padEnd(20)} (${table.name}): VACÍA`);
      } else {
        console.log(`  ❌ ${table.desc.padEnd(20)} (${table.name}): ${count} registros`);
        allEmpty = false;
      }
    }
    
    console.log('');
    if (allEmpty) {
      console.log('✅✅✅ TODAS las tablas están vacías - Listas para importación\n');
    } else {
      console.log('⚠️  Algunas tablas NO están vacías\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verify();
