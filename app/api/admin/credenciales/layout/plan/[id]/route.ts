import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const planId = id.trim()
  if (!planId) return fail(400, 'BAD_REQUEST', 'ID de plan requerido')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'Body JSON inválido')
  }

  const updatedBy = authz.session.user.email ?? authz.session.user.name ?? 'admin'

  try {
    const existing = await prisma.app_credencial_layout.findFirst({
      where: { scope_type: 'PLAN', plan_id: planId },
    })

    const row = existing
      ? await prisma.app_credencial_layout.update({
          where: { id: existing.id },
          data: {
            config_json: body as object,
            updated_by: updatedBy,
            version: { increment: 1 },
            updated_at: new Date(),
          },
        })
      : await prisma.app_credencial_layout.create({
          data: {
            scope_type: 'PLAN',
            plan_id: planId,
            config_json: body as object,
            updated_by: updatedBy,
          },
        })

    return ok({ message: 'Layout de plan guardado', version: row.version })
  } catch {
    return fail(500, 'DB_ERROR', 'Error guardando layout de plan')
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const planId = id.trim()
  if (!planId) return fail(400, 'BAD_REQUEST', 'ID de plan requerido')

  try {
    const existing = await prisma.app_credencial_layout.findFirst({
      where: { scope_type: 'PLAN', plan_id: planId },
    })

    if (!existing) return fail(404, 'NOT_FOUND', 'Override de plan no encontrado')

    await prisma.app_credencial_layout.delete({ where: { id: existing.id } })

    return ok({ message: 'Override de plan eliminado' })
  } catch {
    return fail(500, 'DB_ERROR', 'Error eliminando override de plan')
  }
}
