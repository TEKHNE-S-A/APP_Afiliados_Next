import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'Body JSON inválido')
  }

  const updatedBy = authz.session.user.email ?? authz.session.user.name ?? 'admin'

  try {
    const existing = await prisma.app_credencial_layout.findFirst({
      where: { scope_type: 'GENERAL' },
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
            scope_type: 'GENERAL',
            config_json: body as object,
            updated_by: updatedBy,
          },
        })

    return ok({ message: 'Layout general guardado', version: row.version })
  } catch {
    return fail(500, 'DB_ERROR', 'Error guardando layout general')
  }
}
