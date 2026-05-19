# Prisma — Baseline y migraciones reproducibles (APP_Afiliados)

Este repo tiene una BD **existente** (Genexus/PostgreSQL) y un `schema.prisma` que estamos usando como modelo.
La meta es que **todo cambio futuro de esquema** sea **reproducible** y quede registrado con **migraciones**.

> Nota Windows: si corrés `prisma generate/migrate` y te aparece `EPERM`, suele ser un lock del engine. Detené el backend (puerto 3000) y reintentá.

---

## Principios

- **Fuente de verdad del modelo**: `backend/prisma/schema.prisma`.
- **Baseline**: no “re-crea” la BD; solo deja a Prisma con un punto inicial consistente.
- **A partir del baseline**: cada cambio de esquema se hace con **Prisma Migrate**.
- Evitar scripts sueltos de alteraciones (los legacy quedan como historial, pero lo nuevo va por migrations).

---

## 1) Baseline (para una BD que ya existe)

Esto se hace **una vez** por entorno/proyecto cuando querés empezar a usar Prisma Migrate sin romper la BD.

### 1.1 Pre-check

Desde `backend/`:

```powershell
npm run -s prisma:validate
```

Opcional (si querés comparar con la BD real / ajustar el schema):

```powershell
npx prisma db pull
npm run -s prisma:validate
```

### 1.2 Generar migration SQL de baseline (sin aplicar)

Esto genera el SQL equivalente a “crear todo desde cero”, pero **no lo ejecuta**.
Sirve para tener un snapshot de referencia en Git.

```powershell
# Estando en backend/
New-Item -ItemType Directory -Force -Path .\prisma\migrations\0000_baseline | Out-Null
npx prisma migrate diff --from-empty --to-schema-datamodel .\prisma\schema.prisma --script > .\prisma\migrations\0000_baseline\migration.sql
```

### 1.3 Marcar baseline como aplicado (sin tocar el esquema)

Esto registra el baseline en la tabla `_prisma_migrations` de la BD.

```powershell
# IMPORTANTE: requiere DATABASE_URL apuntando a la BD que ya existe
npx prisma migrate resolve --applied 0000_baseline
```

> Este paso **no** debería ejecutar DDL de creación; solo registra el estado. Aun así, hacerlo en un entorno controlado.

---

## 2) Cambios futuros (regla: siempre migration)

### 2.1 Crear una migración (dev)

1) Editar `backend/prisma/schema.prisma`.
2) Crear migración:

```powershell
# Estando en backend/
npx prisma migrate dev --name <nombre_corto>
```

Esto:
- genera una carpeta en `backend/prisma/migrations/<timestamp>_<nombre>`
- aplica la migración al DB de desarrollo
- regenera Prisma Client

### 2.2 Aplicar migraciones en un entorno (deploy)

```powershell
# Estando en backend/
npx prisma migrate deploy
```

---

## 3) Convenciones

- Nombre de migración: verbo + entidad, ej: `add_nuusugamrefresh`, `alter_crcredus_nuusuid_varchar`.
- No editar migraciones ya aplicadas en entornos compartidos.
- Si hay que corregir algo: nueva migración.

---

## 4) Interoperabilidad con migraciones legacy

En este repo existen scripts de migración legacy en `backend/db/*` (PowerShell/SQL/Node) y una tabla `schema_migrations` usada por algunos cambios.

Recomendación práctica:
- **Nuevo esquema/cambios**: Prisma Migrate.
- **Legacy existente**: mantener scripts como historial/soporte, pero evitar sumar más scripts sueltos.
