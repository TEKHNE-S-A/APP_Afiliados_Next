# Feature Flags — Sistema Completo (Tarea 20)

Fecha de implementación: 16/03/2026

## Resumen

Sistema de feature flags implementado sobre la tabla `nusispar` existente. Permite activar/desactivar funcionalidades sin recompilar la app, con auditoría de cambios automática.

**Criterios de aceptación completados:**
- ✅ Se puede apagar una función sin desplegar app nueva (por parámetro)
- ✅ Hay trazabilidad de qué flags estaban activas (auditoría en nusispar)
- ✅ Impacto bajo: reutiliza infraestructura existente (cache, endpoints, BD, auditoría)

---

## Arquitectura

### Backend

**Servicio:** `backend/featureFlagsService.js`
- Define 14 flags de características (`FLAG_DEFINITIONS`)
- Proporciona funciones helper para acceso
- Agrupa flags por módulo (cartilla, sia, notificaciones, offline, ui, admin, etc.)
- Sin dependencias externas (reutiliza `getParametro` existente)

**Endpoints públicos (sin autenticación):**
- `GET /feature-flags` — Lista todos los flags con metadata
- `GET /feature-flags/:nombre` — Obtener estado de un flag específico
- `GET /feature-flags/modulo/:modulo` — Obtener flags de un módulo

**Integración con sistema existente:**
- Grupo de parámetros: `FUNCIONES_APP` (mayúsculas)
- Tipo de parámetro: nombre del flag (ej: `HabilitarCartilla`)
- Valor: `S` (habilitado) / `N` (deshabilitado)
- Caché: reutiliza cache existente (TTL 60 segundos)

### Mobile

**Hook:** `mobile/src/hooks/useFeatureFlags.ts`
- `useFeatureFlags()` — Hook principal que obtiene y cachea flags
- `useFeatureFlag(nombre)` — Verificación rápida de un flag
- `useModuleFeatures(modulo)` — Obtener todos los flags de un módulo

**Características:**
- Auto-fetch en login (desde `/feature-flags`)
- Caché local en `AsyncStorage` (TTL 5 minutos)
- Fallback a caché si backend no responde
- Funciones helper: `isEnabled()`, `isModuleEnabled()`, `getModuleFlags()`

---

## Flags disponibles

### Cartilla (módulo: `cartilla`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarCartilla` | S | Acceso a cartilla de prestadores |
| `HabilitarInfoUtil` | S | Acceso a información útil |

### Autorizaciones / SIA (módulo: `sia`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarAutorizSinOrden` | S | Solicitud de autorizaciones SIN prescripción (tipo S) |
| `HabilitarAutorizConOden` | S | Solicitud de autorizaciones CON prescripción (tipo P) |

### Historial (módulo: `historial`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarHistorialAtencion` | S | Pantalla de Historial de Atención / Consumo |

### Notificaciones (módulo: `notificaciones`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarNotificaciones` | N | Sistema de notificaciones push |
| `HabilitarNotificacionesCola` | N | Cola offline de notificaciones |

### Modo Offline (módulo: `offline`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarModoOffline` | S | Modo offline completo |
| `HabilitarColaOffline` | N | Cola de acciones para sync offline (futuro) |

### UI y Experiencia (módulo: `ui`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarModoBetaUI` | N | Interfaz experimental / beta features |
| `HabilitarTemaOscuro` | S | Opción de tema oscuro |

### Trámites (módulo: `tramites`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarTramites` | N | Pantalla de Trámites (funcionalidad futura) |

### Admin (módulo: `admin`)
| Flag | Default | Descripción |
|------|---------|-------------|
| `HabilitarDiagnosticoAdmin` | S | Panel de diagnóstico para admins |

---

## Uso

### Backend: Verificar un flag

```javascript
// En server-soap.js o servicio
async function procesarSolicitud() {
  const habilitado = await getParametroBoolean(
    'FUNCIONES_APP', 
    'HabilitarAutorizSinOrden', 
    false  // fallback
  )
  
  if (habilitado) {
    // Procesar solicitud sin orden
  }
}
```

### Backend: Usar el servicio de feature flags

```javascript
const featureFlagsService = require('./featureFlagsService');

// Obtener todos los flags
const todosLosFlags = await featureFlagsService.obtenerTodosLosFlags(getParametro);

// Obtener un flag
const estaHabilitado = await featureFlagsService.obtenerFlag(
  'HabilitarNotificaciones',
  getParametroBoolean
);

// Obtener flags por módulo  
const flagsSIA = await featureFlagsService.obtenerFlagsPorModulo('sia', getParametro);

// Validar si es un flag conocido
const esValido = featureFlagsService.esUsunaFlagValido('HabilitarCartilla');
```

### Mobile: Usar en componente

```typescript
import { useFeatureFlags, useFeatureFlag } from '../hooks/useFeatureFlags'

export function MiPantalla() {
  // Opción 1: Hook completo (múltiples flags)
  const { isEnabled, isModuleEnabled, flags } = useFeatureFlags()
  
  // Opción 2: Hook específico (un flag)
  const notificacionesHabilitadas = useFeatureFlag('HabilitarNotificaciones')
  
  return (
    <View>
      {isEnabled('HabilitarCartilla') && (
        <CartillaSection />
      )}
      
      {isModuleEnabled('sia') && (
        <AutorizacionesSection />
      )}
      
      {notificacionesHabilitadas && (
        <PushNotificationsCenter />
      )}
    </View>
  )
}
```

### Mobile: Obtener flags de un módulo

```typescript
import { useModuleFeatures } from '../hooks/useFeatureFlags'

export function AdminPanel() {
  const adminFlags = useModuleFeatures('admin')
  
  return (
    <View>
      {adminFlags.map(flag => (
        <Text key={flag.nombre}>
          {flag.nombre}: {flag.habilitado ? '✅' : '❌'}
        </Text>
      ))}
    </View>
  )
}
```

---

## Cambiar estado de un flag

### Opción 1: Panel Admin Web (`/admin`)

1. Acceder a `http://localhost:3000/admin`
2. Login: `admin@test.local` / `admin123`
3. Buscar parámetro `FUNCIONES_APP` → tipo `HabilitarXXX`
4. Editar valor: `S` = habilitado, `N` = deshabilitado
5. Cambio se audita automáticamente
6. Cache se recarga al guardar

### Opción 2: Script PowerShell

```powershell
# Habilitar autorizaciones con prescripción
.\manage-parametros.ps1

# Opción 4: Actualizar
# Grupo: FUNCIONES_APP
# Tipo: HabilitarAutorizConOden
# Valor: S
```

### Opción 3: API REST (autenticado)

```bash
# Login
$login = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" `
  -Method POST `
  -Body (@{ username="admin@test.local"; password="admin123" } | ConvertTo-Json) `
  -ContentType "application/json"

$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

# Actualizar flag
Invoke-RestMethod -Uri "http://localhost:3000/admin/parametros/FUNCIONES_APP/HabilitarNotificaciones" `
  -Method PUT `
  -Body (@{ valor="S" } | ConvertTo-Json) `
  -Headers $headers `
  -ContentType "application/json"
```

---

## Instalación y Seed

### 1. Crear tabla (si no existe)

Ya existe en DDL de la BD (tabla `nusispar`).

### 2. Insertar flags iniciales

```bash
# PowerShell
psql -U postgres -d app_afiliados_genexus -f backend/db/seed_feature_flags.sql

# O con npm (si está configurado)
npm run db:seed
```

Verificar:
```sql
SELECT COUNT(*) FROM nusispar WHERE nusisgrupa = 'FUNCIONES_APP';
-- Debe retornar: 14
```

---

## Testing

### Ejecutar suite de tests

```powershell
cd backend
.\test-feature-flags.ps1
```

Valida:
- ✅ GET /feature-flags (todos los flags)
- ✅ GET /feature-flags/:nombre (flag específico)
- ✅ GET /feature-flags/modulo/:modulo (flags por módulo)
- ✅ Compatibilidad con endpoint legacy
- ✅ Manejo de errores (404 para flag inválido)

### Prueba manual desde Postman

```http
GET http://localhost:3000/feature-flags
Authorization: (sin requiere)

#Respuesta:
{
  "success": true,
  "total": 14,
  "totalHabilitados": 10,
  "timestamp": "2026-03-16T...",
  "flags": [
    {
      "nombre": "HabilitarCartilla",
      "habilitado": true,
      "descripcion": "Habilitar acceso a cartilla de prestadores",
      "modulo": "cartilla",
      "impacto": "Alto afiliado"
    },
    ...
  ],
  "porModulo": {
    "cartilla": [...],
    "sia": [...],
    ...
  }
}
```

---

## Auditoría

Todos los cambios en los flags están auditados en `audit_logs` (heredado del sistema de parámetros):

```sql
SELECT * FROM audit_logs 
WHERE entity = 'parametro' 
  AND target LIKE '%FUNCIONES_APP%'
ORDER BY created_at DESC
LIMIT 20;
```

Información registrada:
- Quién cambió (actor)
- Cuándo (timestamp)
- IP de origen
- Parámetro anterior y nuevo (before/after)
- Request ID para trazabilidad

---

## Integración en pantallas

### Ejemplo 1: SolicitudAutorizacionScreen — Mostrar/ocultar tipo "S"

```typescript
export default function SolicitudAutorizacionScreen() {
  const { isEnabled } = useFeatureFlags()
  const [tipo, setTipo] = useState<'P' | 'S'>('P')
  
  const puedeUsarSinOrden = isEnabled('HabilitarAutorizSinOrden')
  
  return (
    <View>
      <Text>Tipo de autorización:</Text>
      
      <TouchableOpacity onPress={() => setTipo('P')}>
        <Text>Con Prescripción</Text>
      </TouchableOpacity>
      
      {puedeUsarSinOrden && (
        <TouchableOpacity onPress={() => setTipo('S')}>
          <Text>Sin Prescripción</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
```

### Ejemplo 2: HomeScreen — Ocultar módulos completos

```typescript
export default function HomeScreen() {
  const { isModuleEnabled } = useFeatureFlags()
  
  return (
    <ScrollView>
      {isModuleEnabled('cartilla') && <CartillaCard />}
      {isModuleEnabled('sia') && <AutorizacionesCard />}
      {isModuleEnabled('historial') && <HistorialCard />}
      {isModuleEnabled('notificaciones') && <NotificacionesHub />}
    </ScrollView>
  )
}
```

---

## Rollout gradual

Para activar una funcionalidad gradualmente:

1. **Fase 1**: Crear flag con valor `N` (deshabilitado)
2. **Fase 2**: Implementar en código (protegido por flag)
3. **Fase 3**: Cambiar a `S` para admins/testing
4. **Fase 4**: Rollout 50% (cambiar en parámetro)
5. **Fase 5**: Monitorear métricas
6. **Fase 6**: Rollout 100% o rollback rápido

Esto es más rápido que CI/CD y permite revertir sin deploy.

---

## Próximas mejoras

- [ ] Dashboard visual de flags (admin web mejorado)
- [ ] Rollout gradual por segmento de usuarios
- [ ] Histórico de cambios por flag
- [ ] Alerts automáticas si flag crítico falla
- [ ] Feature flag analytics (qué flags usan más)
- [ ] A/B testing integrado con flags

---

## Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| Se puede apagar una función sin desplegar app nueva | ✅ Completado |
| Hay trazabilidad de qué flags estaban activas | ✅ Completado (auditoría) |
| Reutiliza infraestructura existente | ✅ Completado |
| Sin impacto en performance (caché) | ✅ Completado |
| Compatible con modo offline | ✅ Completado (caché local) |
| Tests automatizados | ✅ test-feature-flags.ps1 |
| Documentación completa | ✅ Este archivo |

**Tarea 20: COMPLETADA** ✅
