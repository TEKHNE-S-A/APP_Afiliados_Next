/**
 * seed-ayuda-faq.js
 * Inserta ejemplos de FAQ para la pantalla Centro de Ayuda.
 * Uso: node backend/scripts/seed-ayuda-faq.js
 */
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const prisma = new PrismaClient()

// noinfdescr es CHAR(40) — máx 40 caracteres
// noinflink  es VarChar(1000) — aquí va el texto de respuesta
const FAQ_ITEMS = [
  // ── FAQ general ──
  { tipo: 'T', titulo: 'Descargar credencial digital',      link: 'Desde la pantalla de inicio tocá tu credencial. Podés compartirla como imagen desde el menú que aparece al abrirla.',     telefono: '', direccion: '', geo: '', categoria: 'faq', orden: 10 },
  { tipo: 'T', titulo: 'Token temporal de credencial',      link: 'Código de 3 dígitos que cambia cada 10 minutos. Sirve para validar la credencial al momento de la atención médica.',       telefono: '', direccion: '', geo: '', categoria: 'faq', orden: 20 },
  { tipo: 'T', titulo: 'Uso sin conexión a internet',       link: 'Sí. Si iniciaste sesión al menos una vez, podés ver tus credenciales y datos en modo offline sin conexión.',              telefono: '', direccion: '', geo: '', categoria: 'faq', orden: 30 },
  { tipo: 'T', titulo: 'Actualizar mis datos',              link: 'Los datos se sincronizan automáticamente al iniciar sesión. Si ves datos desactualizados, tocá "Actualizar" en la credencial.',  telefono: '', direccion: '', geo: '', categoria: 'faq', orden: 40 },
  { tipo: 'T', titulo: 'Recuperar contraseña olvidada',     link: 'En la pantalla de login tocá "¿Olvidaste tu contraseña?" e ingresá tu email. Recibirás un enlace para restablecerla.',    telefono: '', direccion: '', geo: '', categoria: 'faq', orden: 50 },

  // ── Credencial ──
  { tipo: 'T', titulo: 'Información de la credencial',      link: 'Contiene nombre, número de afiliado, plan, parentesco y código QR con token temporal para verificación en tiempo real.',   telefono: '', direccion: '', geo: '', categoria: 'credencial', orden: 10 },
  { tipo: 'T', titulo: 'Validez de la credencial digital',  link: 'La credencial digital tiene la misma validez que la tarjeta física en todos los prestadores adheridos a OSEP.',           telefono: '', direccion: '', geo: '', categoria: 'credencial', orden: 20 },
  { tipo: 'T', titulo: 'Credenciales del grupo familiar',   link: 'Desde la sección "Credenciales" podés ver y compartir las credenciales de todos los integrantes del grupo familiar.',      telefono: '', direccion: '', geo: '', categoria: 'credencial', orden: 30 },

  // ── Cartilla ──
  { tipo: 'T', titulo: 'Buscar prestadores médicos',        link: 'En la sección "Cartilla" buscá por nombre o especialidad, o usá el mapa para encontrar prestadores cercanos.',            telefono: '', direccion: '', geo: '', categoria: 'cartilla', orden: 10 },
  { tipo: 'T', titulo: 'Guardar prestadores favoritos',     link: 'En el detalle de un prestador tocá el ícono de corazón. Podés ver todos tus favoritos desde la Cartilla.',                 telefono: '', direccion: '', geo: '', categoria: 'cartilla', orden: 20 },

  // ── Autorizaciones ──
  { tipo: 'T', titulo: 'Solicitar autorización médica',     link: 'Desde "Acceso rápido" tocá "Nueva Solicitud". Seleccioná el tipo, la prestación y completá los datos requeridos.',        telefono: '', direccion: '', geo: '', categoria: 'autorizaciones', orden: 10 },
  { tipo: 'T', titulo: 'Autorización con/sin prescripción', link: '"Con prescripción" requiere foto de receta. "Sin prescripción" no requiere foto; podés indicar la cantidad de unidades.', telefono: '', direccion: '', geo: '', categoria: 'autorizaciones', orden: 20 },

  // ── Contacto ──
  { tipo: 'L', titulo: 'Atención al afiliado',              telefono: '0800 222 6737', link: '', direccion: '', geo: '', categoria: 'contacto', orden: 10 },
  { tipo: 'L', titulo: 'Urgencias 24hs',                    telefono: '107',            link: '', direccion: '', geo: '', categoria: 'contacto', orden: 20 },
  { tipo: 'X', titulo: 'Sitio oficial OSEP',                link: 'https://www.osep.gob.ar', telefono: '', direccion: '', geo: '', categoria: 'contacto', orden: 30 },
  { tipo: 'D', titulo: 'Casa Central OSEP',                 direccion: 'Pedro Molina 1382, Mendoza', geo: '-32.892,-68.823', link: '', telefono: '', categoria: 'contacto', orden: 40 },
]

async function main() {
  console.log('🌱 Insertando ejemplos de FAQ en noinfuti...')

  let inserted = 0
  let skipped = 0

  for (const item of FAQ_ITEMS) {
    // Truncar a 40 chars si es necesario (CHAR(40) en BD)
    const titulo40 = item.titulo.substring(0, 40).padEnd(40, ' ')

    try {
      // Verificar si ya existe por título
      const existing = await prisma.noinfuti.findFirst({
        where: { noinfdescr: { startsWith: item.titulo.substring(0, 38) } },
      })
      if (existing) {
        skipped++
        console.log(`  ⏭  Ya existe: ${item.titulo.substring(0, 38)}...`)
        continue
      }

      await prisma.noinfuti.create({
        data: {
          noinfutili: crypto.randomUUID(),
          noinftipo:  item.tipo,
          noinfdescr: titulo40,
          noinftelef: (item.telefono ?? '').substring(0, 20).padEnd(20, ' '),
          noinfldire: item.direccion ?? '',
          noinfgeolo: (item.geo ?? '').substring(0, 50).padEnd(50, ' '),
          noinim:     Buffer.alloc(0),
          noinim_gxi: null,
          noinflink:  item.link ?? '',
          noinfcate:  item.categoria ?? 'general',
          noinforden: item.orden ?? 0,
        },
      })
      inserted++
      console.log(`  ✅ [${item.categoria}] ${item.titulo.substring(0, 38)}`)
    } catch (err) {
      console.error(`  ❌ Error en "${item.titulo}":`, err.message)
    }
  }

  console.log(`\n📊 Resultado: ${inserted} insertados, ${skipped} ya existían (total ${FAQ_ITEMS.length})`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())

