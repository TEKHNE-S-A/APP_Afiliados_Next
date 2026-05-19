# Base de Datos - APP_Afiliados

## Conexión a PostgreSQL

### Configuración

La conexión a PostgreSQL se gestiona mediante el módulo `pg` (node-postgres) en el archivo `connection.js`.

**Variables de Entorno** (`.env` o valores por defecto):
```bash
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=12345678
DB_NAME=app_afiliados_genexus
```

### Uso del Módulo de Conexión

```javascript
const db = require('./db/connection')

// Ejecutar una query simple
const result = await db.query('SELECT * FROM nuusuari WHERE nuusumail = $1', ['user@example.com'])
console.log(result.rows)

// Para transacciones, obtener un cliente del pool
const client = await db.getClient()
try {
  await client.query('BEGIN')
  await client.query('INSERT INTO nuusuari (...) VALUES (...)')
  await client.query('INSERT INTO audit_logs (...) VALUES (...)')
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  throw e
} finally {
  client.release()
}
```

### Archivos DDL

- `dll_estructura_app_final2.sql` - ✅ **DDL FINAL APLICADO** (50 tablas creadas)
- `dll_estructura_app.sql` - DDL original de Genexus
- `schema.sql` - Esquema básico de aplicación (6 tablas)
- `seed.sql` - Datos de prueba

### Tablas Principales

**Genexus (44 tablas)**:
- `nuusuari` - Usuarios/Afiliados registrados ⭐
- `nuusutok` - Tokens de usuarios
- `crcreden` - Credenciales
- `cacartil` - Cartillas
- ... (ver DDL completo)

**Aplicación (6 tablas)**:
- `users` - Usuarios de la app
- `beneficiaries` - Beneficiarios
- `tramites` - Trámites
- `transactions` - Transacciones
- `app_config` - Configuración
- `audit_logs` - Auditoría

## Integración con Backend

Consultar `DB_INTEGRATION_SPEC.md` para especificaciones detalladas de integración.

**Implementaciones Actuales**:
- ✅ Registro de usuarios en `nuusuari` (POST `/register`)

## Comandos PostgreSQL Útiles

```bash
# Conectar a la base de datos
psql -h 127.0.0.1 -U postgres -d app_afiliados_genexus

# Listar todas las tablas
\dt

# Ver estructura de tabla nuusuari
\d nuusuari

# Contar registros
SELECT COUNT(*) FROM nuusuari;

# Ver últimos registros
SELECT nuusuid, nuusumail, nuusuapell, nuusufecha 
FROM nuusuari 
ORDER BY nuusumailf DESC 
LIMIT 10;
```

## Troubleshooting

### Error: "Connection refused"
- Verificar que PostgreSQL esté corriendo
- Verificar host/port en configuración
- Verificar firewall

### Error: "Password authentication failed"
- Verificar credenciales en `.env` o código
- Verificar `pg_hba.conf` para permitir conexiones locales

### Error: "Database does not exist"
- Crear la base de datos:
  ```sql
  CREATE DATABASE app_afiliados_genexus;
  ```
- Aplicar DDL:
  ```bash
  psql -h 127.0.0.1 -U postgres -d app_afiliados_genexus -f dll_estructura_app_final2.sql
  ```

## Scripts de Conversión DDL

Ver carpeta `scripts/` en la raíz del proyecto:

- `clean_genexus_ddl.py` - Limpia DDL de Genexus para Postgres 10
- `finalize_genexus_ddl.py` - Resuelve conflictos de tipos/tablas
- `insert_drop_type_before_tables.py` - Agrega DROP TYPE antes de tablas

## Referencias

- [node-postgres (pg) Documentation](https://node-postgres.com/)
- PostgreSQL 10 Documentation
- Ver `DDL_GENEXUS_NOTES.md` para notas sobre compatibilidad
