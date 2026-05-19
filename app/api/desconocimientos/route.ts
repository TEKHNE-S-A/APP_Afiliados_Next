import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

const schema = z.object({
  afiliado_id: z.string().min(1).max(60),
  atencion_id: z.string().min(1).max(40),
  nro_delegacion: z.string().max(10).optional(),
  nro_autorizacion: z.string().max(30).optional(),
  prestador_nombre: z.string().max(200).optional(),
  practica_detalle: z.string().optional(),
  motivo: z.string().max(50).optional(),
  descripcion: z.string().optional(),
})

/**
 * POST /api/desconocimientos
 * Registra un desconocimiento de atención
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

  const row = await prisma.app_desconocimientos.create({
    data: {
      nuusuid: userId,
      afiliado_id: d.afiliado_id,
      atencion_id: d.atencion_id,
      nro_delegacion: d.nro_delegacion,
      nro_autorizacion: d.nro_autorizacion,
      prestador_nombre: d.prestador_nombre,
      practica_detalle: d.practica_detalle,
      motivo: d.motivo ?? 'no_reconozco',
      descripcion: d.descripcion,
      estado: 'pendiente',
    },
  })

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 })
}
