# Ejemplos SOAP - Servicios SIA

Todos los servicios SIA siguen el mismo patrón de envelope SOAP:

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>NOMBRE_SERVICIO</com:Servicio>
         <com:Parametros>{"parametro1":"valor1","parametro2":"valor2"}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

**Headers HTTP requeridos:**
- `USUARIO`: valor dinámico desde nusispar (WSSIATK.User)
- `PASSWORD`: valor dinámico desde nusispar (WSSIATK.Password)

---

## 1. ENROLAMIENTOS

**Parámetros:**
- `NroInternoPersona` (string): ID interno de la persona
- `Fecha` (string): Fecha en formato DD/MM/YYYY

**Ejemplo REST:**
```bash
POST http://localhost:3000/sia/enrolamientos
Content-Type: application/json

{
  "NroInternoPersona": "63",
  "Fecha": "12/12/2025"
}
```

**SOAP generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>ENROLAMIENTOS</com:Servicio>
         <com:Parametros>{"NroInternoPersona":"63","Fecha":"12/12/2025"}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

---

## 2. REC_SOLICITUDES_APP

**Parámetros Completos:**
- `Mode` (string): Modo de operación
  - `'INS'` = Insertar nueva solicitud
  - `'UPD'` = Actualizar solicitud existente
  - `'DLT'` = Eliminar solicitud
  - `'DSP'` = Consultar/Desplegar solicitudes
- `AUSolId` (number, 12): ID numérico de la solicitud (0 para nuevas, SIA genera el ID)
- `AUSolTipo` (char, 1): Tipo de solicitud (`'P'` = Prestación, `'S'` = Servicio)
- `AUSolUsuAfiliadoId` (varchar, 40): ID del usuario autenticado (nuusuid)
- `AUSolIdExt` (char, 40): UUID de la solicitud generada localmente
- `AUSolNroAfiliado` (char, 20): Número de afiliado
- `AUSolFecha` (date): Fecha de la solicitud (YYYY-MM-DD)
- `AUSolPresTipo` (char, 30): Tipo de prestación/cobertura
- `AUSolGravCodigo` (number, 2): Código de gravedad (0 = Normal)
- `AUSolRefAfiliado` (char, 40): Referencia del afiliado
- `AUSolPresId` (varchar, 40): ID de la prestación
- `AUSolPresCant` (number, 4): Cantidad de prestaciones (por defecto: 1)
- `AUSolObsPref` (char, 40): Profesional preferente/Observaciones
- `Foto` (objeto, opcional): Estructura con array de fotos
  - `FotoItem` (array): Lista de fotos
    - `AUSoFId` (number, 6): ID secuencial de la foto
    - `AUSoFIdExt` (char, 40): UUID de la foto
    - `AUSoFFileName` (varchar, 500): Nombre del archivo
    - `AUSoFFotoBase64` (longvarchar, 2M): Foto en base64

**Ejemplo REST - Modo Consulta (DSP):**
```bash
POST http://localhost:3000/sia/solicitudes
Authorization: Bearer <token>
Content-Type: application/json

{
  "Mode": "DSP"
}
```

**Ejemplo REST - Modo Insertar (INS) con Fotos:**
```bash
POST http://localhost:3000/sia/crear-solicitud
Authorization: Bearer <token>
Content-Type: application/json

{
  "afiliadoId": "000193582000000000001000193582",
  "cobertura": "Consulta médica",
  "referencia": "Consulta cardiología Dr. Pérez",
  "texto": "Paciente con antecedentes cardíacos",
  "profesional": "Dr. Juan Pérez",
  "fotosBase64": [
    "/9j/4AAQSkZJRgABAQEA...",
    "/9j/4AAQSkZJRgABAQEA...",
    "/9j/4AAQSkZJRgABAQEA..."
  ]
}
```

**Payload SOAP Generado (Insertar):**
```json
{
  "Mode": "INS",
  "AUSolId": 0,
  "AUSolTipo": "P",
  "AUSolUsuAfiliadoId": "02f2e08e-c185-4846-992a-8baa2a23afbe",
  "AUSolIdExt": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "AUSolNroAfiliado": "000193582000000000",
  "AUSolFecha": "2025-12-19",
  "AUSolPresTipo": "Consulta médica",
  "AUSolGravCodigo": 0,
  "AUSolRefAfiliado": "Consulta cardiología Dr. Pérez",
  "AUSolPresId": "Consulta médica",
  "AUSolPresCant": 1,
  "AUSolObsPref": "Dr. Juan Pérez",
  "Foto": {
    "FotoItem": [
      {
        "AUSoFId": 1,
        "AUSoFIdExt": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "AUSoFFileName": "solicitud_a1b2c3d4_foto1.jpg",
        "AUSoFFotoBase64": "/9j/4AAQSkZJRgABAQEA..."
      },
      {
        "AUSoFId": 2,
        "AUSoFIdExt": "g2b3c4d5-e6f7-8901-bcde-f12345678901",
        "AUSoFFileName": "solicitud_a1b2c3d4_foto2.jpg",
        "AUSoFFotoBase64": "/9j/4AAQSkZJRgABAQEA..."
      }
    ]
  }
}
```

**SOAP XML generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>REC_SOLICITUDES_APP</com:Servicio>
         <com:Parametros>{"Mode":"INS","AUSolId":0,"AUSolTipo":"P",...}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

**Notas:**
- Para modo `'DSP'` (consulta), el parámetro `AUSolIdExt` se obtiene automáticamente de `req.user.nuusuid`
- Para modo `'INS'` (insertar), se construye el payload completo con todos los campos y fotos
- El array `Foto.FotoItem` es opcional y solo se incluye si hay fotos adjuntas
- Cada foto puede tener hasta 2MB en base64

---

## 3. AUTORIZACION_IMPRIMIR

**Parámetros:**
- `NUUsuAfiliadoID` (string): ID interno del usuario afiliado
- `DelegacionNumero` (number): Número de delegación
- `AutorizacionNumero` (number): Número de autorización

**Ejemplo REST:**
```bash
POST http://localhost:3000/sia/autorizacion-imprimir
Content-Type: application/json

{
  "DelegacionNumero": 1,
  "AutorizacionNumero": 7211
}
```

**SOAP generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>AUTORIZACION_IMPRIMIR</com:Servicio>
         <com:Parametros>{"NUUsuAfiliadoID":"177","DelegacionNumero":1,"AutorizacionNumero":7211}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

**Nota:** El `NUUsuAfiliadoID` se obtiene automáticamente del usuario autenticado

---

## 4. REC_PRESTACIONES_APP

**Parámetros:**
- Ninguno (el servicio no requiere parámetros)

**Ejemplo REST:**
```bash
POST http://localhost:3000/sia/prestaciones
Content-Type: application/json

{}
```

**SOAP generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>REC_PRESTACIONES_APP</com:Servicio>
         <com:Parametros></com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

**Nota:** Este servicio no requiere parámetros, el tag `<Parametros>` se envía vacío

---

## 5. PAGO_COSEGURO_APP

**Parámetros sugeridos:**
- `AfiliadoId` (string): ID del afiliado
- `CoseguroId` (string): ID del coseguro
- `Monto` (string): Monto del pago
- `FormaPago` (string): Forma de pago

**Ejemplo REST:**
```bash
POST http://localhost:3000/sia/pago-coseguro
Content-Type: application/json

{
  "AfiliadoId": "000000001000000000001000000001",
  "CoseguroId": "987654",
  "Monto": "1500.00",
  "FormaPago": "TARJETA"
}
```

---

## 6. COSEGUROS_PENDIENTES_APP

**Parámetros:**
- `AfiliadoId` (string): Número de afiliado o DNI

**Ejemplo REST:**
```bash
GET http://localhost:3000/sia/coseguros-pendientes
```

**SOAP generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>COSEGUROS_PENDIENTES_APP</com:Servicio>
         <com:Parametros>{"AfiliadoId":"24260865"}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

**Nota:** El `AfiliadoId` se obtiene automáticamente del usuario autenticado

---

## 7. HISTORIAL_ATENCION_APP

**Parámetros:**
- `AfiliadoId` (string): ID del afiliado (30 caracteres)
- `DesdeFecha` (string): Fecha desde en formato YYYY-MM-DD
- `HastaFecha` (string): Fecha hasta en formato YYYY-MM-DD
- `Pagina` (number): Número de página (empezando en 1)
- `RegistrosXPagina` (number): Cantidad de registros por página

**Ejemplo REST:**
```bash
GET http://localhost:3000/sia/historial-atencion?DesdeFecha=2025-01-01&HastaFecha=2025-07-01&Pagina=1&RegistrosXPagina=4
```

**SOAP generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>HISTORIAL_ATENCION_APP</com:Servicio>
         <com:Parametros>{"AfiliadoId":"000000265000000000001000000265","DesdeFecha":"2025-01-01","HastaFecha":"2025-07-01","Pagina":1,"RegistrosXPagina":4}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

**Nota:** 
- El `AfiliadoId` se obtiene automáticamente del usuario autenticado
- Formato de fechas: **YYYY-MM-DD** (diferente a otros servicios)
- Soporta paginación para grandes volúmenes de datos

---

## 8. AUDETALLE_CONSUMO_APP

**Parámetros:**
- `NumeroDelegacion` (number): Número de delegación
- `NumeroAutorizacion` (number): Número de autorización

**Ejemplo REST:**
```bash
GET http://localhost:3000/sia/detalle-consumo?NumeroDelegacion=1&NumeroAutorizacion=7211
```

**SOAP generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>AUDETALLE_CONSUMO_APP</com:Servicio>
         <com:Parametros>{"NumeroDelegacion":1,"NumeroAutorizacion":7211}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

---

## Notas de Implementación

1. **Todos los parámetros JSON:** Los parámetros se envían como JSON stringify dentro del tag `<Parametros>`
2. **Formato de fechas:** DD/MM/YYYY (ejemplo: "12/12/2025")
3. **AfiliadoId:** 30 caracteres (9 titular + 12 organización + 9 familiar)
4. **Headers automáticos:** El backend agrega automáticamente USUARIO y PASSWORD desde nusispar
5. **Logs completos:** El backend registra el XML completo del request y response en consola

---

## Verificación de Logs

Para ver el SOAP XML generado, revisar los logs del backend:

```
📤 SOAP SIA REQUEST XML:
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SIA_WS.Execute xmlns="com.tekhne.sia">
      <Servicio>ENROLAMIENTOS</Servicio>
      <Parametros>{"NroInternoPersona":"63","Fecha":"12/12/2025"}</Parametros>
    </SIA_WS.Execute>
  </soap:Body>
</soap:Envelope>
---

📥 SOAP SIA RESPONSE:
<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <SIA_WS.ExecuteResponse xmlns="com.tekhne.sia">
      <Resultado>...</Resultado>
      <Mensajes>...</Mensajes>
    </SIA_WS.ExecuteResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
---
```
