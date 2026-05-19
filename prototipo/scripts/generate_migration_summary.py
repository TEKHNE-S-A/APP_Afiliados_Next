#!/usr/bin/env python3
"""
Generador de Resumen Ejecutivo para Migración Genexus -> React Native.
Consolida el análisis de UI, datos, APIs y propone plan de implementación.
"""
import json
import os
from datetime import datetime


def generate_migration_summary():
    """Genera resumen ejecutivo de migración."""
    
    # Lee inventario profundo
    deep_inv_file = './build/xpz_deep_inventory.json'
    ui_map_file = './build/xpz_ui_mapping.json'
    
    deep_inv = {}
    ui_map = {}
    
    if os.path.exists(deep_inv_file):
        with open(deep_inv_file, 'r', encoding='utf-8') as f:
            deep_inv = json.load(f)
    
    if os.path.exists(ui_map_file):
        with open(ui_map_file, 'r', encoding='utf-8') as f:
            ui_map = json.load(f)
    
    summary = {
        'project': 'APP Afiliados - Migración Genexus a React Native',
        'generated_at': datetime.now().isoformat(),
        'version': '1.0',
        'source_kb': 'PRODUCTO_APP_SHEMA_DESA1.xpz',
        
        'executive_summary': {
            'description': 'Análisis y propuesta de migración de aplicación móvil Genexus (OSEP APP Afiliados) a React Native + TypeScript',
            'target_platform': 'React Native (Expo o React Native CLI)',
            'target_language': 'TypeScript',
            'estimated_effort': 'Alto (4-6 meses, equipo de 2-3 devs)',
            'migration_risk': 'Medio (requiere mapeo manual de transacciones y APIs backend)',
        },
        
        'knowledge_base_analysis': {
            'total_objects': deep_inv.get('counts', {}).get('object', 0),
            'total_attributes': deep_inv.get('counts', {}).get('attribute', 0),
            'total_data_resources': deep_inv.get('counts', {}).get('data', 0),
            'unique_xml_tags': len(deep_inv.get('all_unique_tags', [])),
            'detected_ui_screens': ui_map.get('ui_analysis', {}).get('summary', {}).get('detected_ui_screens', 0),
            'detected_data_models': ui_map.get('ui_analysis', {}).get('summary', {}).get('detected_data_models', 0),
        },
        
        'identified_ui_layers': {
            'screens': [
                {
                    'name': 'Login / Autenticación OAuth',
                    'priority': 'P0-Critical',
                    'rn_components': ['SafeAreaView', 'TextInput', 'Button', 'ActivityIndicator'],
                    'dependencies': ['OAuth/OIDC backend', 'AsyncStorage para token'],
                    'notes': 'Migrar flujo de OAuth desde Genexus backend'
                },
                {
                    'name': 'Home / Dashboard',
                    'priority': 'P1-High',
                    'rn_components': ['FlatList', 'Card', 'RefreshControl', 'LinearGradient'],
                    'dependencies': ['API de estado afiliado', 'notificaciones push'],
                    'notes': 'Mostrar resumen estado afiliado, saldo, trámites pendientes'
                },
                {
                    'name': 'Perfil Afiliado',
                    'priority': 'P1-High',
                    'rn_components': ['ScrollView', 'TouchableOpacity', 'Text', 'Image'],
                    'dependencies': ['API de datos afiliado', 'edición de perfil'],
                    'notes': 'Información personal, documentos, contacto'
                },
                {
                    'name': 'Trámites / Solicitudes',
                    'priority': 'P1-High',
                    'rn_components': ['FlatList', 'Modal', 'TextInput', 'Picker'],
                    'dependencies': ['API de trámites', 'gestión de estados'],
                    'notes': 'Crear, listar, editar solicitudes de afiliación/cambios'
                },
                {
                    'name': 'Historial / Transacciones',
                    'priority': 'P2-Medium',
                    'rn_components': ['FlatList', 'SectionList', 'DatePicker'],
                    'dependencies': ['API de historial', 'filtrado por fecha'],
                    'notes': 'Ver movimientos, descarga de comprobantes'
                },
                {
                    'name': 'Notificaciones',
                    'priority': 'P2-Medium',
                    'rn_components': ['FlatList', 'Badge', 'SwipeableList'],
                    'dependencies': ['Push notifications (Firebase)', 'notificaciones in-app'],
                    'notes': 'Centro de notificaciones con acciones rápidas'
                },
                {
                    'name': 'Configuración / Ajustes',
                    'priority': 'P2-Medium',
                    'rn_components': ['Switch', 'Picker', 'TouchableOpacity'],
                    'dependencies': ['Preferencias locales', 'tema/idioma'],
                    'notes': 'Notificaciones, idioma, tema oscuro, privacidad'
                },
                {
                    'name': 'Soporte / Help',
                    'priority': 'P3-Low',
                    'rn_components': ['WebView', 'Linking', 'ActionSheet'],
                    'dependencies': ['FAQ, email, chat support'],
                    'notes': 'Centro de ayuda, contacto soporte'
                }
            ]
        },
        
        'technology_stack': {
            'frontend': {
                'framework': 'React Native (Expo recomendado)',
                'language': 'TypeScript 5+',
                'navigation': 'React Navigation 6+',
                'state_management': 'Redux Toolkit o Zustand',
                'ui_library': 'React Native Paper o NativeBase',
                'http_client': 'axios',
                'storage': 'AsyncStorage + SQLite (expo-sqlite)',
                'push_notifications': 'expo-notifications + Firebase',
                'forms': 'React Hook Form + Zod',
                'testing': 'Jest + React Native Testing Library'
            },
            'backend_changes': {
                'requirement': 'Backend debe exponer APIs REST/GraphQL',
                'auth': 'OAuth 2.0 / OpenID Connect',
                'endpoints': [
                    'POST /auth/login - OAuth flow',
                    'GET /auth/refresh - Refresh token',
                    'GET /user/profile - Datos afiliado',
                    'GET /tramites - Listar trámites',
                    'POST /tramites - Crear trámite',
                    'GET /tramites/:id - Detalle trámite',
                    'PUT /tramites/:id - Actualizar trámite',
                    'GET /notifications - Notificaciones',
                    'PUT /user/profile - Actualizar perfil',
                    'GET /history - Historial transacciones'
                ],
                'migration_status': 'Backend debe migrarse en paralelo o ser refactorizado'
            },
            'infrastructure': {
                'hosting': 'Cloud (AWS/GCP/Azure)',
                'ci_cd': 'GitHub Actions / GitLab CI',
                'monitoring': 'Sentry + Firebase Analytics',
                'app_stores': 'Apple App Store + Google Play Store'
            }
        },
        
        'implementation_roadmap': {
            'phase_1_setup': {
                'duration': '2 semanas',
                'tasks': [
                    'Inicializar proyecto React Native (Expo)',
                    'Configurar TypeScript, ESLint, Prettier',
                    'Setup estado global (Redux/Zustand)',
                    'Setup navegación (React Navigation)',
                    'Crear estructura de carpetas',
                    'Configurar CI/CD básico'
                ]
            },
            'phase_2_auth': {
                'duration': '3 semanas',
                'tasks': [
                    'Diseñar pantalla Login',
                    'Implementar OAuth flow',
                    'Integrar con backend OAuth',
                    'Setup de AsyncStorage para token',
                    'Pantalla de splash inicial',
                    'Tests de autenticación'
                ]
            },
            'phase_3_core_screens': {
                'duration': '6 semanas',
                'tasks': [
                    'Implementar Home/Dashboard',
                    'Implementar Perfil Afiliado',
                    'Implementar Trámites/Solicitudes',
                    'Implementar Historial',
                    'Integración con APIs backend',
                    'Manejo de errores y edge cases'
                ]
            },
            'phase_4_features': {
                'duration': '4 semanas',
                'tasks': [
                    'Push notifications (Firebase)',
                    'Notificaciones in-app',
                    'Sincronización offline (SQLite)',
                    'Configuración/Ajustes',
                    'Soporte/Help'
                ]
            },
            'phase_5_qa': {
                'duration': '3 semanas',
                'tasks': [
                    'Testing manual en dispositivos',
                    'Testing en emuladores Android/iOS',
                    'Pruebas de rendimiento',
                    'Pruebas de seguridad',
                    'Bug fixes y refinamiento'
                ]
            },
            'phase_6_release': {
                'duration': '2 semanas',
                'tasks': [
                    'Certificados de firma (iOS/Android)',
                    'Build de producción',
                    'Publicación en stores',
                    'Monitoreo post-launch'
                ]
            }
        },
        
        'dependencies_and_migrations': {
            'backend_dependencies': [
                'OAuth/OIDC server (migrar de Genexus)',
                'APIs REST para afiliados',
                'Gestión de trámites',
                'Notificaciones push (Firebase)',
                'Base de datos de afiliados',
                'Seguridad (HTTPS, validación, CORS)'
            ],
            'data_migration': {
                'user_data': 'Migrar datos de afiliados (script de ETL)',
                'trámites': 'Migrar historial de trámites',
                'credenciales': 'Regenerar credenciales/tokens OAuth',
                'seguridad': 'Auditoría de datos sensibles antes de migrar'
            },
            'critical_success_factors': [
                'Backend REST API completamente funcional',
                'OAuth flow estable y seguro',
                'Data migration validada',
                'Testing extensivo en dispositivos reales',
                'Plan de rollback en caso de problemas'
            ]
        },
        
        'risks_and_mitigation': {
            'technical_risks': [
                {
                    'risk': 'Complejidad en migración de lógica Genexus',
                    'impact': 'Alto',
                    'mitigation': 'Análisis detallado de transacciones, documentación y pruebas exhaustivas'
                },
                {
                    'risk': 'Diferencias en comportamiento OAuth entre plataformas',
                    'impact': 'Alto',
                    'mitigation': 'Testing en ambas plataformas (iOS/Android) en paralelo'
                },
                {
                    'risk': 'Compatibilidad con versiones antiguas de dispositivos',
                    'impact': 'Medio',
                    'mitigation': 'Definir minSDK Android 21+, iOS 13+; testing en versiones soportadas'
                },
                {
                    'risk': 'Pérdida de funcionalidad durante migración',
                    'impact': 'Alto',
                    'mitigation': 'Mantener Genexus en paralelo hasta validación completa'
                }
            ],
            'business_risks': [
                {
                    'risk': 'Rechazo por usuarios acostumbrados a app Genexus',
                    'impact': 'Medio',
                    'mitigation': 'Comunicación clara, UI/UX mejorada, feedback de usuarios'
                },
                {
                    'risk': 'Tiempo de desarrollo mayor al estimado',
                    'impact': 'Medio',
                    'mitigation': 'Sprints de 2 semanas, demostración temprana, iteración'
                }
            ]
        },
        
        'recommendations': [
            'Priorizar backend API REST + OAuth antes de completar frontend',
            'Usar React Native Expo para rapidez (puede migrarse a RN CLI después)',
            'Implementar testing automatizado desde el inicio',
            'Usar TypeScript para mayor type-safety',
            'Plan de rollback: mantener Genexus en producción 2-4 semanas post-launch',
            'Recolectar feedback de usuarios en fase beta (TestFlight + Google Play Beta)',
            'Monitoreo continuo post-launch (Sentry, Firebase Analytics)',
            'Documentación clara de API y procedimientos de deploy'
        ],
        
        'next_steps': [
            '1. Revisión de arquitectura backend con equipo DevOps/Backend',
            '2. Definir especificaciones finales de APIs REST',
            '3. Setup de repositorio de código (GitHub/GitLab)',
            '4. Inicializar proyecto React Native base',
            '5. Refinar UI/UX mockups con equipo de diseño',
            '6. Planificación de sprints y asignación de recursos',
            '7. Kickoff del proyecto con todas las áreas'
        ]
    }
    
    return summary


def main():
    print("Generando resumen ejecutivo de migración...")
    summary = generate_migration_summary()
    
    # Escribe a JSON
    output_file = './build/MIGRATION_SUMMARY.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Resumen guardado en: {output_file}")
    
    # Imprime resumen en consola
    print("\n" + "="*70)
    print(f"RESUMEN EJECUTIVO: {summary['project']}")
    print("="*70)
    print(f"Generado: {summary['generated_at']}")
    print(f"\nDescripción: {summary['executive_summary']['description']}")
    print(f"Target: {summary['executive_summary']['target_platform']} + {summary['executive_summary']['target_language']}")
    print(f"Esfuerzo estimado: {summary['executive_summary']['estimated_effort']}")
    print(f"Riesgo: {summary['executive_summary']['migration_risk']}")
    
    print("\n--- Knowledge Base ---")
    kb = summary['knowledge_base_analysis']
    print(f"Total objetos: {kb['total_objects']}")
    print(f"Total atributos: {kb['total_attributes']}")
    print(f"Recursos de datos: {kb['total_data_resources']}")
    print(f"Pantallas UI detectadas: {kb['detected_ui_screens']}")
    print(f"Modelos de datos: {kb['detected_data_models']}")
    
    print("\n--- Pantallas Identificadas ---")
    for screen in summary['identified_ui_layers']['screens']:
        print(f"  • {screen['name']} [{screen['priority']}]")
    
    print("\n--- Roadmap (fases) ---")
    for phase, details in summary['implementation_roadmap'].items():
        print(f"  {phase}: {details['duration']}")
    
    print(f"\n✓ Archivo guardado: {output_file}")
    print("="*70)


if __name__ == '__main__':
    main()
