import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-auth'
import { ok, fail } from '@/lib/api-response'

export async function GET(req: Request) {
  const authResult = await requireAdmin(req)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100)

  if (!q) return fail(400, 'BAD_REQUEST', 'El parámetro q es requerido')

  // Buscar usuario por email, DNI (nuusunroaf) o nuusuid
  const dniClean = q.replace(/\D/g, '')
  const user = await prisma.nuusuari.findFirst({
    where: {
      OR: [
        { nuusumail: { equals: q, mode: 'insensitive' } },
        ...(dniClean ? [{ nuusunroaf: { contains: dniClean } }] : []),
        { nuusuid: q },
        { nuusuafili: q },
      ],
    },
    select: {
      nuusuid: true,
      nuusuafili: true,
      nuusuapell: true,
      nuusumail: true,
      nuusunroaf: true,
      nuususexo: true,
      nuplaid: true,
      nuusubajaf: true,
      nuusuactiv: true,
      nurolid: true,
      nuusufecde: true,
      nuusumotde: true,
      nurolper: { select: { nurolnombre: true } },
    },
  })

  if (!user) return fail(404, 'NOT_FOUND', 'Afiliado no encontrado')

  // Dispositivos/tokens push activos (representan sesiones registradas)
  const pushTokens = await prisma.push_tokens.findMany({
    where: { nuusuid: user.nuusuid, activo: true },
    orderBy: { fecha_ultima_actualizacion: 'desc' },
    select: {
      id: true,
      plataforma: true,
      fecha_registro: true,
      fecha_ultima_actualizacion: true,
    },
  })

  // Credenciales del afiliado
  const credencialesCount = await prisma.crcredus.count({
    where: { nuusuid: user.nuusuid },
  })

  // Últimas notificaciones recibidas (como timeline de eventos)
  const ultimasNotifs = await prisma.notifications.findMany({
    where: { nuusuid: user.nuusuid },
    orderBy: { fecha_creacion: 'desc' },
    take: limit,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      mensaje: true,
      leida: true,
      fecha_creacion: true,
    },
  })

  const stats = {
    activeSessions: pushTokens.length,
    credenciales: credencialesCount,
    totalNotificaciones: ultimasNotifs.length,
  }

  // Construir timeline mezclando notificaciones y registros de dispositivos
  const timeline = [
    ...ultimasNotifs.map((n) => ({
      source: 'notif' as const,
      title: `Notificación: ${n.titulo}`,
      summary: n.mensaje,
      when: n.fecha_creacion?.toISOString() ?? '',
      leida: n.leida,
      tipo: n.tipo,
    })),
    ...pushTokens.map((pt) => ({
      source: 'device' as const,
      title: `Dispositivo: ${pt.plataforma}`,
      summary: `Registrado el ${new Date(pt.fecha_registro).toLocaleDateString('es-AR')}`,
      when: pt.fecha_ultima_actualizacion.toISOString(),
    })),
  ].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())

  return ok({
    user: {
      nuusuid: user.nuusuid,
      afiliadoId: user.nuusuafili,
      email: user.nuusumail,
      nombre: user.nuusuapell?.trim(),
      dnCuil: user.nuusunroaf?.trim(),
      plan: user.nuplaid?.trim() ?? null,
      sexo: user.nuususexo?.trim() ?? null,
      activo: user.nuusuactiv === 'S',
      desactivado: !!user.nuusubajaf,
      fechaBaja: user.nuusubajaf?.toISOString() ?? null,
      motivoBaja: user.nuusumotde ?? null,
      fechaDesactivacion: user.nuusufecde?.toISOString() ?? null,
      esAdmin: user.nurolid != null,
      rolNombre: user.nurolper?.nurolnombre ?? null,
    },
    stats,
    devices: pushTokens.map((pt) => ({
      id: pt.id,
      platform: pt.plataforma,
      registradoEl: pt.fecha_registro.toISOString(),
      ultimaActividad: pt.fecha_ultima_actualizacion.toISOString(),
    })),
    timeline,
  })
}
