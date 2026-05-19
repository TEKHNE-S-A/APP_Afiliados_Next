#!/usr/bin/env python3
"""
Analizador de UI para mapeo a componentes React Native.
Identifica pantallas, formularios, transacciones y genera sugerencias de layout.
"""
import json
import sys
import os
from collections import defaultdict


def analyze_ui_objects(deep_inventory_json):
    """Analiza los objetos del inventario y propone UI components."""
    try:
        with open(deep_inventory_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"ERROR al leer JSON: {e}", file=sys.stderr)
        sys.exit(1)
    
    items = data.get('items', {})
    
    # Heurísticas para clasificar objetos
    ui_screens = []
    data_models = []
    
    # Procesa objects (los más probables de ser pantallas)
    for obj in items.get('object', []):
        identifier = obj.get('identifier', 'unknown')
        attribs = obj.get('attribs', {})
        children = obj.get('children_tags', [])
        text = obj.get('text', '')
        
        # Heurística: si contiene ciertas palabras en identifier o atributos -> UI
        identifier_lower = identifier.lower()
        
        ui_keywords = ['form', 'panel', 'screen', 'view', 'dialog', 'popup', 'modal', 
                      'main', 'home', 'dashboard', 'list', 'detail', 'edit', 'create',
                      'login', 'profile', 'settings', 'afiliado', 'trámite', 'solicitud']
        
        is_ui = any(kw in identifier_lower for kw in ui_keywords)
        
        # Si tiene atributos que sugieren UI
        if not is_ui and ('Type' in attribs or 'type' in attribs):
            type_val = attribs.get('Type', attribs.get('type', '')).lower()
            if 'panel' in type_val or 'form' in type_val or 'screen' in type_val:
                is_ui = True
        
        # Clasifica
        if is_ui:
            ui_screens.append({
                'identifier': identifier,
                'tag': obj.get('tag'),
                'attribs': attribs,
                'children_tags': children,
                'confidence': 'high' if any(kw in identifier_lower for kw in ['form', 'panel']) else 'medium'
            })
        else:
            data_models.append({
                'identifier': identifier,
                'tag': obj.get('tag'),
                'attribs': attribs
            })
    
    # Procesa attributes (muchos corresponden a campos de formulario/datos)
    fields = []
    for attr in items.get('attribute', [])[:50]:  # muestra de primeros 50
        identifier = attr.get('identifier', 'unknown')
        attribs = attr.get('attribs', {})
        fields.append({
            'identifier': identifier,
            'attribs': attribs
        })
    
    return {
        'ui_screens': ui_screens,
        'data_models': data_models,
        'sample_fields': fields,
        'summary': {
            'total_objects': len(items.get('object', [])),
            'detected_ui_screens': len(ui_screens),
            'detected_data_models': len(data_models),
            'total_attributes': len(items.get('attribute', [])),
            'total_data_resources': len(items.get('data', []))
        }
    }


def propose_rn_screens(ui_analysis):
    """Propone pantallas React Native basado en análisis."""
    ui_screens = ui_analysis['ui_screens']
    summary = ui_analysis['summary']
    
    # Lista de pantallas esperadas en app móvil de afiliados
    expected_screens = [
        'Login / Autenticación',
        'Home / Dashboard',
        'Perfil Afiliado',
        'Trámites / Solicitudes',
        'Historial / Transacciones',
        'Notificaciones',
        'Configuración / Ajustes',
        'Soporte / Help',
        'Detalles de Trámite',
        'Editar Perfil'
    ]
    
    # Intenta mapear pantallas detectadas a esperadas
    detected_names = [s['identifier'] for s in ui_screens]
    detected_names_lower = [n.lower() for n in detected_names]
    
    mapping = {}
    for expected in expected_screens:
        key = expected.lower()
        matched = [d for d in detected_names if d.lower() in key or key in d.lower()]
        mapping[expected] = {
            'detected_objects': matched[:5],
            'suggestion': f"Mapear a {expected}" if matched else f"Crear pantalla {expected}"
        }
    
    return {
        'expected_screens': expected_screens,
        'detected_ui_screens_count': len(ui_screens),
        'mapping_suggestions': mapping,
        'implementation_priority': [
            '1. Login / Autenticación (OAuth)',
            '2. Home / Dashboard (mostrar estado afiliado)',
            '3. Perfil Afiliado (ver datos)',
            '4. Trámites (listar y crear)',
            '5. Historial (transacciones)',
            '6. Notificaciones (push + in-app)',
            '7. Configuración (ajustes)',
            '8. Soporte (contacto)',
        ]
    }


def main():
    deep_inventory_json = './build/xpz_deep_inventory.json'
    
    if not os.path.isfile(deep_inventory_json):
        print(f"ERROR: No se encuentra {deep_inventory_json}", file=sys.stderr)
        print("Ejecuta primero: parse_xpz_deep.py", file=sys.stderr)
        sys.exit(1)
    
    print("Analizando UI y proponiendo pantallas React Native...")
    ui_analysis = analyze_ui_objects(deep_inventory_json)
    
    print("\n=== Análisis de Objetos UI ===")
    print(f"Total de objetos en KB: {ui_analysis['summary']['total_objects']}")
    print(f"Pantallas UI detectadas: {ui_analysis['summary']['detected_ui_screens']}")
    print(f"Modelos de datos detectados: {ui_analysis['summary']['detected_data_models']}")
    print(f"Total de atributos (campos): {ui_analysis['summary']['total_attributes']}")
    print(f"Recursos de datos (imágenes, etc.): {ui_analysis['summary']['total_data_resources']}")
    
    if ui_analysis['ui_screens']:
        print("\n=== Pantallas UI Detectadas (muestra) ===")
        for screen in ui_analysis['ui_screens'][:15]:
            print(f"  - {screen['identifier']} (confianza: {screen['confidence']})")
    
    # Propone
    rn_proposal = propose_rn_screens(ui_analysis)
    
    print("\n=== Propuesta de Pantallas React Native ===")
    for screen in rn_proposal['expected_screens']:
        mapping = rn_proposal['mapping_suggestions'][screen]
        print(f"{screen}")
        print(f"  Objetos detectados: {mapping['detected_objects']}")
        print(f"  Acción: {mapping['suggestion']}")
    
    print("\n=== Prioridad de Implementación ===")
    for prio in rn_proposal['implementation_priority']:
        print(f"  {prio}")
    
    # Exporta análisis a JSON
    analysis_output = {
        'ui_analysis': ui_analysis,
        'rn_proposal': rn_proposal
    }
    
    output_file = './build/xpz_ui_mapping.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(analysis_output, f, ensure_ascii=False, indent=2)
    
    print(f"\nAnálisis guardado en: {output_file}")


if __name__ == '__main__':
    main()
