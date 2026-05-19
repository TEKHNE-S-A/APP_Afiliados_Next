import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

async function savePlanImage(file: File): Promise<string> {
  const ext = path.extname(file.name).toLowerCase() || '.jpg'
  const fileName = `${randomUUID()}${ext}`
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'planes')
  await mkdir(uploadsDir, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(path.join(uploadsDir, fileName), Buffer.from(bytes))
  return `/uploads/planes/${fileName}`
}

function localPathFromUrl(imagenUrl: string): string | null {
  if (!imagenUrl.startsWith('/uploads/planes/')) return null
  return path.join(process.cwd(), 'public', imagenUrl)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const planId = id.trim()
  if (!planId) return fail(400, 'BAD_REQUEST', 'ID de plan requerido')

  const existing = await prisma.nuplan.findFirst({
    where: { nuplaid: { equals: planId } },
    select: { nuplaid: true },
  })
  if (!existing) return fail(404, 'NOT_FOUND', `Plan "${planId}" no encontrado`)

  let imagenUrl: string

  const contentType = req.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('imagen')
      if (!file || !(file instanceof File)) {
        return fail(400, 'VALIDATION_ERROR', 'Se requiere el campo "imagen" como archivo')
      }
      imagenUrl = await savePlanImage(file)
    } else {
      let body: unknown
      try {
        body = await req.json()
      } catch {
        return fail(400, 'BAD_REQUEST', 'Body JSON inválido')
      }
      const url = (body as Record<string, unknown>)?.imagen_url
      if (!url || typeof url !== 'string' || !url.trim()) {
        return fail(400, 'VALIDATION_ERROR', 'imagen_url es requerida')
      }
      imagenUrl = url.trim()
    }

    await prisma.nuplan.update({
      where: { nuplaid: planId },
      data: {
        nuplim_gxi: imagenUrl,
        nuplimfech: new Date(),
      },
    })

    return ok({ plan: { id: planId, imagen_url: imagenUrl } })
  } catch {
    return fail(500, 'DB_ERROR', 'Error actualizando imagen del plan')
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const { id } = await params
  const planId = id.trim()
  if (!planId) return fail(400, 'BAD_REQUEST', 'ID de plan requerido')

  try {
    const current = await prisma.nuplan.findFirst({
      where: { nuplaid: { equals: planId } },
      select: { nuplaid: true, nuplim_gxi: true },
    })
    if (!current) return fail(404, 'NOT_FOUND', 'Plan no encontrado')

    if (current.nuplim_gxi) {
      const filePath = localPathFromUrl(current.nuplim_gxi)
      if (filePath) {
        unlink(filePath).catch(() => {})
      }
    }

    await prisma.nuplan.update({
      where: { nuplaid: planId },
      data: {
        nuplim_gxi: null,
        nuplimfech: new Date(),
      },
    })

    return ok({ success: true })
  } catch {
    return fail(500, 'DB_ERROR', 'Error eliminando imagen del plan')
  }
}
