#!/usr/bin/env python3
"""
Remueve duplicados y conflictos del DDL
"""

import re

with open('backend/db/dll_estructura_app.sql', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
output_lines = []
seen_sequences = set()
seen_tables = set()
i = 0

while i < len(lines):
    line = lines[i]
    
    # Detectar y evitar secuencias duplicadas
    match = re.match(r'^\s*CREATE SEQUENCE public\.(\w+)', line)
    if match:
        seq_name = match.group(1)
        if seq_name in seen_sequences:
            # Saltar toda la definición de la secuencia
            while i < len(lines) and not re.match(r'^\s*NO CYCLE\s*;', lines[i]):
                i += 1
            i += 1  # Saltar la línea con NO CYCLE;
            continue
        seen_sequences.add(seq_name)
        output_lines.append(line)
        i += 1
        continue
    
    # Detectar y evitar tablas duplicadas
    match = re.match(r'^\s*CREATE TABLE public\.(\w+)', line)
    if match:
        table_name = match.group(1)
        if table_name in seen_tables:
            # Saltar hasta el próximo CREATE o END DE ARCHIVO
            while i < len(lines) and not re.match(r'^\s*(CREATE|$)', lines[i]):
                i += 1
            continue
        seen_tables.add(table_name)
        output_lines.append(line)
        i += 1
        continue
    
    output_lines.append(line)
    i += 1

# Guardar
with open('backend/db/dll_estructura_app.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print(f"Duplicados removidos:")
print(f"  Secuencias únicas: {len(seen_sequences)}")
print(f"  Tablas únicas: {len(seen_tables)}")
print(f"  Líneas finales: {len(output_lines)}")
