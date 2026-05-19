'use strict'
/**
 * Genera un documento Word (.docx) con la referencia de los servicios SOAP
 * del sistema WSBENEFTK (Beneficiarios) y WSSIATK (SIA).
 *
 * Uso: node scripts/generar-doc-servicios-soap.js
 * Salida: docs/Referencia_Servicios_SOAP.docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  TableOfContents, StyleLevel, convertInchesToTwip, NumberFormat,
  VerticalAlign, Header, Footer, PageNumber
} = require('docx')
const fs = require('fs')
const path = require('path')

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de estilo
// ──────────────────────────────────────────────────────────────────────────────

const COLOR = {
  title:    '1565C0',   // azul OSEP
  heading1: '0D47A1',
  heading2: '1976D2',
  heading3: '1565C0',
  header_bg:'1565C0',
  header_fg:'FFFFFF',
  alt_row:  'E3F2FD',
  white:    'FFFFFF',
  border:   'BBDEFB',
  code_bg:  'F5F5F5',
  code_txt: '37474F',
  green:    '2E7D32',
  orange:   'E65100',
  red:      'B71C1C',
  gray:     '757575',
}

const FONT = 'Calibri'
const FONT_MONO = 'Consolas'

function bold(text, size = 20, color = '000000') {
  return new TextRun({ text, bold: true, size, font: FONT, color })
}
function normal(text, size = 20, color = '000000') {
  return new TextRun({ text, size, font: FONT, color })
}
function mono(text, size = 18) {
  return new TextRun({ text, size, font: FONT_MONO, color: COLOR.code_txt })
}
function br() {
  return new TextRun({ break: 1 })
}

function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 36, font: FONT, color: COLOR.heading1 })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  })
}
function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, font: FONT, color: COLOR.heading2 })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
  })
}
function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, font: FONT, color: COLOR.heading3 })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
  })
}
function p(children, opts = {}) {
  return new Paragraph({ children, spacing: { before: 80, after: 80 }, ...opts })
}
function separator() {
  return new Paragraph({
    children: [],
    border: { bottom: { color: COLOR.border, size: 6, style: BorderStyle.SINGLE } },
    spacing: { before: 200, after: 200 },
  })
}
function note(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: '⚠️  ', size: 18, font: FONT }),
      new TextRun({ text, size: 18, font: FONT, italics: true, color: COLOR.orange }),
    ],
    spacing: { before: 80, after: 80 },
  })
}
function badge(text, color) {
  return new TextRun({ text: ` ${text} `, bold: true, size: 18, font: FONT, color, highlight: 'yellow' })
}

/** Tabla de datos clave de un servicio */
function infoTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      left:   { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      right:  { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      insideH:{ style: BorderStyle.SINGLE, size: 2, color: COLOR.border },
      insideV:{ style: BorderStyle.SINGLE, size: 2, color: COLOR.border },
    },
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: COLOR.alt_row },
            children: [p([bold(label, 18)])],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [p([mono(value)])],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      })
    ),
  })
}

/** Tabla de campos payload */
function fieldsTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: COLOR.header_bg },
        children: [p([bold(h, 18, COLOR.header_fg)])],
        verticalAlign: VerticalAlign.CENTER,
      })
    ),
  })
  const dataRows = rows.map((cols, i) =>
    new TableRow({
      children: cols.map(c =>
        new TableCell({
          shading: i % 2 === 1 ? { type: ShadingType.CLEAR, fill: COLOR.alt_row } : undefined,
          children: [p([mono(c, 18)])],
          verticalAlign: VerticalAlign.CENTER,
        })
      ),
    })
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      left:   { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      right:  { style: BorderStyle.SINGLE, size: 4, color: COLOR.border },
      insideH:{ style: BorderStyle.SINGLE, size: 2, color: COLOR.border },
      insideV:{ style: BorderStyle.SINGLE, size: 2, color: COLOR.border },
    },
    rows: [headerRow, ...dataRows],
  })
}

function codeBlock(lines) {
  return lines.map(line =>
    new Paragraph({
      children: [mono(line)],
      shading: { type: ShadingType.CLEAR, fill: COLOR.code_bg },
      spacing: { before: 0, after: 0 },
      indent: { left: 360 },
    })
  )
}

function empty() {
  return new Paragraph({ children: [], spacing: { before: 120, after: 0 } })
}

// ──────────────────────────────────────────────────────────────────────────────
// Página de portada
// ──────────────────────────────────────────────────────────────────────────────
function coverPage() {
  return [
    empty(), empty(), empty(),
    new Paragraph({
      children: [new TextRun({ text: 'APP Afiliados OSEP', bold: true, size: 64, font: FONT, color: COLOR.title })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Referencia de Servicios SOAP', bold: true, size: 44, font: FONT, color: COLOR.heading2 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Sistema WSBENEFTK — Beneficiarios', size: 28, font: FONT, color: COLOR.gray })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Sistema WSSIATK — Autorizaciones (SIA)', size: 28, font: FONT, color: COLOR.gray })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 800 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generado: ${new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' })}`, size: 22, font: FONT, color: COLOR.gray })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [], pageBreakBefore: true }),
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// SECCIÓN 1: WSBENEFTK — Beneficiarios
// ──────────────────────────────────────────────────────────────────────────────
function sectionBenef() {
  return [
    h1('1. Sistema WSBENEFTK — Beneficiarios'),
    p([normal('Todos los servicios de este sistema se invocan mediante la función ', 20), mono('callSoapExecute()'), normal(' o ', 20), mono('callSoapExecutePlain()'), normal(' sobre el cliente SOAP de Beneficiarios.', 20)]),
    infoTable([
      ['URL base',     'https://test17.osep.gob.ar:443/OSEP_BENEF17_TEST_WS/com.tekhne.abe_ws'],
      ['Servicio SOAP','BE_WS.Execute'],
      ['Namespace',    'com.tekhne.beneficiarios'],
      ['Header HTTP',  'USUARIO / PASSWORD (valores desde nusispar grupo WSBENEFTK)'],
    ]),
    empty(),

    // ── 1.1 REGISTRACION ──────────────────────────────────────────────────────
    h2('1.1  REGISTRACION'),
    p([normal('Registra un nuevo afiliado. Se invoca desde '), mono('POST /register'), normal('. Usa doble envoltura de payload.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'POST /register'],
      ['Auth',         'No requerida'],
      ['Función SOAP', 'callSoapExecute("REGISTRACION", params)  →  envuelve en {"Parametros":{...}}'],
    ]),

    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "Parametros": {',
      '    "AfiliadoNro":                "0000082018",',
      '    "FecNacimiento":              "15/05/1980",      // DD/MM/YYYY',
      '    "Sexo":                       "M",               // "M", "F" o "N"',
      '    "CantGrupo":                  "3",',
      '    "TitularNro":                 "0",               // siempre "0"',
      '    "eMail":                      "usuario@ejemplo.com",',
      '    "RegistracionConNroAfiliado": "S",               // "S" o "N"',
      '    "RegistracionConDocumento":   "N",',
      '    "RegistracionConCUIL":        "N"',
      '  }',
      '}',
    ]),

    empty(),
    h3('Campos del payload'),
    fieldsTable(
      ['Campo', 'Tipo', 'Obs.'],
      [
        ['AfiliadoNro',                'string', 'Número de afiliado'],
        ['FecNacimiento',              'string', 'Formato DD/MM/YYYY'],
        ['Sexo',                       'string', '"M", "F" o "N"'],
        ['CantGrupo',                  'string', 'Cantidad de integrantes del grupo familiar'],
        ['TitularNro',                 'string', 'Siempre "0"'],
        ['eMail',                      'string', 'Email del usuario (puede estar vacío)'],
        ['RegistracionConNroAfiliado', 'string', '"S" o "N"'],
        ['RegistracionConDocumento',   'string', '"S" o "N"'],
        ['RegistracionConCUIL',        'string', '"S" o "N"'],
      ]
    ),

    empty(),
    h3('Respuesta SOAP — campo Resultado (JSON parseado)'),
    ...codeBlock([
      '{',
      '  "TitularNro":    "000082018",       // 9 dígitos',
      '  "OrganizacionId": "000000000001",   // 12 dígitos',
      '  "FamiliarNro":   "000082018",       // 9 dígitos',
      '  "AfiliadoId":    "000082018000000000001000082018",  // 30 chars (opcional)',
      '  "PlanId":        "001",',
      '  "AfiliadoNro":   "0000082018"',
      '}',
    ]),
    note('AfiliadoId de 30 chars = TitularNro(9) + OrganizacionId(12) + FamiliarNro(9). Si no viene armado, el backend lo construye.'),
    separator(),

    // ── 1.2 APPDATOSCREDENCIALES ─────────────────────────────────────────────
    h2('1.2  APPDATOSCREDENCIALES'),
    p([normal('Obtiene las credenciales del grupo familiar. Se invoca desde '), mono('syncCredencialesGrupoFamiliar()'), normal(' (login, refresh, sync).')]),

    h3('Invocación interna'),
    infoTable([
      ['Disparado por', 'POST /auth/login  •  GET /credenciales/refresh  •  GET /credenciales/sync'],
      ['Auth',          'Requerida (sesión activa)'],
      ['Función SOAP',  'callSoapExecutePlain("APPDATOSCREDENCIALES", params)  →  sin envoltura'],
    ]),

    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "AfiliadoId": "000082018000000000001000082018",',
      '  "CredencialDatos": [',
      '    { "Nombre": "|NOMBRE Y APELLIDO|" },',
      '    { "Nombre": "|NUMERO DE AFILIADO|" },',
      '    { "Nombre": "|PARENTESCO|" },',
      '    { "Nombre": "|DOCUMENTO|" },',
      '    { "Nombre": "|FECHA DE NACIMIENTO|" },',
      '    { "Nombre": "|CUIL|" },',
      '    { "Nombre": "|SEXO|" },',
      '    { "Nombre": "|PLAN|" },',
      '    { "Nombre": "|FECHA VIGENCIA|" },',
      '    { "Nombre": "|LINEA|" }',
      '  ]',
      '}',
    ]),

    empty(),
    h3('Respuesta SOAP — campo Resultado (array, uno por integrante)'),
    ...codeBlock([
      '[',
      '  {',
      '    "AfiliadoId":   "000082018000000000001000082018",',
      '    "PlanId":       "001",',
      '    "AfiliadoCUIL": "20082018789",',
      '    "CredencialDatos": [',
      '      { "Nombre": "NOMBRE Y APELLIDO",   "Valor": "PEREZ, JUAN" },',
      '      { "Nombre": "NUMERO DE AFILIADO",  "Valor": "0000082018" },',
      '      { "Nombre": "PARENTESCO",          "Valor": "TITULAR" },',
      '      { "Nombre": "DOCUMENTO",           "Valor": "08201800" },',
      '      { "Nombre": "FECHA DE NACIMIENTO", "Valor": "1980-05-15" },',
      '      { "Nombre": "CUIL",                "Valor": "20082018789" },',
      '      { "Nombre": "SEXO",                "Valor": "M" },',
      '      { "Nombre": "PLAN",                "Valor": "PLAN OSEP BASICO" },',
      '      { "Nombre": "FECHA VIGENCIA",      "Valor": "2025-12-31" },',
      '      { "Nombre": "LINEA",               "Valor": "https://..." }',
      '    ]',
      '  }',
      ']',
    ]),
    note('FECHA VIGENCIA del SOAP NO se usa. La fecha de vencimiento se calcula siempre como fecha_actual + GENERALES.VigenciaCred días.'),
    separator(),

    // ── 1.3 VALIDAAFIREG ──────────────────────────────────────────────────────
    h2('1.3  VALIDAAFIREG'),
    p([normal('Valida si un afiliado existe y está vigente. Se usa internamente antes de sincronizar credenciales.')]),

    h3('Invocación interna'),
    infoTable([
      ['Disparado por', 'validarMiembroEnBenef()  •  POST /credencial  •  syncCredencialesGrupoFamiliar()'],
      ['Auth',          'Requerida (sesión activa)'],
      ['Función SOAP',  'callSoapExecute("VALIDAAFIREG", params)  →  sin envoltura'],
    ]),

    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "AfiliadoNro": "000082018000000000001000082018",',
      '  "Documento":   "",',
      '  "CUIL":        ""',
      '}',
    ]),

    empty(),
    h3('Respuesta SOAP'),
    p([normal('No devuelve campos propios. Se interpreta a través de los mensajes SOAP:')]),
    fieldsTable(
      ['Condición en mensaje', 'Interpretación', 'Acción backend'],
      [
        ['"no existe el afiliado" / "dado de baja" / "inactivo"', 'Afiliación no vigente', 'HTTP 403 AFILIACION_NO_VIGENTE'],
        ['Sin mensajes de error', 'Afiliado vigente', 'Continúa el flujo'],
      ]
    ),
    note('Resultado se cachea 1 minuto por AfiliadoId para evitar llamadas repetidas.'),
    separator(),

    // ── 1.4 APPBUSCACUIL ──────────────────────────────────────────────────────
    h2('1.4  APPBUSCACUIL'),
    p([bold('⚠️  Estado: DESHABILITADO', 20, COLOR.red), normal('  — el bloque real está dentro de if (false && soapClient). Retorna CUIL simulado.', 20, COLOR.gray)]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'GET /buscar-cuil?dni=12345678&sexo=M'],
      ['Auth',          'No requerida'],
      ['Función SOAP',  'soapClient.ExecuteAsync() directo (no usa callSoapExecute)'],
    ]),

    h3('Payload que enviaría al SOAP (cuando se habilite)'),
    ...codeBlock([
      '{',
      '  "servicio": "APPBUSCACUIL",',
      '  "dni":      "28878765",',
      '  "sexo":     "M"',
      '}',
    ]),

    empty(),
    h3('Respuesta esperada'),
    ...codeBlock([
      '// Campo esperado: CUILDES (u similar)',
      '// Mientras está deshabilitado, devuelve:',
      '{ "cuil": "20-28878765-3" }   // prefijo 20=M, 27=F + dígito aleatorio',
    ]),
    empty(),
    new Paragraph({ children: [], pageBreakBefore: true }),
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// SECCIÓN 2: WSSIATK — SIA
// ──────────────────────────────────────────────────────────────────────────────
function sectionSIA() {
  return [
    h1('2. Sistema WSSIATK — Autorizaciones (SIA)'),
    p([normal('Todos los servicios usan '), mono('callSoapExecuteSIA()'), normal('. Los headers HTTP '), mono('USUARIO'), normal(' y '), mono('PASSWORD'), normal(' se obtienen dinámicamente de '), mono('nusispar'), normal(' grupo '), mono('WSSIATK'), normal('.')]),
    infoTable([
      ['URL base',     'http://tkqa.tekhne.com.ar:8700/PRODUCTO_SIA_QA/com.tekhne.asia_ws'],
      ['Servicio SOAP','SIA_WS.Execute'],
      ['Namespace',    'com.tekhne.sia'],
      ['Header HTTP',  'USUARIO / PASSWORD (desde nusispar grupo WSSIATK)'],
    ]),
    p([normal('Si el payload es vacío, se envía string vacío '), mono('""'), normal(' (no null ni {}).')]),
    empty(),

    // ── 2.1 REC_SOLICITUDES_APP ───────────────────────────────────────────────
    h2('2.1  REC_SOLICITUDES_APP'),
    p([normal('Consulta o gestiona solicitudes de autorización.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'POST /sia/solicitudes'],
      ['Auth',          '✅ Requerida (Bearer token)'],
      ['Script test',   'backend/test-sia-solicitudes.ps1'],
    ]),

    h3('Body recibido por el backend'),
    ...codeBlock([
      '{',
      '  "Mode":       "DSP",                                    // DSP|INS|UPD|DLT',
      '  "AUSolIdExt": "02f2e08e-c185-4846-992a-8baa2a23afbe"   // UUID solicitud (opcional para DSP)',
      '}',
    ]),

    empty(),
    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "Mode":       "DSP",',
      '  "AUSolIdExt": "02f2e08e-c185-4846-992a-8baa2a23afbe"',
      '}',
    ]),

    empty(),
    h3('Respuesta SOAP → Acción backend'),
    p([normal('Parsea con '), mono('parseSoapResult()'), normal(' → '), mono('parsed.payload'), normal('. Si el AUSolIdExt está presente, actualiza tabla '), mono('ausolici'), normal(' con:')]),
    fieldsTable(
      ['Campo BD (ausolici)', 'Origen (campo SOAP)'],
      [
        ['ausoldescr',  'descripción de la solicitud'],
        ['ausoltexto',  'texto observación'],
        ['ausolfecal',  'fecha alta (normalizada YYYY-MM-DD)'],
        ['ausolfecor',  'fecha resolución (normalizada YYYY-MM-DD)'],
        ['ausoltipo',   '"P" (con prescripción) o "S" (sin prescripción)'],
        ['ausolestad',  'estado: PEN|ENV|APR|AUT|REC|ERR'],
        ['ausolcantp',  'cantidad de prestaciones'],
        ['ausolpsoco',  'profesional socio/preferente'],
        ['ausolautnu',  'número de autorización'],
        ['autippreid',  'ID tipo prestación'],
      ]
    ),
    separator(),

    // ── 2.2 AUTORIZACION_IMPRIMIR ─────────────────────────────────────────────
    h2('2.2  AUTORIZACION_IMPRIMIR'),
    p([normal('Obtiene los datos de una autorización para imprimir.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'POST /sia/autorizacion-imprimir'],
      ['Auth',          '✅ Requerida (Bearer token)'],
      ['Script test',   'backend/test-sia-autorizacion-imprimir.ps1'],
    ]),

    h3('Body recibido por el backend'),
    ...codeBlock([
      '{',
      '  "DelegacionNumero":  1,',
      '  "AutorizacionNumero": 7211',
      '}',
    ]),

    empty(),
    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "NUUsuAfiliadoID":    "<nuusuid de la sesión>",   // lo agrega el backend automáticamente',
      '  "DelegacionNumero":   1,',
      '  "AutorizacionNumero": 7211',
      '}',
    ]),
    note('NUUsuAfiliadoID se obtiene de req.session.nuusuid. El cliente NO lo envía.'),

    empty(),
    h3('Respuesta'),
    ...codeBlock(['{ "success": true, "data": <parsed.payload> }']),
    separator(),

    // ── 2.3 REC_PRESTACIONES_APP ─────────────────────────────────────────────
    h2('2.3  REC_PRESTACIONES_APP'),
    p([normal('Obtiene el catálogo completo de prestaciones disponibles.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'POST /sia/prestaciones'],
      ['Auth',          '❌ No requerida'],
      ['Script test',   'backend/test-sia-prestaciones.ps1  /  backend/test-prest.ps1'],
    ]),

    h3('Payload enviado al SOAP'),
    ...codeBlock(['"" ← string vacío (no hay parámetros)']),

    empty(),
    h3('Respuesta SOAP'),
    p([bold('CRÍTICO: ', 18, COLOR.red), normal('el campo ', 18), mono('Resultado'), normal(' llega como STRING JSON, no como objeto. Requiere un ', 18), mono('JSON.parse()'), normal(' extra.', 18)]),
    ...codeBlock([
      '// Resultado (string) → parseado:',
      '[',
      '  { "Id": 101, "Descripcion": "Consulta Médica General" },',
      '  { "Id": 102, "Descripcion": "Análisis de Laboratorio" },',
      '  ...',
      ']',
    ]),

    empty(),
    h3('Respuesta al cliente (tras mapeo)'),
    ...codeBlock([
      '{',
      '  "success": true,',
      '  "prestaciones": [',
      '    { "AULPresID": 101, "AULPresDescripcion": "Consulta Médica General" },',
      '    { "AULPresID": 102, "AULPresDescripcion": "Análisis de Laboratorio" }',
      '  ],',
      '  "total": 2',
      '}',
    ]),
    note('Mapeo: Id → AULPresID  |  Descripcion (con trim) → AULPresDescripcion'),
    separator(),

    // ── 2.4 PAGO_COSEGURO_APP ─────────────────────────────────────────────────
    h2('2.4  PAGO_COSEGURO_APP'),
    p([normal('Registra el pago de un coseguro.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'POST /sia/pago-coseguro'],
      ['Auth',          '❌ No requerida'],
    ]),

    h3('Body recibido (= payload directo al SOAP)'),
    ...codeBlock([
      '{',
      '  "AfiliadoId": "000193582000000000001000193582",',
      '  "CoseguroId": "987654",',
      '  "Monto":      "1500.00",',
      '  "FormaPago":  "TARJETA"',
      '}',
    ]),

    empty(),
    h3('Respuesta'),
    ...codeBlock(['{ "success": true, "data": <parsed.payload> }']),
    separator(),

    // ── 2.5 COSEGUROS_PENDIENTES_APP ──────────────────────────────────────────
    h2('2.5  COSEGUROS_PENDIENTES_APP'),
    p([normal('Consulta los coseguros pendientes de pago del afiliado autenticado.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'GET /sia/coseguros-pendientes'],
      ['Auth',          '✅ Requerida (Bearer token)'],
      ['Script test',   'backend/test-sia-coseguros-pendientes.ps1'],
    ]),
    p([normal('Sin parámetros en el request. El backend obtiene '), mono('AfiliadoId'), normal(' desde '), mono('nuusuari.nuusuafili'), normal(' usando el '), mono('nuusuid'), normal(' de la sesión.')]),

    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "AfiliadoId": "000193582000000000001000193582"',
      '}',
    ]),

    empty(),
    h3('Respuesta'),
    ...codeBlock(['{ "success": true, "data": <parsed.payload> }']),
    separator(),

    // ── 2.6 ENROLAMIENTOS ─────────────────────────────────────────────────────
    h2('2.6  ENROLAMIENTOS'),
    p([normal('Registra enrolamientos o consulta enrolamientos de un afiliado.')]),

    h3('Endpoints REST'),
    infoTable([
      ['POST /sia/enrolamientos',                   '❌ Sin auth — registra enrolamiento'],
      ['GET /sia/enrolamientos-afiliado?AfiliadoId=...', '❌ Sin auth — consulta enrolamientos'],
      ['Script test', 'backend/test-sia-enrolamientos.ps1'],
    ]),

    h3('Payload SOAP — POST'),
    ...codeBlock([
      '{',
      '  "NroInternoPersona": "63",',
      '  "Fecha":             "12/12/2025"   // DD/MM/YYYY',
      '}',
    ]),

    empty(),
    h3('Flujo GET /sia/enrolamientos-afiliado'),
    p([normal('El backend transforma '), mono('AfiliadoId'), normal(' → '), mono('NroInternoPersona'), normal(' extrayendo los últimos 9 dígitos del '), mono('crcreid'), normal(' de la tabla '), mono('crcreden'), normal('. La fecha usada es la del día actual.')]),

    empty(),
    h3('Parsing de respuesta GET — 3 estructuras posibles'),
    ...codeBlock([
      '// Opción 1: objeto con propiedad Enrolamientos',
      '{ "Enrolamientos": [ {...}, {...} ] }',
      '',
      '// Opción 2: objeto con propiedad EnrolamientoItem',
      '{ "EnrolamientoItem": [ {...} ] }',
      '',
      '// Opción 3: array directo',
      '[ {...}, {...} ]',
      '',
      '// Todas se normalizan a:',
      '{ "success": true, "data": { "Enrolamientos": [...] } }',
    ]),
    separator(),

    // ── 2.7 HISTORIAL_ATENCION_APP ────────────────────────────────────────────
    h2('2.7  HISTORIAL_ATENCION_APP'),
    p([normal('Consulta el historial de atenciones del afiliado con paginación y filtro de fechas.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'GET /sia/historial-atencion'],
      ['Auth',          '✅ Requerida (Bearer token)'],
      ['Script test',   'backend/test-sia-historial-atencion.ps1'],
    ]),

    h3('Query params'),
    fieldsTable(
      ['Parámetro', 'Tipo', 'Default', 'Descripción'],
      [
        ['DesdeFecha',       'string (YYYY-MM-DD)', 'hoy − HistorialVigencia días', 'Fecha inicio del rango'],
        ['HastaFecha',       'string (YYYY-MM-DD)', 'hoy',  'Fecha fin del rango'],
        ['Pagina',           'number', '1',   'Número de página'],
        ['RegistrosXPagina', 'number', '10',  'Registros por página'],
        ['AfiliadoId',       'string', 'AfiliadoId de la sesión', 'Para miembro del grupo familiar'],
      ]
    ),
    note('⚠️  ÚNICO servicio SIA con fechas en formato YYYY-MM-DD. Todos los demás usan DD/MM/YYYY.'),

    empty(),
    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "AfiliadoId":       "000193582000000000001000193582",',
      '  "DesdeFecha":       "2025-01-01",   // YYYY-MM-DD',
      '  "HastaFecha":       "2025-07-01",   // YYYY-MM-DD',
      '  "Pagina":            1,',
      '  "RegistrosXPagina": 10',
      '}',
    ]),

    empty(),
    h3('Respuesta'),
    ...codeBlock(['{ "success": true, "data": <parsed.payload> }']),
    p([normal('El parámetro '), mono('FUNCIONES_APP.HistorialVigencia'), normal(' (default 180 días) controla el rango máximo cuando no se envía fecha.')]),
    separator(),

    // ── 2.8 AUDETALLE_CONSUMO_APP ─────────────────────────────────────────────
    h2('2.8  AUDETALLE_CONSUMO_APP'),
    p([normal('Devuelve el detalle de consumo de una autorización específica.')]),

    h3('Endpoint REST'),
    infoTable([
      ['Método + Ruta', 'GET /sia/detalle-consumo?NumeroDelegacion=1&NumeroAutorizacion=7211'],
      ['Auth',          '❌ No requerida'],
      ['Script test',   'backend/test-sia-detalle-consumo.ps1'],
    ]),

    h3('Query params'),
    fieldsTable(
      ['Parámetro', 'Tipo', 'Requerido', 'Descripción'],
      [
        ['NumeroDelegacion',  'number', 'Sí', 'Número de la delegación'],
        ['NumeroAutorizacion','number', 'Sí', 'Número de la autorización'],
      ]
    ),

    empty(),
    h3('Payload enviado al SOAP'),
    ...codeBlock([
      '{',
      '  "NumeroDelegacion":  1,',
      '  "NumeroAutorizacion": 7211',
      '}',
    ]),

    empty(),
    h3('Respuesta'),
    ...codeBlock(['{ "success": true, "data": <parsed.payload> }']),
    empty(),
    new Paragraph({ children: [], pageBreakBefore: true }),
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// SECCIÓN 3: Tabla resumen general
// ──────────────────────────────────────────────────────────────────────────────
function sectionResumen() {
  return [
    h1('3. Tabla Resumen'),

    h2('3.1  Sistema WSBENEFTK — Beneficiarios'),
    fieldsTable(
      ['Servicio', 'Endpoint REST', 'Auth', 'Función SOAP', 'Envoltura', 'Estado'],
      [
        ['REGISTRACION',        'POST /register',            'No',  'callSoapExecute',      'Sí {"Parametros":{}}', 'Activo'],
        ['APPDATOSCREDENCIALES','syncCredencialesGrupoFamiliar()','Sesión','callSoapExecutePlain', 'No (plano)',         'Activo'],
        ['VALIDAAFIREG',        'Interno (varias funciones)','Sesión','callSoapExecute',      'No (plano)',         'Activo'],
        ['APPBUSCACUIL',        'GET /buscar-cuil',          'No',  'ExecuteAsync directo', 'N/A',                 '⚠️ Deshabilitado'],
      ]
    ),

    empty(),
    h2('3.2  Sistema WSSIATK — SIA'),
    fieldsTable(
      ['Servicio', 'Endpoint REST', 'Auth', 'Payload clave'],
      [
        ['REC_SOLICITUDES_APP',    'POST /sia/solicitudes',               '✅', 'Mode, AUSolIdExt'],
        ['AUTORIZACION_IMPRIMIR',  'POST /sia/autorizacion-imprimir',     '✅', 'DelegacionNumero, AutorizacionNumero (+NUUsuAfiliadoID auto)'],
        ['REC_PRESTACIONES_APP',   'POST /sia/prestaciones',              '❌', 'Vacío: ""   →   Resultado como STRING JSON'],
        ['PAGO_COSEGURO_APP',      'POST /sia/pago-coseguro',             '❌', 'AfiliadoId, CoseguroId, Monto, FormaPago'],
        ['COSEGUROS_PENDIENTES_APP','GET /sia/coseguros-pendientes',      '✅', 'AfiliadoId (desde sesión)'],
        ['ENROLAMIENTOS',          'POST /sia/enrolamientos',             '❌', 'NroInternoPersona, Fecha (DD/MM/YYYY)'],
        ['HISTORIAL_ATENCION_APP', 'GET /sia/historial-atencion',         '✅', 'AfiliadoId, DesdeFecha, HastaFecha (⚠️ YYYY-MM-DD), Pagina, RegistrosXPagina'],
        ['AUDETALLE_CONSUMO_APP',  'GET /sia/detalle-consumo',            '❌', 'NumeroDelegacion, NumeroAutorizacion'],
      ]
    ),
    empty(),
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// Ensamblar documento
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const children = [
    ...coverPage(),
    ...sectionBenef(),
    ...sectionSIA(),
    ...sectionResumen(),
  ]

  const doc = new Document({
    creator: 'APP Afiliados OSEP — GitHub Copilot',
    title: 'Referencia Servicios SOAP — APP Afiliados',
    description: 'Documentación de payloads y respuestas de los servicios SOAP WSBENEFTK y WSSIATK',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.2),
            right:  convertInchesToTwip(1.2),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'APP Afiliados OSEP — Referencia Servicios SOAP', size: 16, font: FONT, color: COLOR.gray }),
              ],
              alignment: AlignmentType.RIGHT,
              border: { bottom: { color: COLOR.border, size: 4, style: BorderStyle.SINGLE } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Página ', size: 16, font: FONT, color: COLOR.gray }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: COLOR.gray }),
                new TextRun({ text: '  |  Generado ' + new Date().toLocaleDateString('es-AR'), size: 16, font: FONT, color: COLOR.gray }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { color: COLOR.border, size: 4, style: BorderStyle.SINGLE } },
            }),
          ],
        }),
      },
      children,
    }],
  })

  const outDir = path.join(__dirname, '..', 'docs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'Referencia_Servicios_SOAP.docx')

  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(outPath, buffer)
  console.log('✅ Documento generado en:', outPath)
}

main().catch(err => {
  console.error('❌ Error al generar documento:', err)
  process.exit(1)
})
