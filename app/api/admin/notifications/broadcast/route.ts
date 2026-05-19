import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { z } from 'zod'
import { sanitizeObject } from '@/lib/sanitize'
import crypto from 'node:crypto'
import { Prisma } from '@prisma/client'
import {
  AudienciaBroadcastValues,
  CategoriaNotificacionValues,
  PlataformaPushValues,
} from '@/types/enums'

const FiltrosSchema = z.object({
  tipo: z.enum(AudienciaBroadcastValues).default('todos'),
  sexo: z.string().max(1).default(''),
  plan: z.string().max(50).default(''),
  edadMin: z.coerce.number().int().min(0).max(130).nullish(),
  edadMax: z.coerce.number().int().min(0).max(130).nullish(),
  plataforma: z.enum(PlataformaPushValues).default(''),
})

const BroadcastSchema = z.object({
  titulo: z.string().min(1).max(80),
  mensaje: z.string().min(1).max(1000),
  categoria: z.enum(CategoriaNotificacionValues).default('noticias'),
  filtros: FiltrosSchema.default({}),
})

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = BroadcastSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const clean = sanitizeObject(parsed.data) as z.infer<typeof BroadcastSchema>
  const { titulo, mensaje, categoria, filtros } = clean

  // ── 1. Resolver usuarios del segmento ────────────────────────────────────
  const where: Prisma.nuusuariWhereInput = {
    nuusuactiv: 'S',
    nuusubajaf: null,
  }
  if (filtros.tipo === 'titular') where.nuusuestit = 'S'
  else if (filtros.tipo === 'familiar') where.nuusuestit = 'N'
  if (filtros.sexo) where.nuususexo = filtros.sexo
  if (filtros.plan) where.nuplaid = { contains: filtros.plan, mode: 'insensitive' }

  let users = await prisma.nuusuari.findMany({
    where,
    select: { nuusuid: true, nuusufecha: true },
  })

  // Filtrar por edad si corresponde
  if (filtros.edadMin != null || filtros.edadMax != null) {
    const now = new Date()
    users = users.filter((u) => {
      const fecha = new Date(u.nuusufecha)
      let age = now.getFullYear() - fecha.getFullYear()
      const m = now.getMonth() - fecha.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < fecha.getDate())) age--
      if (filtros.edadMin != null && age < filtros.edadMin) return false
      if (filtros.edadMax != null && age > filtros.edadMax) return false
      return true
    })
  }

  // ── 2. Aplicar preferencias de notificación ───────────────────────────────
  const nuusuids = users.map((u) => u.nuusuid)
  const disabledPrefs =
    nuusuids.length > 0
      ? await prisma.nu_notif_prefs.findMany({
          where: { nuusuid: { in: nuusuids }, categoria, in_app: false },
          select: { nuusuid: true },
        })
      : []
  const disabledSet = new Set(disabledPrefs.map((p) => p.nuusuid))
  const toNotify = users.filter((u) => !disabledSet.has(u.nuusuid))
  const omitidosPref = users.length - toNotify.length

  // ── 3. Crear notificaciones in-app ────────────────────────────────────────
  let inAppCreadas = 0
  if (toNotify.length > 0) {
    const result = await prisma.notifications.createMany({
      data: toNotify.map((u) => ({
        id: crypto.randomUUID(),
        nuusuid: u.nuusuid,
        tipo: categoria,
        titulo: String(titulo),
        mensaje: String(mensaje),
        metadata: { source: 'admin-broadcast', categoria },
      })),
      skipDuplicates: true,
    })
    inAppCreadas = result.count
  }

  // ── 4. Contar push tokens disponibles ─────────────────────────────────────
  const pushEnviados =
    toNotify.length > 0
      ? await prisma.push_tokens.count({
          where: {
            nuusuid: { in: toNotify.map((u) => u.nuusuid) },
            activo: true,
            ...(filtros.plataforma ? { plataforma: filtros.plataforma } : {}),
          },
        })
      : 0

  // ── 5. Armar label de segmento ────────────────────────────────────────────
  const segmentoParts = [
    filtros.tipo !== 'todos' ? filtros.tipo : '',
    filtros.sexo ? `sexo:${filtros.sexo}` : '',
    filtros.plan ? `plan:${filtros.plan}` : '',
    filtros.edadMin != null || filtros.edadMax != null
      ? `edad:${filtros.edadMin ?? 0}-${filtros.edadMax ?? '∞'}`
      : '',
    filtros.plataforma || '',
  ].filter(Boolean)
  const segmento = segmentoParts.length > 0 ? segmentoParts.join(', ') : 'todos'

  return ok(
    {
      stats: {
        usuarios: users.length,
        in_app_creadas: inAppCreadas,
        push_enviados: pushEnviados,
        omitidos_pref: omitidosPref,
        errores: 0,
      },
      segmento,
    },
    201,
  )
}
