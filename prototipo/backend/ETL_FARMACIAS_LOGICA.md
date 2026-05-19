# Lógica de Detección Automática de Farmacias en ETL

**Fecha:** 29/01/2026  
**Contexto:** Semana 18 - Implementación módulo Farmacias  
**Archivo afectado:** `backend/services/cartillaImportService.js`

## Problema

El JSON origen contiene dos tipos de entidades mezcladas:
1. **Prestadores** (médicos, clínicas, sanatorios, etc.): Tienen rubro y/o especialidad
2. **Farmacias**: NO tienen rubro NI especialidad

Actualmente, el ETL no distingue entre ambos tipos, causando que las farmacias:
- Se importen sin rubro (`carubid = NULL`)
- No sean filtrables por rubroId en la app mobile
- No aparezcan en el módulo "Farmacias" (que filtra por `rubroId='000000008'`)

## Solución

### Regla de Negocio

**Durante el proceso de importación, aplicar la siguiente lógica:**

```javascript
if (!entidad.rubro && !entidad.especialidad) {
  // Es una FARMACIA → Auto-asignar rubroId de farmacias
  entidad.carubid = '000000008'; // FARMACIA (creado en Semana 18)
  console.log('💊 Farmacia detectada automáticamente:', entidad.descripcion);
} else {
  // Es un PRESTADOR → Mantener rubro original
  console.log('🏥 Prestador con rubro:', entidad.rubro, '|', entidad.descripcion);
}
```

### Implementación

**Archivo:** `backend/services/cartillaImportService.js`

**Función a modificar:** `processEntidad(entidad)` o similar (dentro del procesamiento batch)

**Pseudocódigo:**

```javascript
async function processEntidad(jsonRecord) {
  // 1. Validaciones y transformaciones existentes
  const entidad = {
    caentid: jsonRecord.id,
    caentapeno: jsonRecord.descripcion,
    // ... otros campos
  };

  // 2. NUEVA LÓGICA: Detección automática de farmacias
  let carubid = jsonRecord.rubro_id;
  let caespecial = jsonRecord.especialidad_id;

  // Si NO tiene rubro NI especialidad → Es FARMACIA
  if (!carubid && !caespecial) {
    carubid = '000000008'; // rubroId de FARMACIA
    console.log('💊 Farmacia detectada automáticamente:', entidad.caentapeno);
  } else {
    console.log('🏥 Prestador:', jsonRecord.rubro, '|', entidad.caentapeno);
  }

  // 3. Asignar carubid final a la entidad
  entidad.carubid = carubid ? carubid.padEnd(30, ' ') : null;

  // 4. UPSERT en tabla caentida
  await prisma.caentida.upsert({
    where: { caentid: entidad.caentid },
    update: { ...entidad },
    create: { ...entidad }
  });

  return entidad;
}
```

### Validaciones

**Campos a verificar en JSON origen:**

```javascript
// Ambos campos deben ser null, undefined, '' o false
const esVacio = (valor) => !valor || valor === '' || valor === 'null';

const esFarmacia = esVacio(jsonRecord.rubro_id) && 
                   esVacio(jsonRecord.especialidad_id);
```

**Casos edge:**
- ✅ `rubro_id: null`, `especialidad_id: null` → Farmacia
- ✅ `rubro_id: ""`, `especialidad_id: ""` → Farmacia
- ✅ `rubro_id: undefined`, `especialidad_id: undefined` → Farmacia
- ❌ `rubro_id: "000000006"`, `especialidad_id: null` → Prestador (tiene rubro MEDICO)
- ❌ `rubro_id: null`, `especialidad_id: "14201010101"` → Prestador (tiene especialidad)

### Logs y Estadísticas

**Durante importación, separar contadores:**

```javascript
const stats = {
  totalProcesados: 0,
  prestadoresImportados: 0,
  farmaciasDetectadas: 0,
  errores: 0
};

// Al final del proceso
console.log('\n📊 Resumen Importación:');
console.log(`   Total procesados: ${stats.totalProcesados}`);
console.log(`   🏥 Prestadores: ${stats.prestadoresImportados}`);
console.log(`   💊 Farmacias (auto-detectadas): ${stats.farmaciasDetectadas}`);
console.log(`   ❌ Errores: ${stats.errores}`);
```

### Script de Migración Retroactiva (Opcional)

Si ya hay registros importados sin rubro, crear script one-time:

**Archivo:** `backend/db/migrate-farmacias-sin-rubro.js`

```javascript
/**
 * Script para asignar rubroId='000000008' a entidades sin rubro/especialidad
 * (farmacias importadas antes de implementar la lógica de detección)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateFarmacias() {
  // Buscar entidades SIN rubro Y SIN especialidad
  const sinRubro = await prisma.$queryRaw`
    SELECT e.caentid, e.caentapeno, e.carubid
    FROM caentida e
    LEFT JOIN caespeci esp ON e.caentid = esp.caentid
    WHERE e.carubid IS NULL
      AND esp.caespid IS NULL
  `;

  console.log(`💊 Encontradas ${sinRubro.length} posibles farmacias sin rubro`);

  let actualizadas = 0;
  for (const ent of sinRubro) {
    await prisma.caentida.update({
      where: { caentid: ent.caentid },
      data: { carubid: '000000008'.padEnd(30, ' ') }
    });
    actualizadas++;
  }

  console.log(`✅ ${actualizadas} farmacias actualizadas con rubroId='000000008'`);
}

migrateFarmacias()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Testing

### Test unitario del servicio de importación

```javascript
describe('cartillaImportService - Detección Farmacias', () => {
  test('Debe detectar farmacia cuando NO hay rubro NI especialidad', () => {
    const jsonRecord = {
      id: '0000099999',
      descripcion: 'FARMACIA DEL PUEBLO',
      rubro_id: null,
      especialidad_id: null
    };

    const resultado = processEntidad(jsonRecord);
    expect(resultado.carubid).toBe('000000008'); // FARMACIA
  });

  test('Debe mantener rubro cuando prestador tiene rubro', () => {
    const jsonRecord = {
      id: '0000012345',
      descripcion: 'DR JUAN PEREZ',
      rubro_id: '000000006', // MEDICO
      especialidad_id: null
    };

    const resultado = processEntidad(jsonRecord);
    expect(resultado.carubid).toBe('000000006'); // MEDICO
  });
});
```

### Test manual con archivo JSONL de muestra

```powershell
# Crear archivo de prueba con farmacias y prestadores mezclados
$testData = @"
{"id":"0000099991","descripcion":"FARMACIA CENTRAL","direccion":"Av. Principal 123","rubro_id":null,"especialidad_id":null}
{"id":"0000099992","descripcion":"DR GARCIA JUAN","direccion":"Calle 456","rubro_id":"000000006","especialidad_id":"14201010101"}
{"id":"0000099993","descripcion":"FARMACIA SAN JOSE","direccion":"Bv. Norte 789","rubro_id":"","especialidad_id":""}
"@

$testData | Out-File -FilePath "backend\test-farmacias-mix.jsonl" -Encoding UTF8

# Ejecutar importación
node backend\import-cartilla-external.ps1 -Input "backend\test-farmacias-mix.jsonl"

# Verificar en BD
# Farmacia 0000099991 debe tener carubid='000000008'
# Prestador 0000099992 debe tener carubid='000000006'
# Farmacia 0000099993 debe tener carubid='000000008'
```

## Impacto

**Antes de implementar:**
- ❌ Farmacias con `carubid = NULL`
- ❌ No aparecen en filtro `?rubroId=000000008`
- ❌ Módulo Farmacias mobile vacío

**Después de implementar:**
- ✅ Farmacias con `carubid = '000000008'`
- ✅ Filtrables correctamente por rubroId
- ✅ Módulo Farmacias mobile funcional

## Checklist Implementación

- [ ] Actualizar `cartillaImportService.js` con lógica de detección
- [ ] Agregar logs distintivos (💊 vs 🏥)
- [ ] Agregar contadores separados en stats
- [ ] Crear script migración retroactiva (opcional)
- [ ] Tests unitarios de la lógica
- [ ] Test manual con archivo JSONL de muestra
- [ ] Validar importación completa en BD
- [ ] Verificar módulo Farmacias mobile funciona

## Referencias

- Semana 18 - Implementación módulo Farmacias
- `backend/db/insert-rubro-farmacias.js` - Creación rubroId='000000008'
- `mobile/src/screens/FarmaciasScreen.tsx` - UI Farmacias
- `PROJECT_BACKLOG_2026.md` - Semana 18
