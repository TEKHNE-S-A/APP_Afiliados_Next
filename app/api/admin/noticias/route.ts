import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { z } from 'zod'
import { sanitizeObject } from '@/lib/sanitize'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { TipoNoticiaValues } from '@/types/enums'

const createNewsSchema = z.object({
  titulo: z.string().min(1).max(200),
  contenido: z.string().max(10_000).optional(),
  tipo: z.enum(TipoNoticiaValues).default('texto'),
  activa: z.boolean().default(true),
  orden: z.number().int().min(0).max(9999).default(0),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const { take, skip } = parsePagination(url, { take: 20, maxTake: 100 })

  const [data, total] = await prisma.$transaction([
    prisma.app_noticias.findMany({
      orderBy: [{ orden: 'asc' }, { created_at: 'desc' }],
      take,
      skip,
    }),
    prisma.app_noticias.count(),
  ])

  return ok({ data, total, take, skip })
}

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const titulo = String(formData.get('titulo') ?? '')
    const contenido = String(formData.get('contenido') ?? '')
    const file = formData.get('imagen')

    if (!file || !(file instanceof File)) {
      return fail(422, 'VALIDATION_ERROR', 'La imagen es obligatoria para multipart')
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const ext = path.extname(file.name || '').toLowerCase() || '.jpg'
    const fileName = `noticia_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'noticias')

    await mkdir(uploadsDir, { recursive: true })
    await writeFile(path.join(uploadsDir, fileName), bytes)

    const created = await prisma.app_noticias.create({
      data: {
        titulo,
        contenido,
        tipo: 'imagen',
        activa: true,
        orden: 0,
        imagen_url: `/uploads/noticias/${fileName}`,
        fecha_inicio: formData.get('fecha_inicio') ? new Date(String(formData.get('fecha_inicio'))) : null,
        fecha_fin:    formData.get('fecha_fin')    ? new Date(String(formData.get('fecha_fin')))    : null,
      },
    })

    return ok(created, 201)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = createNewsSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const { fecha_inicio, fecha_fin, ...rest } = sanitizeObject(parsed.data)
  const created = await prisma.app_noticias.create({
    data: {
      ...rest,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : null,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : null,
    },
  })
  return ok(created, 201)
}
