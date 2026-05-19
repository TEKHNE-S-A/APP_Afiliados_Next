import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')

  const url = new URL(req.url)
  const afiliadoId = (url.searchParams.get('afiliadoId') ?? '').trim()
  if (!afiliadoId) return fail(400, 'BAD_REQUEST', 'Falta afiliadoId')

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000'
  const endpoint = `${backendUrl}/credencial/constancia.pdf?afiliadoId=${encodeURIComponent(afiliadoId)}`

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.user.accessToken ?? ''}`,
    },
  })

  if (!res.ok) {
    return fail(res.status, 'BACKEND_ERROR', 'No se pudo descargar la constancia PDF')
  }

  const arrayBuffer = await res.arrayBuffer()
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="constancia-${afiliadoId}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
