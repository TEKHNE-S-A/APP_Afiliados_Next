import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { EstadoDesconocimientoValues } from '@/types/enums'

const EstadoSchema = z.object({
  estado: z.enum(EstadoDesconocimientoValues),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const idNum = parseInt(id, 10)
  if (!idNum || idNum <= 0) return fail(400, 'BAD_REQUEST', 'ID inválido')

  let body: unknown
  try { body = await req.json() } catch { return fail(400, 'BAD_REQUEST', 'Body JSON inválido') }

  const parsed = EstadoSchema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '))
  }

  try {
    type Row = { id: number; estado: string; updated_at: Date }
    const rows = await prisma.$queryRaw<Row[]>`
      UPDATE app_desconocimientos
      SET estado = ${parsed.data.estado}, updated_at = NOW()
      WHERE id = ${idNum}
      RETURNING id, estado, updated_at
    `
    if (!rows.length) return fail(404, 'NOT_FOUND', `Desconocimiento ${idNum} no encontrado`)
    return ok(rows[0])
  } catch {
    return fail(500, 'DB_ERROR', 'Error actualizando estado')
  }
}
