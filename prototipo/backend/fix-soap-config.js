const { Pool } = require('pg')
const pool = new Pool({ host: '127.0.0.1', port: 5432, database: 'app_afiliados_genexus', user: 'postgres', password: '12345678' })

async function main() {
  // Mostrar valores actuales
  const r = await pool.query(`
    SELECT nusisgrupa, nusistippa, nusisvalpa
    FROM nusispar
    WHERE nusisgrupa IN ('WSBENEFTK','WSSIATK') AND nusistippa IN ('Host','Secure','Port')
    ORDER BY nusisgrupa, nusistippa
  `)
  console.log('ANTES:')
  r.rows.forEach(row => console.log(' ', row.nusisgrupa.trim().padEnd(12), row.nusistippa.trim().padEnd(8), JSON.stringify(row.nusisvalpa)))

  // Fix 1: quitar slash del Host de WSBENEFTK
  await pool.query(`
    UPDATE nusispar SET nusisvalpa = TRIM(TRAILING '/' FROM TRIM(nusisvalpa))
    WHERE TRIM(nusisgrupa) = 'WSBENEFTK' AND TRIM(nusistippa) = 'Host'
  `)

  // Fix 2: asegurar Secure=0 en ambos (HTTP, no HTTPS — los servicios escuchan en HTTP:8700)
  await pool.query(`
    UPDATE nusispar SET nusisvalpa = '0'
    WHERE TRIM(nusisgrupa) IN ('WSBENEFTK','WSSIATK') AND TRIM(nusistippa) = 'Secure'
  `)

  // Mostrar valores corregidos
  const r2 = await pool.query(`
    SELECT nusisgrupa, nusistippa, nusisvalpa
    FROM nusispar
    WHERE nusisgrupa IN ('WSBENEFTK','WSSIATK') AND nusistippa IN ('Host','Secure','Port')
    ORDER BY nusisgrupa, nusistippa
  `)
  console.log('DESPUES:')
  r2.rows.forEach(row => console.log(' ', row.nusisgrupa.trim().padEnd(12), row.nusistippa.trim().padEnd(8), JSON.stringify(row.nusisvalpa)))

  // Mostrar URLs que generará el backend
  const beneft = {}
  const siatk  = {}
  const all = await pool.query(`SELECT nusisgrupa, nusistippa, nusisvalpa FROM nusispar WHERE nusisgrupa IN ('WSBENEFTK','WSSIATK')`)
  all.rows.forEach(row => {
    const g = row.nusisgrupa.trim()
    const k = row.nusistippa.trim()
    const v = (row.nusisvalpa || '').trim()
    if (g === 'WSBENEFTK') beneft[k] = v
    if (g === 'WSSIATK')   siatk[k]  = v
  })
  for (const [label, p] of [['WSBENEFTK', beneft], ['WSSIATK', siatk]]) {
    const proto = p.Secure === '1' ? 'https' : 'http'
    const url   = `${proto}://${p.Host}:${p.Port}${p.BaseUrl}${p.Servicio}`
    console.log(`\nURL ${label}: ${url}`)
  }

  await pool.end()
  console.log('\nFix aplicado. Reiniciar backend.')
}

main().catch(e => { console.error(e.message); pool.end() })
