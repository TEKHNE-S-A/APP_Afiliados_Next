#!/usr/bin/env python3
"""
Genera `dll_estructura_app_final.sql` a partir de la versión limpia:
- Elimina la marca BOM si existe.
- Detecta todos los nombres de tablas (CREATE TABLE public.<name>)
- Elimina los bloques CREATE TYPE public.<name> AS (...) cuando el nombre coincide con una tabla (evita colisiones tipo vs tabla)
- Añade DROP TABLE IF EXISTS antes de CREATE TABLE
- Conserva secuencias y demás
"""
import re
from pathlib import Path

in_path = Path('backend/db/dll_estructura_app_clean.sql')
out_path = Path('backend/db/dll_estructura_app_final.sql')
text = in_path.read_text(encoding='utf-8')

# Remove BOM if present
if text.startswith('\ufeff'):
    text = text.lstrip('\ufeff')

# Find all table names
table_names = set(re.findall(r"CREATE TABLE public\.(\w+)", text))

# Function to remove CREATE TYPE blocks when name in table_names
pattern_type_block = re.compile(r"-- DROP TYPE public\.(?P<name>\w+);\n\nDROP TYPE IF EXISTS public\.(?P=name) CASCADE;\nCREATE TYPE public\.(?P=name) AS \([\s\S]*?\);\n", re.MULTILINE)

def remove_conflicting_types(s):
    def repl(m):
        name = m.group('name')
        if name in table_names:
            return ''
        return m.group(0)
    return pattern_type_block.sub(repl, s)

text = remove_conflicting_types(text)

# Remove any leftover CREATE TYPE public.<name> AS (...) where name in table_names (in case different formatting)
text = re.sub(r"CREATE TYPE public\.([A-Za-z0-9_]+)\s+AS\s*\([\s\S]*?\);\n", lambda m: '' if m.group(1) in table_names else m.group(0), text, flags=re.MULTILINE)

# Ensure DROP TABLE IF EXISTS before CREATE TABLE
text = re.sub(r"CREATE TABLE public\.(\w+)", lambda m: f"DROP TABLE IF EXISTS public.{m.group(1)} CASCADE;\nCREATE TABLE public.{m.group(1)}", text)

# Ensure DROP SEQUENCE IF EXISTS already present (some exist) - add if missing
text = re.sub(r"(?<!DROP SEQUENCE IF EXISTS public\.)(CREATE SEQUENCE public\.(\w+))", lambda m: f"DROP SEQUENCE IF EXISTS public.{m.group(2)} CASCADE;\n{m.group(1)}", text)

# Save final file without BOM
out_path.write_text(text, encoding='utf-8')
print(f"Wrote {out_path} (tables: {len(table_names)})")
