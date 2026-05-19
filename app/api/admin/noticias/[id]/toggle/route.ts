import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return fail(400, 'BAD_REQUEST', 'ID inválido')

  const existing = await prisma.app_noticias.findUnique({ where: { id: numId } })
  if (!existing) return fail(404, 'NOT_FOUND', 'Noticia no encontrada')

  const updated = await prisma.app_noticias.update({
    where: { id: numId },
    data: { activa: !existing.activa, updated_at: new Date() },
  })

  return ok({ id: updated.id, activa: updated.activa })
}
