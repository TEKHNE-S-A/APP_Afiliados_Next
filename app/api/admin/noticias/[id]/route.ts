import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { z } from 'zod'
import { sanitizeObject } from '@/lib/sanitize'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { TipoNoticiaValues } from '@/types/enums'

const updateSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  contenido: z.string().max(10_000).nullable().optional(),
  tipo: z.enum(TipoNoticiaValues).optional(),
  activa: z.boolean().optional(),
  orden: z.number().int().min(0).max(9999).optional(),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin: z.string().nullable().optional(),
  eliminar_imagen: z.boolean().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return fail(400, 'BAD_REQUEST', 'ID inválido')

  const existing = await prisma.app_noticias.findUnique({ where: { id: numId } })
  if (!existing) return fail(404, 'NOT_FOUND', 'Noticia no encontrada')

  const contentType = req.headers.get('content-type') ?? ''
  let imagen_url = existing.imagen_url

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const titulo = formData.get('titulo')?.toString()
    const contenido = formData.get('contenido')?.toString()
    const activa = formData.get('activa')?.toString()
    const orden = formData.get('orden')?.toString()
    const eliminar_imagen = formData.get('eliminar_imagen')?.toString()
    const file = formData.get('imagen')

    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer())
      const ext = path.extname(file.name || '').toLowerCase() || '.jpg'
      const fileName = `noticia_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'noticias')
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(path.join(uploadsDir, fileName), bytes)
      // Delete old file if it was ours
      if (existing.imagen_url?.startsWith('/uploads/noticias/')) {
        const oldPath = path.join(process.cwd(), 'public', existing.imagen_url)
        await unlink(oldPath).catch(() => null)
      }
      imagen_url = `/uploads/noticias/${fileName}`
    } else if (eliminar_imagen === 'true') {
      if (existing.imagen_url?.startsWith('/uploads/noticias/')) {
        const oldPath = path.join(process.cwd(), 'public', existing.imagen_url)
        await unlink(oldPath).catch(() => null)
      }
      imagen_url = null
    }

    const fi = formData.get('fecha_inicio')?.toString() ?? undefined
    const ff = formData.get('fecha_fin')?.toString() ?? undefined

    const titleFinal = titulo?.trim() || existing.titulo
    const contenidoFinal = contenido !== undefined ? (contenido.trim() || null) : existing.contenido
    const tipoFinal = imagen_url && contenidoFinal ? 'mixta'
                    : imagen_url                   ? 'imagen'
                    : 'texto'

    const updated = await prisma.app_noticias.update({
      where: { id: numId },
      data: {
        titulo: titleFinal,
        contenido: contenidoFinal,
        imagen_url,
        tipo: tipoFinal,
        activa: activa !== undefined ? activa !== 'false' : existing.activa,
        orden: orden !== undefined ? parseInt(orden) : existing.orden,
        fecha_inicio: fi !== undefined ? (fi ? new Date(fi) : null) : existing.fecha_inicio,
        fecha_fin:    ff !== undefined ? (ff ? new Date(ff) : null) : existing.fecha_fin,
        updated_at: new Date(),
      },
    })
    return ok(updated)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const { eliminar_imagen, fecha_inicio, fecha_fin, ...rest } = parsed.data
  const clean = sanitizeObject(rest)

  if (eliminar_imagen) {
    if (existing.imagen_url?.startsWith('/uploads/noticias/')) {
      const oldPath = path.join(process.cwd(), 'public', existing.imagen_url)
      await unlink(oldPath).catch(() => null)
    }
    imagen_url = null
  }

  const contenidoFinal = clean.contenido !== undefined ? clean.contenido : existing.contenido
  const tipoFinal = clean.tipo ?? (
    imagen_url && contenidoFinal ? 'mixta' : imagen_url ? 'imagen' : 'texto'
  )

  const updated = await prisma.app_noticias.update({
    where: { id: numId },
    data: {
      ...clean,
      imagen_url,
      tipo: tipoFinal,
      fecha_inicio: fecha_inicio !== undefined ? (fecha_inicio ? new Date(fecha_inicio) : null) : existing.fecha_inicio,
      fecha_fin: fecha_fin !== undefined ? (fecha_fin ? new Date(fecha_fin) : null) : existing.fecha_fin,
      updated_at: new Date(),
    },
  })
  return ok(updated)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return fail(400, 'BAD_REQUEST', 'ID inválido')

  const existing = await prisma.app_noticias.findUnique({ where: { id: numId } })
  if (!existing) return fail(404, 'NOT_FOUND', 'Noticia no encontrada')

  await prisma.app_noticias.delete({ where: { id: numId } })

  if (existing.imagen_url?.startsWith('/uploads/noticias/')) {
    const filePath = path.join(process.cwd(), 'public', existing.imagen_url)
    await unlink(filePath).catch(() => null)
  }

  return ok({ id: numId })
}
