import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/cartilla/upload
 * Importa un archivo JSONL de cartilla (un objeto JSON por línea).
 *
 * Formato esperado por línea:
 * {
 *   IdMovimiento: "A|B|M",   // Alta / Baja / Modificación
 *   EntidadId: "0000010001",
 *   EntidadNombre: "...",
 *   EntidadEmail: "...",
 *   EntidadWeb: "...",
 *   EntidadPrioridad: "1",
 *   EntidadDirecciones: [...],
 *   EntidadPlanes: [...]
 * }
 */
export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  let text: string
  try {
    const fd = await req.formData()
    const file = fd.get('file')
    if (!file || typeof file === 'string') {
      return fail(400, 'BAD_REQUEST', 'Falta archivo')
    }
    text = await (file as File).text()
  } catch {
    return fail(400, 'BAD_REQUEST', 'No se pudo leer el archivo')
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (lines.length === 0) {
    return fail(400, 'BAD_REQUEST', 'El archivo está vacío')
  }

  let procesadas = 0
  let insertadas = 0
  let actualizadas = 0
  let errores = 0

  for (const line of lines) {
    let record: Record<string, unknown>
    try {
      record = JSON.parse(line) as Record<string, unknown>
    } catch {
      errores++
      continue
    }

    procesadas++
    const movimiento = String(record.IdMovimiento ?? 'A').toUpperCase()
    const id = String(record.EntidadId ?? '').trim()
    if (!id) { errores++; continue }

    const nombre = String(record.EntidadNombre ?? '').trim().slice(0, 50)
    const email = String(record.EntidadEmail ?? '').slice(0, 100)
    const web = String(record.EntidadWeb ?? '').slice(0, 1000)
    const prioridad = Number(record.EntidadPrioridad ?? 0)

    try {
      if (movimiento === 'B') {
        // Baja lógica
        await prisma.caentida.updateMany({
          where: { caentid: id },
          data: { caentactivo: false, caentmarca: true, caentupdated: new Date() },
        })
        actualizadas++
        continue
      }

      const existing = await prisma.caentida.findUnique({ where: { caentid: id } })

      if (existing) {
        await prisma.caentida.update({
          where: { caentid: id },
          data: {
            caentapeno: nombre || existing.caentapeno,
            caentmail: email || existing.caentmail,
            caentweb: web || existing.caentweb,
            caentprior: isNaN(prioridad) ? existing.caentprior : prioridad,
            caentactivo: true,
            caentmarca: false,
            caentupdated: new Date(),
          },
        })
        actualizadas++
      } else {
        await prisma.caentida.create({
          data: {
            caentid: id,
            caentapeno: nombre,
            caentmail: email,
            caentweb: web,
            caentprior: isNaN(prioridad) ? 0 : prioridad,
            caentmarca: false,
            caentactivo: true,
            caentupdated: new Date(),
          },
        })
        insertadas++
      }
    } catch {
      errores++
    }
  }

  return ok({ procesadas, insertadas, actualizadas, errores })
}
