import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-auth'
import { ok, fail } from '@/lib/api-response'

const QuerySchema = z.object({
  days: z
    .string()
    .optional()
    .default('7')
    .transform(Number)
    .pipe(z.number().int().min(1).max(90)),
})

type RawCountRow = { count: bigint }
type RawEventRow = { event: string | null; count: bigint }
type RawModuleRow = { module: string | null; count: bigint }
type RawScreenRow = { screen: string | null; count: bigint }
type RawDailyRow = { date: string; count: bigint }
type RawLastEvent = {
  created_at: Date
  event_name: string
  module: string | null
  screen: string | null
  method: string | null
  path: string | null
  status_code: number | null
  actor: string | null
}

export async function GET(req: Request) {
  const authResult = await requireAdmin(req)
  if (authResult.error) return authResult.error

  const url = new URL(req.url)
  const queryParsed = QuerySchema.safeParse({ days: url.searchParams.get('days') ?? undefined })
  if (!queryParsed.success) {
    return fail(400, 'VALIDATION_ERROR', 'Parámetro days inválido', queryParsed.error.flatten())
  }

  const { days } = queryParsed.data

  try {
    const [totalRows, byEventRows, byModuleRows, topScreensRows, dailyRows, lastEventsRows] =
      await Promise.all([
        prisma.$queryRaw<RawCountRow[]>(Prisma.sql`
          SELECT COUNT(*) AS count
          FROM app_functional_events
          WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
        `),

        prisma.$queryRaw<RawEventRow[]>(Prisma.sql`
          SELECT event_name AS event, COUNT(*) AS count
          FROM app_functional_events
          WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
          GROUP BY event_name
          ORDER BY count DESC
        `),

        prisma.$queryRaw<RawModuleRow[]>(Prisma.sql`
          SELECT module, COUNT(*) AS count
          FROM app_functional_events
          WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
          GROUP BY module
          ORDER BY count DESC
        `),

        prisma.$queryRaw<RawScreenRow[]>(Prisma.sql`
          SELECT screen, COUNT(*) AS count
          FROM app_functional_events
          WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
          GROUP BY screen
          ORDER BY count DESC
          LIMIT 10
        `),

        prisma.$queryRaw<RawDailyRow[]>(Prisma.sql`
          SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date, COUNT(*) AS count
          FROM app_functional_events
          WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY DATE_TRUNC('day', created_at) ASC
        `),

        prisma.$queryRaw<RawLastEvent[]>(Prisma.sql`
          SELECT created_at, event_name, module, screen, method, path, status_code, actor
          FROM app_functional_events
          WHERE created_at >= NOW() - (${days}::int * INTERVAL '1 day')
          ORDER BY created_at DESC
          LIMIT 50
        `),
      ])

    const toNumber = (v: bigint | number) => (typeof v === 'bigint' ? Number(v) : v)

    return ok({
      range: { days },
      totals: {
        events: toNumber(totalRows[0]?.count ?? BigInt(0)),
      },
      byEvent: byEventRows.map((r) => ({ event: r.event, count: toNumber(r.count) })),
      byModule: byModuleRows.map((r) => ({ module: r.module, count: toNumber(r.count) })),
      topScreens: topScreensRows.map((r) => ({ screen: r.screen, count: toNumber(r.count) })),
      daily: dailyRows.map((r) => ({ date: r.date, count: toNumber(r.count) })),
      lastEvents: lastEventsRows.map((r) => ({
        created_at: r.created_at.toISOString(),
        event_name: r.event_name,
        module: r.module,
        screen: r.screen,
        method: r.method,
        path: r.path,
        status_code: r.status_code,
        actor: r.actor,
      })),
    })
  } catch (err) {
    console.error('❌ Error obteniendo analítica funcional:', err)
    return fail(500, 'INTERNAL_ERROR', 'No se pudo obtener analítica funcional')
  }
}

