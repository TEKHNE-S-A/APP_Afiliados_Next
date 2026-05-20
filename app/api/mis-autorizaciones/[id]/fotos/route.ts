import { auth } from '@/lib/auth'
import { fail, ok } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { prisma } from '@/lib/prisma'

type FotoRow = { ausolfotid: string; foto_base64: string | null; bytes: number | null }

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let nuusuid: string | null = null

  const bearer = await requireMobileAuth(req)
  if (!bearer.error) {
    nuusuid = bearer.payload.sub
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
    nuusuid = session.user.id
  }

  if (!nuusuid) return fail(401, 'UNAUTHORIZED', 'Sesion invalida')

  const { id: ausolicid } = await params
  if (!ausolicid) return fail(400, 'VALIDATION_ERROR', 'ausolicid es requerido')

  try {
    // Verificar propiedad: la solicitud debe pertenecer al usuario autenticado
    const ownership = await prisma.ausolici.findFirst({
      where: { ausolicid: ausolicid.trim(), nuusuid },
      select: { ausolicid: true },
    })

    if (!ownership) {
      return fail(404, 'NOT_FOUND', 'La autorización no existe o no pertenece al usuario autenticado')
    }

    // Consulta raw: ausoaufo no está en el schema Prisma de Next.js
    const rows = await prisma.$queryRaw<FotoRow[]>`
      SELECT
        TRIM(af.ausolfotid) AS ausolfotid,
        encode(af.ausolf, 'base64') AS foto_base64,
        octet_length(af.ausolf) AS bytes
      FROM ausoaufo af
      WHERE af.ausolicid = ${ausolicid.trim()}
      ORDER BY af.ausolfotid ASC
    `

    const fotos = rows
      .map((row) => ({
        id: row.ausolfotid,
        contentType: 'image/jpeg',
        sizeBytes: Number(row.bytes ?? 0),
        dataUrl: row.foto_base64 ? `data:image/jpeg;base64,${row.foto_base64}` : '',
      }))
      .filter((f) => !!f.dataUrl)

    return ok({ success: true, ausolicid, total: fotos.length, fotos })
  } catch (error) {
    console.error('[mis-autorizaciones fotos]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en fotos de autorización')
  }
}
