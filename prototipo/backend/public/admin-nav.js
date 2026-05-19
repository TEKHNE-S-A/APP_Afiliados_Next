/**
 * admin-nav.js — navegación compartida para paneles admin.
 *
 * Responsabilidades:
 *  - Inyectar sidebar de navegación global (fija a la izquierda)
 *  - Marcar enlace activo
 *  - Renderizar breadcrumb en #adminBreadcrumb
 */

;(function (global) {
  'use strict';

  const NAV_ITEMS = [
    { key: 'parametros',    label: 'Parámetros',    href: '/admin' },
    { key: 'usuarios',      label: 'Usuarios',      href: '/admin/usuarios' },
    { key: 'credenciales',  label: 'Credenciales',  href: '/admin-credenciales.html' },
    { key: 'planes',        label: 'Planes',        href: '/admin-planes.html' },
    { key: 'noticias',      label: 'Noticias',      href: '/admin-noticias.html' },
    { key: 'info-util',     label: 'Info útil',     href: '/admin-info-util.html' },
    { key: 'cartilla',      label: 'Cartilla',      href: '/admin/cartilla' },
    { key: 'historial',     label: 'Historial',     href: '/admin-historial-atencion.html' },
    { key: 'notificaciones',label: 'Notificaciones',href: '/admin/notificaciones' },
    { key: 'analytics',     label: 'Analítica',     href: '/admin/analytics' },
    { key: 'soporte',       label: 'Soporte',       href: '/admin/soporte' },
    { key: 'diagnostico',   label: 'Diagnóstico',   href: '/admin/diagnostico' }
  ];

  const NAV_ICONS = {
    parametros:     '⚙️',
    usuarios:       '👥',
    credenciales:   '🪪',
    planes:         '📋',
    noticias:       '📰',
    'info-util':    'ℹ️',
    cartilla:       '🏥',
    historial:      '📊',
    notificaciones: '🔔',
    analytics:      '📈',
    soporte:        '🎧',
    diagnostico:    '🔧'
  };

  const SIDEBAR_GROUPS = [
    { label: 'Configuración', items: ['parametros', 'usuarios', 'credenciales'] },
    { label: 'Contenido',     items: ['planes', 'noticias', 'info-util', 'cartilla'] },
    { label: 'Operación',     items: ['historial', 'notificaciones', 'soporte'] },
    { label: 'Sistema',       items: ['analytics', 'diagnostico'] }
  ];

  // ─── Session (sin depender de admin-shared.js) ───────────────────────────────
  function _isAdminSessionValid() {
    try {
      const raw = localStorage.getItem('admin_session_v1');
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!(s && s.token && s.expiresAt && Date.now() <= s.expiresAt)) return false;
      // Sesiones sin campo `permisos` (formato antiguo) son inválidas
      return 'permisos' in s;
    } catch (_) { return false; }
  }

  function _getAdminUser() {
    try {
      const raw = localStorage.getItem('admin_session_v1');
      if (!raw) return 'Admin';
      const s = JSON.parse(raw);
      return s && s.user ? s.user : 'Admin';
    } catch (_) { return 'Admin'; }
  }

  // ─── Mapa de permisos requeridos por sección ──────────────────────────────────
  // Valor string: módulo requerido en el array permisos.
  // Valor null: solo super admin (nurolid = null).
  // Clave ausente: sin restricción.
  const NAV_PERMISSION_MAP = {
    parametros:     'parametros',
    usuarios:       'usuarios',
    credenciales:   'credenciales',
    planes:         'credenciales',
    noticias:       'salud',
    'info-util':    'salud',
    cartilla:       'salud',
    historial:      'sia',
    notificaciones: 'notificaciones',
    analytics:      'reportes',
    soporte:        null,
    diagnostico:    null,
  };

  function _getSessionPermisos() {
    try {
      const raw = localStorage.getItem('admin_session_v1');
      if (!raw) return null;
      const s = JSON.parse(raw);
      // permisos === null (o ausente isSuperAdmin=true) → super admin
      return s?.permisos !== undefined ? s.permisos : null;
    } catch (_) { return null; }
  }

  function _sessionIsSuperAdmin() {
    try {
      const raw = localStorage.getItem('admin_session_v1');
      if (!raw) return false;
      const s = JSON.parse(raw);
      return s?.isSuperAdmin === true || s?.permisos === null || s?.permisos === undefined;
    } catch (_) { return false; }
  }

  /**
   * Devuelve true si el usuario actual puede acceder al módulo de la clave dada.
   */
  function _canAccessNavItem(key) {
    if (_sessionIsSuperAdmin()) return true;
    const required = NAV_PERMISSION_MAP[key];
    if (required === undefined) return true;           // sin restricción
    if (required === null) return false;               // solo super admin
    const permisos = _getSessionPermisos();
    if (!Array.isArray(permisos)) return false;
    return permisos.includes(required);
  }

  /**
   * Redirige al usuario si no tiene acceso a la página actual.
   * Solo actúa si hay sesión válida.
   */
  function _checkPageAccess() {
    if (!_isAdminSessionValid()) return;
    // No bloquear si ya viene con ?forbidden para evitar loops
    if (window.location.search.includes('forbidden')) return;

    const current = canonicalPath(window.location.pathname);
    const item = NAV_ITEMS.find((n) => canonicalPath(n.href) === current);
    if (!item) return; // página desconocida, permitir

    if (_canAccessNavItem(item.key)) return; // tiene acceso

    // Buscar primera página accesible
    const firstAllowed = NAV_ITEMS.find((n) => _canAccessNavItem(n.key));
    if (firstAllowed) {
      window.location.href = firstAllowed.href + '?forbidden=1';
    } else {
      // Sin acceso a ningún módulo
      document.body.innerHTML = '<div style="font-family:sans-serif;padding:3rem;text-align:center"><h2>⛔ Sin permisos</h2><p>Tu cuenta no tiene acceso a ningún módulo del panel.</p></div>';
    }
  }

  // ─── Sidebar ─────────────────────────────────────────────────────────────────
  function injectSidebar() {
    if (document.getElementById('adminGlobalSidebar')) return;

    const current = canonicalPath(window.location.pathname);

    const groupsHtml = SIDEBAR_GROUPS.map((group) => {
      const itemsHtml = group.items.map((key) => {
        if (!_canAccessNavItem(key)) return ''; // ocultar si no tiene permiso
        const item = NAV_ITEMS.find((n) => n.key === key);
        if (!item) return '';
        const isActive = canonicalPath(item.href) === current;
        const icon = NAV_ICONS[key] || '•';
        return `<a href="${item.href}" class="sidebar-link${isActive ? ' sidebar-link--active' : ''}" data-admin-nav-key="${key}" title="${item.label}">
          <span class="sidebar-icon" aria-hidden="true">${icon}</span>
          <span class="sidebar-label">${item.label}</span>
        </a>`;
      }).join('');
      if (!itemsHtml.trim()) return ''; // ocultar grupos vacíos
      return `<div class="sidebar-group">
        <div class="sidebar-group-label">${group.label}</div>
        ${itemsHtml}
      </div>`;
    }).join('');

    const sidebar = document.createElement('aside');
    sidebar.id = 'adminGlobalSidebar';
    sidebar.className = 'admin-sidebar';
    sidebar.setAttribute('aria-label', 'Navegación del panel de administración');
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <span class="sidebar-logo" aria-hidden="true">🌿</span>
        <span class="sidebar-title">Panel Admin</span>
      </div>
      <button class="sidebar-toggle" id="sidebarToggle" title="Colapsar menú" aria-label="Colapsar menú lateral">‹</button>
      <nav class="sidebar-nav" aria-label="Módulos de administración">
        ${groupsHtml}
      </nav>
      <div class="sidebar-footer">
        <span class="sidebar-user" id="sidebarUser" title="Usuario activo">👤 ${_getAdminUser()}</span>
        <button class="sidebar-logout-btn" onclick="adminLogout ? adminLogout('/admin') : (window.location.href='/admin')" title="Cerrar sesión">Cerrar sesión</button>
      </div>`;

    document.body.prepend(sidebar);
    document.body.classList.add('admin-has-sidebar');

    // Toggle collapse
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        const collapsed = document.body.classList.toggle('admin-sidebar-collapsed');
        this.textContent = collapsed ? '›' : '‹';
        this.title = collapsed ? 'Expandir menú' : 'Colapsar menú';
        try { localStorage.setItem('admin_sidebar_collapsed', collapsed ? '1' : '0'); } catch (_) {}
      });
    }

    // Restore collapsed state
    try {
      if (localStorage.getItem('admin_sidebar_collapsed') === '1') {
        document.body.classList.add('admin-sidebar-collapsed');
        if (toggleBtn) { toggleBtn.textContent = '›'; toggleBtn.title = 'Expandir menú'; }
      }
    } catch (_) {}

    _debugEvent('sidebar.injected', { current });
  }

  function watchForAppScreen() {
    // Si ya hay sesión válida, inyectar de inmediato
    if (_isAdminSessionValid()) {
      injectSidebar();
      return;
    }
    // Si no, observar contenedores típicos para inyectarla cuando se muestre (post-login)
    const appCandidates = [
      document.getElementById('appScreen'),
      document.getElementById('appContainer')
    ].filter(Boolean);

    // Compatibilidad adicional: tomar el primer contenedor conocido por clase
    if (appCandidates.length === 0) {
      const firstByClass = document.querySelector('.app-container');
      if (firstByClass) appCandidates.push(firstByClass);
    }

    if (appCandidates.length === 0) return;

    const isVisible = (el) => {
      if (!el) return false;
      if (el.style.display === 'block') return true;
      return el.offsetParent !== null;
    };

    if (appCandidates.some(isVisible)) {
      injectSidebar();
      return;
    }

    const obs = new MutationObserver(() => {
      if (appCandidates.some(isVisible)) {
        injectSidebar();
        obs.disconnect();
      }
    });

    appCandidates.forEach((el) => {
      obs.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    });
  }

  const PATH_ALIASES = {
    '/admin/noticias': '/admin-noticias.html',
    '/admin/noticias-ui': '/admin-noticias.html',
    '/admin/planes': '/admin-planes.html',
    '/admin/planes-ui': '/admin-planes.html',
    '/admin/info-util': '/admin-info-util.html',
    '/admin/info-util-ui': '/admin-info-util.html',
    '/admin/historial-atencion-ui': '/admin-historial-atencion.html',
    '/admin/historial': '/admin-historial-atencion.html'
  };

  function _debugEvent(name, payload = {}) {
    if (!global.__ADMIN_DEBUG) return;
    const entry = {
      name,
      payload,
      path: window.location.pathname,
      ts: new Date().toISOString()
    };
    if (!Array.isArray(global.__ADMIN_DEBUG_EVENTS)) {
      global.__ADMIN_DEBUG_EVENTS = [];
    }
    global.__ADMIN_DEBUG_EVENTS.push(entry);
    try {
      console.debug('[ADMIN_DEBUG]', name, payload);
    } catch (_) {
      // no-op
    }
  }

  function normalizePath(path) {
    return (path || '').replace(/\/$/, '') || '/';
  }

  function canonicalPath(path) {
    const normalized = normalizePath(path);
    return PATH_ALIASES[normalized] || normalized;
  }

  function ensureGlobalAdminLinks() {
    // Si la sidebar está activa, el .nav-links del header es redundante — ocultarlo
    if (document.getElementById('adminGlobalSidebar')) {
      document.querySelectorAll('.nav-links').forEach((nav) => { nav.style.display = 'none'; });
      return;
    }
    // Sin sidebar: mantener nav-links horizontal como fallback
    document.querySelectorAll('.nav-links').forEach((nav) => {
      const html = NAV_ITEMS
        .map((item) => `<a href="${item.href}" data-admin-nav-key="${item.key}">${item.label}</a>`)
        .join('');
      nav.innerHTML = html;
    });
    _debugEvent('nav.ensure-global-links', { count: NAV_ITEMS.length });
  }

  function highlightActiveNavLink() {
    const current = canonicalPath(window.location.pathname);
    let activeCount = 0;
    document.querySelectorAll('.nav-links a').forEach((link) => {
      const href = canonicalPath(link.getAttribute('href') || '');
      if (!href || href === '#' || href.startsWith('http')) return;
      if (current === href) {
        link.classList.add('active-nav');
        activeCount += 1;
      } else {
        link.classList.remove('active-nav');
      }
    });
    _debugEvent('nav.highlight', { current, activeCount });
  }

  function renderBreadcrumb() {
    const container = document.getElementById('adminBreadcrumb');
    if (!container) return;

    const path = canonicalPath(window.location.pathname);
    const breadcrumbMap = {
      '/admin': [
        { label: 'Admin', href: '/admin' },
        { label: 'Parámetros' }
      ],
      '/admin/usuarios': [
        { label: 'Admin', href: '/admin' },
        { label: 'Operación' },
        { label: 'Usuarios' }
      ],
      '/admin/credenciales': [
        { label: 'Admin', href: '/admin' },
        { label: 'Configuración' },
        { label: 'Credenciales' }
      ],
      '/admin-planes.html': [
        { label: 'Admin', href: '/admin' },
        { label: 'Configuración' },
        { label: 'Planes' }
      ],
      '/admin-noticias.html': [
        { label: 'Admin', href: '/admin' },
        { label: 'Contenido' },
        { label: 'Noticias' }
      ],
      '/admin-info-util.html': [
        { label: 'Admin', href: '/admin' },
        { label: 'Contenido' },
        { label: 'Info útil' }
      ],
      '/admin/cartilla': [
        { label: 'Admin', href: '/admin' },
        { label: 'Contenido' },
        { label: 'Cartilla' }
      ],
      '/admin/soporte': [
        { label: 'Admin', href: '/admin' },
        { label: 'Operación' },
        { label: 'Soporte' }
      ],
      '/admin/diagnostico': [
        { label: 'Admin', href: '/admin' },
        { label: 'Operación' },
        { label: 'Diagnóstico' }
      ],
      '/admin/notificaciones': [
        { label: 'Admin', href: '/admin' },
        { label: 'Monitoreo' },
        { label: 'Notificaciones' }
      ],
      '/admin/analytics': [
        { label: 'Admin', href: '/admin' },
        { label: 'Monitoreo' },
        { label: 'Analítica' }
      ],
      '/admin/historial-atencion': [
        { label: 'Admin', href: '/admin' },
        { label: 'Monitoreo' },
        { label: 'Historial' }
      ],
      '/admin-historial-atencion.html': [
        { label: 'Admin', href: '/admin' },
        { label: 'Monitoreo' },
        { label: 'Historial' }
      ],
      '/admin-credenciales.html': [
        { label: 'Admin', href: '/admin' },
        { label: 'Configuración' },
        { label: 'Credenciales' }
      ]
    };

    const crumbs = breadcrumbMap[path] || [
      { label: 'Admin', href: '/admin' },
      { label: 'Panel' }
    ];

    const html = crumbs.map((item, idx) => {
      const isLast = idx === crumbs.length - 1;
      const content = item.href && !isLast
        ? `<a class="admin-breadcrumb-link" href="${item.href}">${item.label}</a>`
        : `<span class="admin-breadcrumb-current">${item.label}</span>`;
      return `<li class="admin-breadcrumb-item">${content}</li>`;
    }).join('');

    container.innerHTML = `<ol class="admin-breadcrumb-list">${html}</ol>`;
    _debugEvent('breadcrumb.render', { path, count: crumbs.length });
  }

  function adminRenderNavigation() {
    _checkPageAccess();
    watchForAppScreen();
    ensureGlobalAdminLinks();
    highlightActiveNavLink();
    renderBreadcrumb();
  }

  document.addEventListener('admin:auth-ready', () => {
    _checkPageAccess();
    injectSidebar();
    ensureGlobalAdminLinks();
    highlightActiveNavLink();
    renderBreadcrumb();
    _debugEvent('nav.render.auth-ready');
  });

  global.adminHighlightActiveNavLink = highlightActiveNavLink;
  global.adminRenderBreadcrumb = renderBreadcrumb;
  global.adminRenderNavigation = adminRenderNavigation;
  global.adminCanAccessNavItem = _canAccessNavItem;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      _checkPageAccess();
      adminRenderNavigation();
    });
  } else {
    _checkPageAccess();
    adminRenderNavigation();
  }
})(window);
