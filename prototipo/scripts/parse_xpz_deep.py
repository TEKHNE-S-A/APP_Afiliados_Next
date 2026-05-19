#!/usr/bin/env python3
"""
Parser profundo de XML Genexus (.xpz extraído).
Recorre el árbol XML completo y extrae metadatos detallados por objeto.
Genera JSON y CSV con información completa: ID, nombre, tipo, atributos, propiedades, recursos.
"""
import argparse
import json
import csv
import os
import sys
from xml.etree import ElementTree as ET
from collections import defaultdict


def strip_namespace(tag):
    """Quita namespaces: {http://...}Tag -> Tag"""
    if tag is None:
        return ''
    return tag.rsplit('}', 1)[-1] if '}' in tag else tag


def extract_text_content(elem, max_len=500):
    """Extrae contenido textual de un elemento (iterativo)."""
    text_parts = []
    if elem.text and elem.text.strip():
        text_parts.append(elem.text.strip()[:max_len])
    for child in elem:
        if child.tail and child.tail.strip():
            text_parts.append(child.tail.strip()[:max_len])
    return ' '.join(text_parts)[:max_len]


def get_element_info(elem):
    """Extrae información clave de un elemento."""
    tag = strip_namespace(elem.tag)
    info = {
        'tag': tag,
        'attribs': dict(elem.attrib),
        'text': extract_text_content(elem),
        'children_tags': []
    }
    
    # Registra etiquetas de hijos únicos
    child_tags_set = set()
    for child in elem:
        child_tag = strip_namespace(child.tag)
        child_tags_set.add(child_tag)
    info['children_tags'] = sorted(list(child_tags_set))
    
    return info


def find_identifier(elem):
    """Busca el identificador más probable (id, name, uuid, guid, etc.)."""
    # Primero intenta atributos
    for key in ['Id', 'ID', 'id', 'Name', 'name', 'Uid', 'GUID', 'uuid', 'Uuid']:
        if key in elem.attrib:
            val = elem.attrib[key].strip()
            if val:
                return val
    
    # Luego busca en hijos inmediatos (Id, Name, Uuid, etc.)
    for child in elem:
        child_tag = strip_namespace(child.tag).lower()
        if child_tag in ('id', 'name', 'uuid', 'guid', 'uid', 'caption', 'title'):
            if child.text and child.text.strip():
                return child.text.strip()
    
    return None


def traverse_and_collect(root, target_tags=None):
    """
    Recorre el árbol XML y colecta info de elementos objetivo.
    Si target_tags es None, colecta TODOS los nodos únicos.
    """
    if target_tags is None:
        target_tags = ['object', 'data', 'attribute', 'transaction', 'webpanel', 
                      'procedure', 'report', 'menu', 'panel', 'ObjectType', 'DataType',
                      'WebForm', 'WebPanel', 'Transaction', 'Procedure', 'Report']
    
    target_tags_lower = [t.lower() for t in target_tags]
    collected = defaultdict(list)
    all_tags = set()
    
    def walk(elem, depth=0):
        tag_lower = strip_namespace(elem.tag).lower()
        all_tags.add(strip_namespace(elem.tag))
        
        # Si el tag coincide con un objetivo, colecta
        if tag_lower in target_tags_lower or strip_namespace(elem.tag) in target_tags:
            identifier = find_identifier(elem)
            info = get_element_info(elem)
            info['identifier'] = identifier or 'unknown'
            collected[tag_lower].append(info)
        
        # Recorre hijos
        for child in elem:
            walk(child, depth + 1)
    
    walk(root)
    return collected, sorted(list(all_tags))


def parse_xpz_xml(xml_path, max_depth=None):
    """Parsea el XML y retorna diccionario de colecciones y etiquetas únicas."""
    print(f"Parseando XML: {xml_path}")
    print("Cargando árbol XML (esto puede tardar un momento)...")
    
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        print(f"Raíz XML: {strip_namespace(root.tag)}")
        
        collected, all_tags = traverse_and_collect(root)
        
        return {
            'collected': dict(collected),
            'all_tags': all_tags,
            'root_tag': strip_namespace(root.tag)
        }
    except Exception as e:
        print(f"ERROR al parsear XML: {e}", file=sys.stderr)
        sys.exit(1)


def write_json(outpath, collected, all_tags, root_tag):
    """Escribe resultados a JSON."""
    data = {
        'root_tag': root_tag,
        'all_unique_tags': all_tags,
        'counts': {tag: len(items) for tag, items in collected.items()},
        'items': collected
    }
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return outpath


def write_csv(outpath, collected):
    """Escribe resultados a CSV (una fila por elemento muestreado)."""
    with open(outpath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['type', 'identifier', 'tag', 'text_preview', 'attribs_count', 'children_tags'])
        
        for tag_type, items in sorted(collected.items()):
            for item in items:
                writer.writerow([
                    tag_type,
                    item.get('identifier', 'unknown'),
                    item.get('tag', ''),
                    item.get('text', '')[:100],
                    len(item.get('attribs', {})),
                    '|'.join(item.get('children_tags', []))
                ])
    return outpath


def main():
    parser = argparse.ArgumentParser(
        description='Parser profundo de XML Genexus. Extrae metadatos detallados de objetos.'
    )
    parser.add_argument('-i', '--input', required=True, 
                       help='Ruta al XML extraído (ej: build/xpz_extracted/PRODUCTO_APP_SHEMA_DESA1.xml)')
    parser.add_argument('-o', '--output', required=True,
                       help='Ruta base de salida sin extensión (ej: build/xpz_deep_inventory)')
    
    args = parser.parse_args()
    
    if not os.path.isfile(args.input):
        print(f"ERROR: No se encuentra {args.input}", file=sys.stderr)
        sys.exit(2)
    
    # Parsea
    result = parse_xpz_xml(args.input)
    collected = result['collected']
    all_tags = result['all_tags']
    root_tag = result['root_tag']
    
    # Escribe salidas
    json_path = write_json(args.output + '.json', collected, all_tags, root_tag)
    csv_path = write_csv(args.output + '.csv', collected)
    
    # Resumen
    print("\n=== Resumen ===")
    print(f"Etiquetas únicas en el XML: {len(all_tags)}")
    for tag in sorted(collected.keys()):
        count = len(collected[tag])
        print(f"  {tag}: {count}")
    
    print(f"\nGuardado:")
    print(f"  JSON: {json_path}")
    print(f"  CSV: {csv_path}")


if __name__ == '__main__':
    main()
