# Base de Datos - APP_Afiliados

## Documentos de Integración

- **[DB_INTEGRATION_SPEC.md](./DB_INTEGRATION_SPEC.md)** - Especificación de integración tabla `nuusuari` (registro de usuarios)
- **[CRCREDEN_INTEGRATION_SPEC.md](./CRCREDEN_INTEGRATION_SPEC.md)** - Sincronización credenciales grupo familiar (`crcreden` + `crcredus`)
- **[README_DB.md](./README_DB.md)** - Documentación técnica DDL y base de datos

## Tablas Principales

### `nuusuari` - Usuarios Registrados
**Flujo**: Formulario registro → Validación SOAP → Guardado automático  
**Docs**: [DB_INTEGRATION_SPEC.md](./DB_INTEGRATION_SPEC.md)

### `crcreden` - Credenciales Grupo Familiar  
**Flujo**: Login → Consulta SOAP → Sincronización automática (detección cambios por hash SHA-256)  
**Docs**: [CRCREDEN_INTEGRATION_SPEC.md](./CRCREDEN_INTEGRATION_SPEC.md)

### `nusispar` - Parámetros Sistema  
**Configuración vigencia**: Controla días hábiles de vigencia para credenciales  
**Setup**: `psql -U postgres -d app_afiliados_genexus -f insert_parametro_vigencia_credencial.sql`  
**Parámetro clave**: `GENERALES.VigenciaCred` → valor por defecto: `10` días hábiles

---

# Database schema (PostgreSQL) — APP_Afiliados

Este directorio contiene el schema inicial para PostgreSQL y notas para aplicar la estructura.

Archivos:
- `schema.sql` — script SQL para crear las tablas iniciales.

Cómo aplicar el schema (forma rápida, usando `psql`):

1. Exporta/define variables de entorno (ejemplo PowerShell):

```powershell
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGUSER = "tu_usuario"
$env:PGPASSWORD = "tu_password"
$env:PGDATABASE = "app_afiliados"
```

2. Ejecutar `psql` (PowerShell / CMD):

```powershell
psql "host=$env:PGHOST port=$env:PGPORT user=$env:PGUSER password=$env:PGPASSWORD dbname=$env:PGDATABASE" -f schema.sql
```

O con la variable PG* estándar en Linux/macOS:

```bash
PGHOST=localhost PGPORT=5432 PGUSER=tu_usuario PGPASSWORD=tu_password PGDATABASE=app_afiliados psql -f schema.sql
```

Notas y recomendaciones:
- El script crea una tabla `app_config` que puede usarse si prefieres almacenar endpoints y otros parámetros en la base de datos en lugar de `backend/config.json`.
- En producción, NO guardes credenciales en texto plano; usa un vault o variables de entorno gestionadas por el despliegue.
- Considera usar un sistema de migraciones (Flyway, Liquibase, Sqitch, Knex, TypeORM migrations) para gestionar cambios posteriores.

Conectar desde Node.js (ejemplo con `pg`):

```js
const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'app_afiliados'
})

(async () => {
  const r = await pool.query('SELECT NOW()')
  console.log(r.rows)
  await pool.end()
})()
```

Mover esto al repositorio:
- Puedes mantener `backend/db/schema.sql` como fuente de verdad.
- Para seeds iniciales, añade `seed.sql` con datos de desarrollo (usuarios demo, etc.).

Si querés, puedo:
- Añadir `seed.sql` con datos de ejemplo (usuario demo, beneficiario demo).
- Añadir un script Node (`backend/db/init_db.js`) que ejecuta `schema.sql` por `child_process` o usando `pg`.
- Integrar la inicialización en `package.json` con un script `npm run db:init`.

Dime si querés que añada `seed.sql` y/o el script de inicialización y si querés que guarde endpoints en la tabla `app_config` en lugar de `config.json` (puedo migrar esa lógica a DB).