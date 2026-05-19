import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-auth'
import { ok, fail } from '@/lib/api-response'

const QuerySchema = z.object({
  take: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().positive().max(100)),
  skip: z
    .string()
    .optional()
    .default('0')
    .transform(Number)
    .pipe(z.number().int().min(0)),
  entity: z.string().optional().transform((v) => (v ? v.trim() : undefined)),
  action: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().toUpperCase() : undefined)),
  actor: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().toLowerCase() : undefined)),
})

type AuditRow = {
  id: string
  created_at: Date
  entity: string | null
  entity_id: string | null
  action: string | null
  payload: unknown
}

export async function GET(req: Request) {
  const authResult = await requireAdmin(req)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', parsed.error.issues[0].message)
  }

  const { take, skip, entity, action, actor } = parsed.data

  const conditions: Prisma.Sql[] = []
  if (entity) conditions.push(Prisma.sql`entity = ${entity}`)
  if (action) conditions.push(Prisma.sql`action = ${action}`)
  if (actor) {
    const pattern = `%${actor}%`
    conditions.push(Prisma.sql`(
      LOWER(COALESCE(payload->'actor'->>'email', '')) LIKE ${pattern}
      OR LOWER(COALESCE(payload->'actor'->>'username', '')) LIKE ${pattern}
      OR LOWER(COALESCE(payload->'actor'->>'nuusuid', '')) LIKE ${pattern}
    )`)
  }

  const where =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<AuditRow[]>`
      SELECT id, created_at, entity, entity_id, action, payload
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT ${take} OFFSET ${skip}
    `,
    prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*)::bigint AS total
      FROM audit_logs
      ${where}
    `,
  ])

  const total = Number(countRows[0]?.total ?? BigInt(0))

  const logs = rows.map((row) => {
    const p = row.payload as Record<string, unknown> | null
    const a = p?.actor as Record<string, unknown> | undefined
    return {
      id: row.id,
      created_at: row.created_at.toISOString(),
      entity: row.entity,
      entity_id: row.entity_id ?? ((p?.targetId as string) ?? null),
      action: row.action ?? '',
      actor: (a?.email as string) ?? (a?.username as string) ?? null,
      summary: (p?.summary as string) ?? null,
      ip: (p?.ip as string) ?? null,
    }
  })

  return ok({ logs, total })
}
