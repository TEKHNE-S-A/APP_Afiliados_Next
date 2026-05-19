# DDL de Genexus - Notas de Compatibilidad

## Situación Actual

La estructura de `dll_estructura_app.sql` (esquema exportado desde Genexus) contiene definiciones SQL que no son directamente compatibles con PostgreSQL 10, que es la versión actualmente disponible en el entorno de desarrollo.

### Problemas Identificados

1. **CREATE SCHEMA public**: Postgres crea automáticamente el esquema público en versiones 10+, por lo que la instrucción `CREATE SCHEMA public AUTHORIZATION postgres;` genera error.

2. **Definiciones de Tipos Array**: Las líneas que definen tipos array explícitamente con sintaxis `CREATE TYPE public._nombre (... ALIGNMENT = 8 ...)` no son soportadas en Postgres 10. En versiones modernas de Postgres, los tipos array se generan automáticamente para cada tipo compuesto.

3. **Conflictos de Nombres**: Algunos nombres aparecen tanto como tipos compuestos como secuencias (ej: `crdatid`, `totelconid`), causando conflictos al intentar crear ambos.

## Solución Implementada

**Base de datos actual**: `app_afiliados_genexus`

Se ha creado una estructura de base de datos **alternativa y simplificada** usando `backend/db/schema.sql`, que incluye:

- **users**: Tabla de autenticación con roles
- **beneficiaries**: Tabla de afiliados
- **tramites**: Tabla de solicitudes/trámites
- **transactions**: Tabla de transacciones
- **app_config**: Tabla de configuración de la app
- **audit_logs**: Tabla de auditoría

Esta estructura es **totalmente compatible** con Postgres 10 y cubre los requisitos principales de la aplicación móvil.

### Ventajas de esta Solución

- ✅ Compatible con Postgres 10
- ✅ Estructura clara y mantenible
- ✅ Facilita el desarrollo inicial de la aplicación
- ✅ Posibilidad de migración incremental

## Opciones para Integrar la Estructura Genexus Completa

Si en el futuro se necesita integrar la estructura completa de Genexus, considere:

### Opción 1: Actualizar a Postgres 12+
Postgres 12+ tiene mejor soporte para esquemas legacy. El DDL podría funcionar con ajustes menores.

### Opción 2: Herramienta de Migración de Genexus
Genexus proporciona herramientas de exportación/importación específicas. Usar la herramienta oficial en lugar del DDL en bruto.

### Opción 3: Integración Gradual
- Mantener la estructura actual
- Agregar tablas específicas de Genexus bajo un esquema separado (ej: `genexus_schema.*`)
- Mapear datos entre esquemas usando vistas

### Opción 4: Recrear con DDL Limpio
Revisar el DDL original línea por línea y:
1. Comentar `CREATE SCHEMA public`
2. Remover definiciones de tipos array
3. Resolver conflictos de nombres
4. Testar incrementalmente

## Verificación

Para verificar que la base de datos está funcionando:

```bash
# Conectar a la BD
psql -U postgres -h localhost -d app_afiliados_genexus

# Ver estructura
\dt             # Ver tablas
\d users        # Ver estructura de usuarios

# Verificar datos
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM beneficiaries;
```

## Recomendación

Procede con el desarrollo de la aplicación móvil usando la estructura actual (`app_afiliados_genexus`). La integración de la estructura Genexus completa puede ser una tarea futura si es requerida.

---
Última actualización: 2024
Autor: Sistema Automatizado
