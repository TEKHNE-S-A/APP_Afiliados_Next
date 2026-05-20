import crypto from 'crypto'
import { z } from 'zod'
import { fail, ok } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { executeBenef, parseSoapResult, getParam } from '@/lib/siaClient'
import { gamCheckUserExists, gamLogin, gamRegisterUser, GamError } from '@/lib/gamClient'

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  dni: z.string().max(20).optional().default(''),
  cuil: z.string().max(20).optional().default(''),
  nroAfiliado: z.string().max(40).optional().default(''),
  sexo: z.string().max(1).optional().default('M'),
  fechaNacimiento: z.string().max(20),
  cantidadIntegrantes: z.number().int().min(1).optional().default(1),
  telefono: z.string().max(30).optional().default(''),
})

// ─── Helpers (portados del backend Express) ───────────────────────────────────

function normalizeSexo(raw: string): string | null {
  const s = String(raw ?? '').trim().toUpperCase()
  if (!s) return null
  if (s === 'F' || s === 'FEMENINO') return 'F'
  if (s === 'M' || s === 'MASCULINO') return 'M'
  if (s === 'N' || s === 'NO_BINARIO' || s === 'X') return 'N'
  const first = s.slice(0, 1)
  return ['F', 'M', 'N'].includes(first) ? first : null
}

function normalizeEsTitular(raw: unknown): string {
  if (typeof raw === 'boolean') return raw ? 'S' : 'N'
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'S' || s === 'N') return s
  if (['SI', 'TRUE', 'T', 'Y', 'YES', '1'].includes(s)) return 'S'
  return 'N'
}

function buildAfiliadoId(titularNro: unknown, organizacionId: unknown, familiarNro: unknown): string {
  return String(titularNro ?? '').padStart(9, '0')
    + String(organizacionId ?? '1').padStart(12, '0')
    + String(familiarNro ?? '').padStart(9, '0')
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

async function ensurePlanExists(planIdRaw: unknown, planDescRaw = ''): Promise<string | null> {
  const planId = String(planIdRaw ?? '').trim().slice(0, 30)
  if (!planId) return null

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM nuplan WHERE TRIM(nuplaid) = TRIM(${planId}) LIMIT 1
  `
  if (Number(rows[0]?.count ?? 0) > 0) return planId

  const planDesc = (String(planDescRaw ?? '').trim() || `PLAN ${planId}`).slice(0, 40)
  await prisma.$executeRaw`
    INSERT INTO nuplan (nuplaid, nupladescr, nuplim, nuplalad, nuplimfech)
    VALUES (${planId}, ${planDesc}, ${Buffer.alloc(0)}, 'N', NOW())
    ON CONFLICT (nuplaid) DO NOTHING
  `
  return planId
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch {
    return fail(400, 'BAD_REQUEST', 'Cuerpo de solicitud inválido')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Datos inválidos')
  }

  const { email, password, cuil, dni, nroAfiliado, sexo, fechaNacimiento, cantidadIntegrantes, telefono } = parsed.data

  if (!cuil && !dni && !nroAfiliado) {
    return fail(400, 'VALIDATION_ERROR', 'Debe proveer al menos uno: cuil, dni o nroAfiliado')
  }

  const sexoNormalizado = normalizeSexo(sexo)
  if (!sexoNormalizado) {
    return fail(400, 'VALIDATION_ERROR', 'El campo sexo es obligatorio y debe ser F, M o N')
  }

  // 1. Verificar email duplicado en nuusuari
  const emailDup = await prisma.nuusuari.findFirst({
    where: { nuusumail: { equals: email, mode: 'insensitive' } },
    select: { nuusuid: true },
  })
  if (emailDup) {
    return fail(409, 'EMAIL_EXISTS', 'Ya existe una cuenta registrada con ese email', {
      code: 'EMAIL_EXISTS_SAME_USER',
      sameUser: true,
      canRecover: true,
      suggestion: 'Puede recuperar su contraseña usando el enlace "¿Olvidó su contraseña?"',
    })
  }

  // 2. Pre-check GAM: verificar si el email ya existe
  const gamEnabled = process.env.GAM_ENABLED === 'true' || process.env.GAM_ENABLED === '1'
  if (gamEnabled) {
    try {
      const { exists } = await gamCheckUserExists(email)
      if (exists) {
        return fail(409, 'USER_ALREADY_EXISTS', 'Este email ya está registrado. Iniciá sesión o recuperá tu contraseña.', {
          shouldLogin: true,
          code: 'USER_ALREADY_EXISTS',
        })
      }
    } catch { /* continuar si falla la verificación */ }
  }

  // 3. SOAP REGISTRACION (WSBENEFTK) con reintentos de variantes
  let afiliadoNro = ''
  let regConCUIL = 'N', regConDoc = 'N', regConNro = 'N'
  if (nroAfiliado) { afiliadoNro = nroAfiliado; regConNro = 'S' }
  else if (dni) { afiliadoNro = dni; regConDoc = 'S' }
  else { afiliadoNro = cuil; regConCUIL = 'S' }

  // Convertir fecha YYYY-MM-DD → DD/MM/YYYY requerido por REGISTRACION
  const partesFecha = fechaNacimiento.split('-')
  const fecNac = partesFecha.length === 3
    ? `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`
    : fechaNacimiento

  const baseParams = {
    AfiliadoNro: afiliadoNro,
    FecNacimiento: fecNac,
    Sexo: sexoNormalizado,
    CantGrupo: String(cantidadIntegrantes),
    TitularNro: '0',
    eMail: email,
    RegistracionConNroAfiliado: regConNro,
    RegistracionConDocumento: regConDoc,
    RegistracionConCUIL: regConCUIL,
  }

  const variantes = [
    { ...baseParams },
    { ...baseParams, Usuario: afiliadoNro },
    { ...baseParams, USUARIO: afiliadoNro },
    { ...baseParams, Usuario: afiliadoNro, USUARIO: afiliadoNro },
  ]

  let soapParsed = null
  for (let i = 0; i < variantes.length; i++) {
    try {
      const r = await executeBenef('REGISTRACION', variantes[i])
      soapParsed = parseSoapResult(r)
      if (soapParsed.ok) break
      const isNombreUsuario = soapParsed.mensajes.some((m) => /nombre de usuario/i.test(m.Description ?? ''))
      if (!isNombreUsuario) break
    } catch (e) {
      console.warn(`[register] SOAP intento ${i + 1} falló:`, (e as Error).message)
    }
  }

  if (!soapParsed?.ok) {
    return fail(400, 'DATOS_INVALIDOS', 'Verificá tus datos e intentá nuevamente.', {
      detalle: soapParsed?.errorDsc ?? 'Error al validar datos',
      mensajes: soapParsed?.mensajes ?? [],
    })
  }

  // 4. Extraer AfiliadoId del resultado SOAP
  const soapPayload = soapParsed.payload
  let resultadoParsed: Record<string, unknown> = {}
  if (typeof soapPayload.Resultado === 'string' && soapPayload.Resultado.trim().startsWith('{')) {
    try { resultadoParsed = JSON.parse(soapPayload.Resultado) } catch { resultadoParsed = soapPayload }
  } else if (soapPayload.Resultado && typeof soapPayload.Resultado === 'object') {
    resultadoParsed = soapPayload.Resultado as Record<string, unknown>
  } else {
    resultadoParsed = soapPayload
  }

  let afiliadoId: string | null = null
  if (resultadoParsed.TitularNro || resultadoParsed.OrganizacionId || resultadoParsed.FamiliarNro) {
    afiliadoId = buildAfiliadoId(resultadoParsed.TitularNro, resultadoParsed.OrganizacionId, resultadoParsed.FamiliarNro)
  } else if (typeof resultadoParsed.AfiliadoId === 'string' && resultadoParsed.AfiliadoId.length === 30) {
    afiliadoId = resultadoParsed.AfiliadoId
  }

  if (!afiliadoId || afiliadoId.length !== 30) {
    return fail(400, 'AFILIADO_NO_ENCONTRADO', 'No encontramos tus datos. Verificá tu información.', {
      detalle: String(resultadoParsed.ErrorDsc ?? 'No se pudo determinar el Afiliado'),
    })
  }

  // 5. Verificar AfiliadoId duplicado en nuusuari
  const afiliadoDup = await prisma.nuusuari.findFirst({
    where: { nuusuafili: afiliadoId },
    select: { nuusuid: true, nuusumail: true },
  })
  if (afiliadoDup) {
    return fail(409, 'YA_REGISTRADO', 'Ya tenés una cuenta. Iniciá sesión.', {
      hint: afiliadoDup.nuusumail ? `Email: ${afiliadoDup.nuusumail.slice(0, 3)}***` : null,
      shouldLogin: true,
      code: 'AFFILIATE_ID_ALREADY_EXISTS',
    })
  }

  // 6. Integración GAM (si está habilitado)
  let nuusuid: string | null = null
  let gamAccessToken: string | null = null
  let gamExpiresIn = 3600

  if (gamEnabled) {
    try {
      // Resolver nombre/apellido desde respuesta SOAP
      const apellidoSoap = String(resultadoParsed.Apellido ?? '').trim()
      const nombreSoap = String(resultadoParsed.Nombre ?? '').trim()

      // Convertir fecha al formato ISO si viene en DD/MM/YYYY
      let fechaNacISO = fechaNacimiento
      if (fechaNacimiento.includes('/')) {
        const p = fechaNacimiento.split('/')
        if (p.length === 3) fechaNacISO = `${p[2]}-${p[1]}-${p[0]}`
      }

      const nroAfiliadoFinal = String(resultadoParsed.AfiliadoNro ?? nroAfiliado ?? cuil ?? dni ?? '')

      const gamData = await gamRegisterUser({
        email,
        password,
        firstName: nombreSoap || 'Afiliado',
        lastName: apellidoSoap || 'Osep',
        telefono,
        nroAfiliado: nroAfiliadoFinal,
        documento: dni,
        cuil,
        sexo: sexoNormalizado,
        fechaNacimiento: fechaNacISO,
        canMiembrosFamiliar: cantidadIntegrantes,
      })
      nuusuid = gamData.userId || null

      // Login para obtener access_token (no crítico)
      try {
        const login = await gamLogin(email, password)
        gamAccessToken = login.access_token
        gamExpiresIn = login.expires_in
        if (!nuusuid && login.user_id) nuusuid = login.user_id
      } catch { /* continuar sin token */ }

    } catch (gamError) {
      const statusCode = gamError instanceof GamError ? gamError.statusCode : 500
      const message = gamError instanceof Error ? gamError.message : 'Error desconocido en GAM'
      return fail(400, 'GAM_REGISTRATION_FAILED', 'No pudimos crear tu cuenta. Verificá tus datos.', {
        statusCode,
        detalle: message,
      })
    }
  }

  // 7. Persistir en nuusuari + nuusuauth
  const apellidoNombre = (() => {
    const ap = String(resultadoParsed.Apellido ?? '').trim()
    const nm = String(resultadoParsed.Nombre ?? '').trim()
    return ap && nm ? `${ap}, ${nm}` : (ap || nm || '')
  })()
  const numeroAfiliado = String(resultadoParsed.AfiliadoNro ?? nroAfiliado ?? cuil ?? dni ?? '').slice(0, 20)
  const esTitular = normalizeEsTitular(resultadoParsed.EsTitular)
  const planId = await ensurePlanExists(
    resultadoParsed.PlanId,
    String(resultadoParsed.Plan ?? resultadoParsed.PlanDescripcion ?? '')
  )
  const passwordHash = hashPassword(password)

  try {
    let finalNuusuid = nuusuid

    if (nuusuid) {
      // INSERT con ID de GAM
      const inserted = await prisma.$queryRaw<Array<{ nuusuid: string }>>`
        INSERT INTO nuusuari (
          nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
          nuusuapell, nuusuestit, nuusutelef, nuusumail, nuusubajaf, nuusunivel
        ) VALUES (
          ${nuusuid}, ${afiliadoId}, ${planId ?? null},
          ${fechaNacimiento}::date, ${numeroAfiliado}, ${sexoNormalizado},
          ${apellidoNombre}, ${esTitular}, ${telefono.slice(0, 20)},
          ${email}, '0001-01-01'::timestamp, 0
        ) RETURNING nuusuid
      `
      finalNuusuid = inserted[0]?.nuusuid ?? nuusuid
    } else {
      // INSERT legacy (PostgreSQL genera el ID)
      const inserted = await prisma.$queryRaw<Array<{ nuusuid: string }>>`
        INSERT INTO nuusuari (
          nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
          nuusuapell, nuusuestit, nuusutelef, nuusumail, nuusubajaf, nuusunivel
        ) VALUES (
          ${afiliadoId}, ${planId ?? null},
          ${fechaNacimiento}::date, ${numeroAfiliado}, ${sexoNormalizado},
          ${apellidoNombre}, ${esTitular}, ${telefono.slice(0, 20)},
          ${email}, '0001-01-01'::timestamp, 0
        ) RETURNING nuusuid
      `
      finalNuusuid = inserted[0]?.nuusuid ?? null
    }

    if (finalNuusuid) {
      await prisma.$executeRaw`
        INSERT INTO nuusuauth (nuusuid, nuusupass)
        VALUES (${finalNuusuid}, ${passwordHash})
        ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = EXCLUDED.nuusupass
      `

      if (gamAccessToken) {
        await prisma.$executeRaw`
          UPDATE nuusuari
          SET nuusugamtok = ${gamAccessToken},
              nuusugamexp = ${new Date(Date.now() + gamExpiresIn * 1000)}
          WHERE nuusuid = ${finalNuusuid}
        `
      }
    }

    nuusuid = finalNuusuid
  } catch (dbError) {
    console.error('[register] Error al guardar en BD:', (dbError as Error).message)
    return fail(500, 'DB_ERROR', 'Error al guardar el registro. Intentá nuevamente.')
  }

  return ok({
    nuusuid,
    afiliadoId,
    apellidoNombre: apellidoNombre || null,
    planId: String(resultadoParsed.PlanId ?? ''),
    esTitular,
    afiliadoNro: String(resultadoParsed.AfiliadoNro ?? ''),
    gam: gamEnabled ? { registered: true, hasToken: !!gamAccessToken } : null,
  })
}
