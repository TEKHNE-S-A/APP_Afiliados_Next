import { prisma } from '@/lib/prisma'
import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo') ?? 'todos'
  const sexo = url.searchParams.get('sexo') ?? ''
  const plan = url.searchParams.get('plan') ?? ''
  const edadMinRaw = url.searchParams.get('edadMin')
  const edadMaxRaw = url.searchParams.get('edadMax')
  const plataforma = url.searchParams.get('plataforma') ?? ''
  const edadMin = edadMinRaw ? parseInt(edadMinRaw, 10) : null
  const edadMax = edadMaxRaw ? parseInt(edadMaxRaw, 10) : null

  try {
    const where: Prisma.nuusuariWhereInput = {
      nuusuactiv: 'S',
      nuusubajaf: null,
    }
    if (tipo === 'titular') where.nuusuestit = 'S'
    else if (tipo === 'familiar') where.nuusuestit = 'N'
    if (sexo) where.nuususexo = sexo
    if (plan) where.nuplaid = { contains: plan, mode: 'insensitive' }

    let users = await prisma.nuusuari.findMany({
      where,
      select: { nuusuid: true, nuusufecha: true },
    })

    if (edadMin != null || edadMax != null) {
      const now = new Date()
      users = users.filter((u) => {
        const fecha = new Date(u.nuusufecha)
        let age = now.getFullYear() - fecha.getFullYear()
        const m = now.getMonth() - fecha.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < fecha.getDate())) age--
        if (edadMin != null && age < edadMin) return false
        if (edadMax != null && age > edadMax) return false
        return true
      })
    }

    let dispositivosPlat: number | null = null
    if (plataforma && users.length > 0) {
      dispositivosPlat = await prisma.push_tokens.count({
        where: {
          nuusuid: { in: users.map((u) => u.nuusuid) },
          plataforma,
          activo: true,
        },
      })
    }

    return ok({ total: users.length, dispositivosPlat })
  } catch {
    return fail(500, 'DB_ERROR', 'Error calculando destinatarios')
  }
}
