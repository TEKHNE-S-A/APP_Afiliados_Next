#!/usr/bin/env python3
"""
Limpia y normaliza el DDL exportado por Genexus para facilitar su aplicación en PostgreSQL.
Reglas aplicadas:
- Comentar `CREATE SCHEMA public` y `COMMENT ON SCHEMA public`.
- Eliminar definiciones de tipos array (CREATE TYPE public._*) que contienen ALIGNMENT = ...
- Añadir `DROP TYPE IF EXISTS`, `DROP SEQUENCE IF EXISTS` y `DROP TABLE IF EXISTS` antes de las correspondientes declaraciones CREATE para evitar errores "ya existe".
- Mantener intactos los tipos compuestos `CREATE TYPE public.<name> AS (...)` y `CREATE TABLE`.

Salida: `backend/db/dll_estructura_app_clean.sql`
"""
import re

in_path = 'backend/db/dll_estructura_app.sql.bak' if __import__('os').path.exists('backend/db/dll_estructura_app.sql.bak') else 'backend/db/dll_estructura_app.sql'
out_path = 'backend/db/dll_estructura_app_clean.sql'

with open(in_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1) Comentar CREATE SCHEMA public y COMMENT ON SCHEMA public
content = re.sub(r"CREATE SCHEMA public[\s\S]*?;\n","-- Skipped CREATE SCHEMA public;\n", content, flags=re.IGNORECASE)
content = re.sub(r"COMMENT ON SCHEMA public[\s\S]*?;\n","-- Skipped COMMENT ON SCHEMA public;\n", content, flags=re.IGNORECASE)

# 2) Eliminar definiciones de tipos array public._* (típicamente contienen ALIGNMENT)
content = re.sub(r"-- DROP TYPE public\._[\s\S]*?;\n","", content)
content = re.sub(r"CREATE TYPE public\._[\s\S]*?;\n","", content)

# 3) Inserta DROP IF EXISTS antes de CREATE TYPE/SEQUENCE/TABLE cuando corresponda
# Para cada CREATE TYPE public.name AS ...;
def add_drop_before_create_type(match):
    name = match.group(1)
    return f"DROP TYPE IF EXISTS public.{name} CASCADE;\nCREATE TYPE public.{name} AS ("
content = re.sub(r"CREATE TYPE public\.(\w+)\s+AS\s*\(", add_drop_before_create_type, content)

# For CREATE SEQUENCE
def add_drop_before_sequence(match):
    name = match.group(1)
    return f"DROP SEQUENCE IF EXISTS public.{name} CASCADE;\nCREATE SEQUENCE public.{name}"
content = re.sub(r"CREATE SEQUENCE public\.(\w+)", add_drop_before_sequence, content)

# For CREATE TABLE
def add_drop_before_table(match):
    name = match.group(1)
    return f"DROP TABLE IF EXISTS public.{name} CASCADE;\nCREATE TABLE public.{name}"
content = re.sub(r"CREATE TABLE public\.(\w+)", add_drop_before_table, content)

# 4) Normalize some tokens known to cause oddities (optional)
# Replace weird non-ascii quotes or characters that appeared in logs
content = content.replace('\u2018', "'").replace('\u2019', "'")

# 5) Ensure file ends with newline
if not content.endswith('\n'):
    content += '\n'

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Generated cleaned DDL: {out_path}")
print("Next: review the file and run psql to apply it to your DB.")
