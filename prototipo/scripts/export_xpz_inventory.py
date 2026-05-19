#!/usr/bin/env python3
"""
Exportador de inventario desde un XML de exportación Genexus (.xpz extraído).

Genera dos archivos: JSON y CSV con el inventario de nodos encontrados.

Uso:
  python .\scripts\export_xpz_inventory.py -i build\xpz_extracted\PRODUCTO_APP_SHEMA_DESA1.xml -o build\xpz_inventory

"""
import argparse
import json
import csv
import os
import sys
from xml.etree import ElementTree as ET


def strip_tag(t):
    # Quita namespaces: {ns}Tag -> Tag
    if t is None:
        return ''
    return t.rsplit('}', 1)[-1]


def short_text(elem):
    # obtiene texto corta o atributos relevantes
    text = (elem.text or '').strip()
    if text:
        return text[:200]
    # revisar posibles hijos Name/Caption/Id
    for child in elem:
        tag = strip_tag(child.tag).lower()
        if tag in ('name', 'caption', 'id', 'title'):
            if child.text and child.text.strip():
                return child.text.strip()[:200]
    return ''


def element_id(elem):
    # intenta extraer un id desde atributos o hijos
    for k in ('Id', 'ID', 'id', 'Uid', 'GUID'):
        if k in elem.attrib:
            return elem.attrib[k]
    # buscar hijo <Id> o <Id/> etc.
    for child in elem:
        if strip_tag(child.tag).lower() in ('id', 'uid', 'guid') and child.text:
            return child.text.strip()
    return ''


def collect_inventory(xml_path, max_samples_per_type=None):
    counts = {}
    items = {}

    expected = ['object','data','attribute','transaction','webpanel','procedure','report','menu','panel']

    for t in expected:
        counts[t] = 0
        items[t] = []

    # iterparse streaming
    context = ET.iterparse(xml_path, events=("start","end"))
    _, root = next(context)  # get root

    for event, elem in context:
        if event != 'end':
            continue
        tag = strip_tag(elem.tag).lower()
        target = None
        for t in expected:
            if tag == t or tag.endswith(t) or t in tag:
                target = t
                break

        if target is not None:
            counts[target] += 1
            # metadata
            meta = {
                'type': target,
                'tag': strip_tag(elem.tag),
                'id': element_id(elem) or elem.attrib.get('name') or elem.attrib.get('Name','') or elem.attrib.get('ID',''),
                'name': elem.attrib.get('name') or short_text(elem),
                'attribs': dict(elem.attrib),
            }
            if max_samples_per_type is None or len(items[target]) < max_samples_per_type:
                items[target].append(meta)

        # clear to keep memory low
        root.clear()

    return {'counts': counts, 'items': items}


def write_outputs(basepath, inventory):
    os.makedirs(os.path.dirname(basepath), exist_ok=True) if os.path.dirname(basepath) else None
    json_path = basepath + '.json'
    csv_path = basepath + '.csv'

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(inventory, f, ensure_ascii=False, indent=2)

    # CSV: una fila por elemento muestreado
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['type','tag','id','name','attribs'])
        for t, elems in inventory['items'].items():
            for e in elems:
                writer.writerow([e.get('type'), e.get('tag'), e.get('id'), e.get('name'), json.dumps(e.get('attribs',{}), ensure_ascii=False)])

    return json_path, csv_path


def main():
    parser = argparse.ArgumentParser(description='Exporta inventario desde XML de Genexus (.xpz extraído).')
    parser.add_argument('-i','--input', required=True, help='Ruta al XML extraído (build/xpz_extracted/FILE.xml)')
    parser.add_argument('-o','--output', required=True, help='Ruta base de salida (sin extensión) ej: build/xpz_inventory')
    parser.add_argument('--sample', type=int, default=200, help='Máximo de muestras por tipo a incluir en CSV/JSON (por defecto 200)')

    args = parser.parse_args()

    xml_path = args.input
    output_base = args.output

    if not os.path.isfile(xml_path):
        print(f'ERROR: no se encuentra el archivo XML: {xml_path}', file=sys.stderr)
        sys.exit(2)

    print('Analizando XML (esto puede tardar)...')
    inventory = collect_inventory(xml_path, max_samples_per_type=args.sample)

    print('Escribiendo salidas...')
    json_path, csv_path = write_outputs(output_base, inventory)

    print('\n== Resultados ==')
    for k,v in inventory['counts'].items():
        print(f'{k}: {v}')

    print(f'Inventario exportado a: {json_path}  y  {csv_path}')


if __name__ == '__main__':
    main()
