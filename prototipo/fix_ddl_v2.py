#!/usr/bin/env python3
"""
Procesa el DDL de Genexus para Postgres 10 compatibilidad:
1. Remueve las definiciones de tipos array (CREATE TYPE public._*)
2. Remueve CREATE SCHEMA public (ya existe)
3. Remueve DROP SCHEMA public
4. Mantiene todos los tipos compuestos y tablas
"""

import re

# Leer el archivo original desde backup
try:
    with open('backend/db/dll_estructura_app.sql.bak', 'r', encoding='utf-8') as f:
        content = f.read()
except:
    with open('backend/db/dll_estructura_app.sql', 'r', encoding='utf-8') as f:
        content = f.read()

lines = content.split('\n')
output_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Saltar "CREATE SCHEMA public" y la línea de AUTHORIZATION
    if 'CREATE SCHEMA public' in line:
        i += 1
        # Saltar también líneas comentadas de DROP SCHEMA
        while i < len(lines) and ('AUTHORIZATION' in lines[i] or 'COMMENT ON SCHEMA' in lines[i] or lines[i].strip() == ''):
            i += 1
        continue
    
    # Saltar definiciones de tipos array (CREATE TYPE public._*)
    if re.match(r'^\s*CREATE TYPE public\._', line):
        # Saltar hasta encontrar ");"
        while i < len(lines) and not ')' in lines[i]:
            i += 1
        i += 1  # Saltar la línea con );
        continue
    
    # Saltar comentarios de DROP para tipos array
    if re.match(r'^\s*-- DROP TYPE public\._', line):
        i += 1
        if i < len(lines) and lines[i].strip() == '':
            i += 1
        continue
    
    output_lines.append(line)
    i += 1

# Guardar el resultado
with open('backend/db/dll_estructura_app.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print(f"DDL procesado exitosamente")
print(f"  Líneas originales: {len(lines)}")
print(f"  Líneas finales: {len(output_lines)}")
print(f"  Líneas removidas: {len(lines) - len(output_lines)}")
