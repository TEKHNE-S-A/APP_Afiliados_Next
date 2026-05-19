import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

const schema = z.object({
  afiliado_id: z.string().min(1).max(60),
  atencion_id: z.string().min(1).max(40),
  entidad_id: z.string().max(40).optional(),
  entidad_nombre: z.string().max(200).optional(),
  puntuacion: z.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional(),
})

/**
 * POST /api/calificaciones
 * Registra una calificación de atención
 */
export async function POST(req: Request) {
  const bearer = await requireMobileAuth(req)
  let userId: string
  if (!bearer.error) {
    userId = bearer.payload.sub
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')
    userId = session.user.id
  }

  let body: unknown
  try { body = await req.json() } catch {
    return fail(400, 'BAD_REQUEST', 'Cuerpo de solicitud inválido')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Datos inválidos')
  }

  const d = parsed.data

  const row = await prisma.app_calificaciones.upsert({
    where: { uq_calificacion_atencion_user: { nuusuid: userId, atencion_id: d.atencion_id } },
    create: {
      nuusuid: userId,
      afiliado_id: d.afiliado_id,
      atencion_id: d.atencion_id,
      entidad_id: d.entidad_id,
      entidad_nombre: d.entidad_nombre,
      puntuacion: d.puntuacion,
      comentario: d.comentario,
    },
    update: {
      puntuacion: d.puntuacion,
      comentario: d.comentario,
      updated_at: new Date(),
    },
  })

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 })
}
