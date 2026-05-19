#!/usr/bin/env python3
import re

# Leer el archivo
with open('backend/db/dll_estructura_app.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Procesar línea por línea
output_lines = []
skip_block = False
i = 0

while i < len(lines):
    line = lines[i]
    
    # Detectar el inicio de un bloque de tipo array
    if '-- DROP TYPE public._' in line and i + 2 < len(lines):
        # Verificar si la próxima línea (después de la línea en blanco) es CREATE TYPE public._
        if i + 1 < len(lines) and lines[i + 1].strip() == '':
            if i + 2 < len(lines) and 'CREATE TYPE public._' in lines[i + 2]:
                # Esto es un bloque de tipo array - saltarlo hasta el próximo ;)
                skip_block = True
                i += 1
                continue
    
    if skip_block:
        if ');' in line:
            skip_block = False
            # Saltar también la línea en blanco siguiente si existe
            if i + 1 < len(lines) and lines[i + 1].strip() == '':
                i += 2
            else:
                i += 1
            continue
        i += 1
        continue
    
    output_lines.append(line)
    i += 1

# Guardar el archivo
with open('backend/db/dll_estructura_app.sql', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print(f"DDL limpiado. Líneas originales: {len(lines)}, Líneas finales: {len(output_lines)}")
