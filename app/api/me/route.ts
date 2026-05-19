import { auth } from '@/lib/auth'
import { fail, ok } from '@/lib/api-response'

export async function GET() {
  // Regla estricta: cada handler verifica sesión explícitamente
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  return ok({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
  })
}
