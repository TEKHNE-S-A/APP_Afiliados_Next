/**
 * admin-shared.js — Utilidades comunes para todos los paneles admin del backend.
 *
 * Proporciona:
 *  - AdminSession: manejo de sesión con TTL y clave única en localStorage
 *  - adminAuthFetch: fetch con Authorization header + auto-logout en 401
 *  - adminLogout: cierra sesión y redirige a /admin
 *  - initAdminPanelAuth: verifica sesión al cargar y muestra la app si es válida
 *  - highlightActiveNavLink: marca el enlace activo en .nav-links
 */

;(function (global) {
  'use strict';

  // ─── Constantes ──────────────────────────────────────────────────────────────
  const SESSION_KEY = 'admin_session_v1';
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas — igual al JWT del backend

  function _isDebugEnabled() {
    return !!global.__ADMIN_DEBUG;
  }

  function _debugEvent(name, payload = {}) {
    if (!_isDebugEnabled()) return;
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

  // ─── AdminSession ────────────────────────────────────────────────────────────
  const AdminSession = {
    /** Devuelve { token, user, expiresAt } si la sesión es válida, null si expiró o no existe. */
    get() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || !s.token || !s.expiresAt) { this.clear(); return null; }
        if (Date.now() > s.expiresAt) { this.clear(); return null; }
        // Sesiones sin campo `permisos` (formato antiguo) → forzar re-login
        if (!('permisos' in s)) { this.clear(); return null; }
        return s;
      } catch (_) { return null; }
    },

    /** Guarda la sesión con TTL. */
    set(token, user, permisos, isSuperAdmin) {
      const session = {
        token,
        user: user || '',
        permisos: permisos !== undefined ? permisos : null, // null = super admin
        isSuperAdmin: isSuperAdmin !== undefined ? isSuperAdmin : (permisos === null),
        expiresAt: Date.now() + SESSION_TTL_MS,
        savedAt: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      // Compatibilidad con paneles que leen 'auth_token' directamente
      localStorage.setItem('auth_token', token);
    },

    /** Elimina la sesión de todos los formatos conocidos. */
    clear() {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('diag_auth_token');
      localStorage.removeItem('diag_auth_user');
    },

    getToken()      { const s = this.get(); return s ? s.token : null; },
    getUser()       { const s = this.get(); return s ? (s.user || 'Admin') : ''; },
    getPermisos()   { const s = this.get(); return s ? (s.permisos !== undefined ? s.permisos : null) : null; },
    isSuperAdmin()  { const s = this.get(); if (!s) return false; return s.isSuperAdmin === true || s.permisos === null || s.permisos === undefined; },
    isValid()       { return this.get() !== null; },

    /** Minutos restantes de la sesión (0 si expiró). */
    minutesLeft() {
      const s = this.get();
      if (!s) return 0;
      return Math.max(0, Math.floor((s.expiresAt - Date.now()) / 60000));
    }
  };

  // ─── adminAuthFetch ───────────────────────────────────────────────────────────
  /**
   * Fetch autenticado. Si el servidor responde 401 cierra la sesión y redirige.
   * @param {string} url — ruta relativa o absoluta
   * @param {RequestInit} [options]
   */
  async function adminAuthFetch(url, options = {}) {
    const token = AdminSession.getToken();
    const fullUrl = url.startsWith('http') ? url : (window.location.origin + url);
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const resp = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'same-origin'
    });

    if (resp.status === 401) {
      AdminSession.clear();
      const current = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = '/admin?returnUrl=' + current;
      throw new Error('Sesión expirada. Redirigiendo al login…');
    }

    let data;
    try { data = await resp.json(); } catch (_) { data = {}; }
    if (!resp.ok) {
      const err = new Error(data.message || data.error || `Error ${resp.status}`);
      err.status = resp.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ─── adminLogout ──────────────────────────────────────────────────────────────
  async function adminLogout(redirectTo = '/admin') {
    const token = AdminSession.getToken();
    try {
      await fetch('/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (_) {
      // no-op
    } finally {
      AdminSession.clear();
      window.location.href = redirectTo;
    }
  }

  function _focusMainContent() {
    const main = document.getElementById('main-content');
    if (!main) return;
    if (!main.hasAttribute('tabindex')) {
      main.setAttribute('tabindex', '-1');
    }
    setTimeout(() => main.focus(), 0);
    _debugEvent('focus.main-content', { elementId: 'main-content' });
  }

  async function _performAdminLogin(username, password, apiBase = window.location.origin) {
    _debugEvent('auth.login.attempt', { username: username || '(vacío)' });
    const response = await fetch(`${apiBase}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      _debugEvent('auth.login.error', { status: response.status, message: data.error || 'Error al iniciar sesión' });
      throw new Error(data.error || 'Error al iniciar sesión');
    }
    _debugEvent('auth.login.success', { status: response.status, user: data.user?.username || data.user?.email || username });
    return data;
  }

  // Nota: navegación y breadcrumb viven en admin-nav.js.
  function _renderNavigationIfAvailable() {
    if (typeof global.adminRenderNavigation === 'function') {
      global.adminRenderNavigation();
      _debugEvent('nav.render.called', { source: 'admin-shared' });
    }
  }

  function _emitAdminAuthReady({ token, user, source, appId, loginId } = {}) {
    try {
      const detail = { token: token || null, user: user || 'Admin', source: source || 'unknown', appId: appId || null, loginId: loginId || null };
      document.dispatchEvent(new CustomEvent('admin:auth-ready', { detail }));
      _debugEvent('auth.ready.emitted', detail);
    } catch (_) {
      // no-op
    }
  }

  // ─── initAdminPanelAuth ───────────────────────────────────────────────────────
  /**
   * Verifica la sesión almacenada al cargar el panel.
   * Si es válida, muestra directamente la app saltando el formulario de login.
   *
   * @param {object} opts
   * @param {string}   [opts.loginId='loginScreen']  — id del contenedor de login
   * @param {string}   [opts.appId='appScreen']      — id del contenedor de la app
   * @param {string}   [opts.userInfoId='userInfo']  — id del span con el nombre del usuario
   * @param {Function} [opts.onReady]                — callback(token, user) cuando la sesión es válida
   */
  function initAdminPanelAuth({ loginId = 'loginScreen', appId = 'appScreen', userInfoId = 'userInfo', onReady } = {}) {
    const session = AdminSession.get();
    if (!session) return; // Sin sesión → quedarse en el formulario de login

    const loginEl = document.getElementById(loginId);
    const appEl   = document.getElementById(appId);

    if (loginEl) loginEl.style.display = 'none';
    if (appEl)   appEl.style.display   = 'block';

    // Mostrar usuario y minutosRestantes en el header
    const userInfoEl = document.getElementById(userInfoId);
    if (userInfoEl) {
      userInfoEl.textContent = `👤 ${session.user || 'Admin'}`;
    }

    // Indicador de tiempo de sesión
    _renderSessionBadge(session);

    if (typeof onReady === 'function') {
      onReady(session.token, session.user);
    }
    _emitAdminAuthReady({ token: session.token, user: session.user, source: 'restore', appId, loginId });
    _debugEvent('auth.restore.success', { user: session.user || 'Admin' });
    _focusMainContent();
  }

  /**
   * Vincula un formulario de login admin con comportamiento común.
   */
  function adminBindLoginForm({
    formId = 'loginForm',
    usernameId = 'username',
    passwordId = 'password',
    errorId = 'loginError',
    buttonId = null,
    buttonIdleText = 'Iniciar Sesión',
    buttonLoadingText = 'Iniciando sesión...',
    loginId = 'loginScreen',
    appId = 'appScreen',
    userInfoId = 'userInfo',
    apiBase = window.location.origin,
    formatUserLabel = (user) => `👤 ${user}`,
    onSuccess
  } = {}) {
    const form = document.getElementById(formId);
    if (!form || form.dataset.adminLoginBound === '1') return;
    form.dataset.adminLoginBound = '1';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const usernameEl = document.getElementById(usernameId);
      const passwordEl = document.getElementById(passwordId);
      const errorEl = document.getElementById(errorId);
      const buttonEl = buttonId ? document.getElementById(buttonId) : form.querySelector('button[type="submit"]');

      const username = (usernameEl?.value || '').trim();
      const password = passwordEl?.value || '';

      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }

      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.dataset.originalText = buttonEl.textContent;
        buttonEl.textContent = buttonLoadingText;
      }

      try {
        const data = await _performAdminLogin(username, password, apiBase);
        const displayUser = data.user?.username || data.user?.email || username || 'Admin';

        AdminSession.set(
          data.token,
          displayUser,
          data.user?.permisos !== undefined ? data.user.permisos : null,
          data.user?.isSuperAdmin === true
        );

        const loginEl = document.getElementById(loginId);
        const appEl = document.getElementById(appId);
        if (loginEl) loginEl.style.display = 'none';
        if (appEl) appEl.style.display = 'block';

        const userInfoEl = document.getElementById(userInfoId);
        if (userInfoEl) userInfoEl.textContent = formatUserLabel(displayUser, data);

        _renderSessionBadge(AdminSession.get());
        _focusMainContent();
        _emitAdminAuthReady({ token: data.token, user: displayUser, source: 'login', appId, loginId });

        if (typeof onSuccess === 'function') {
          await onSuccess(data.token, displayUser, data);
        }
        _debugEvent('auth.bind.success', { user: displayUser, formId });
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        } else {
          showToast(err.message, 'error');
        }
        _debugEvent('auth.bind.error', { formId, message: err.message });
      } finally {
        if (buttonEl) {
          buttonEl.disabled = false;
          buttonEl.textContent = buttonEl.dataset.originalText || buttonIdleText;
        }
      }
    });
  }

  // ─── Indicador de sesión activa ───────────────────────────────────────────────
  function _renderSessionBadge(session) {
    const mins = AdminSession.minutesLeft();
    const horas = Math.floor(mins / 60);
    const minRest = mins % 60;
    const label = horas > 0
      ? `Sesión: ${horas}h ${minRest}m`
      : `Sesión: ${mins}m`;

    // Si ya existe un badge, actualizarlo
    let badge = document.getElementById('adminSessionBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'adminSessionBadge';
      badge.className = 'session-badge';
      // Intentar insertar en .user-info
      const userInfo = document.querySelector('.user-info');
      if (userInfo) userInfo.insertBefore(badge, userInfo.firstChild);
    }
    badge.textContent = label;
    badge.title = `La sesión expira a las ${new Date(session.expiresAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // ─── showToast ─────────────────────────────────────────────────────────────
  /**
   * Muestra un toast flotante en la esquina inferior derecha.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='info']
   * @param {number} [duration=4200] — ms antes de auto-cerrar
   */
  function showToast(message, type = 'info', duration = 4200) {
    const container = document.getElementById('admin-toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `admin-toast admin-toast-${type}`;
    t.textContent = message;
    t.setAttribute('role', 'status');
    container.appendChild(t);
    setTimeout(() => t.remove(), duration);
    announceA11y(message);
    _debugEvent('toast.show', { type, message, duration });
  }

  // ─── announceA11y ──────────────────────────────────────────────────────────
  /**
   * Anuncia un mensaje a lectores de pantalla vía aria-live assertive.
   */
  function announceA11y(message) {
    const el = document.getElementById('admin-a11y-announcer');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = message; });
    _debugEvent('a11y.announce', { message });
  }

  // ─── _injectA11yContainers ─────────────────────────────────────────────────
  function _injectA11yContainers() {
    if (!document.getElementById('admin-toast-container')) {
      const tc = document.createElement('div');
      tc.id = 'admin-toast-container';
      tc.setAttribute('aria-live', 'polite');
      tc.setAttribute('aria-atomic', 'false');
      document.body.appendChild(tc);
    }
    if (!document.getElementById('admin-a11y-announcer')) {
      const ann = document.createElement('div');
      ann.id = 'admin-a11y-announcer';
      ann.className = 'sr-only';
      ann.setAttribute('aria-live', 'assertive');
      ann.setAttribute('aria-atomic', 'true');
      document.body.appendChild(ann);
    }
  }

  // ─── adminConfirm/adminPrompt ─────────────────────────────────────────────
  const _adminDialogState = {
    resolver: null,
    lastFocused: null,
    keyHandler: null,
    mode: 'confirm'
  };

  function _ensureAdminDialog() {
    let overlay = document.getElementById('admin-dialog-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'admin-dialog-overlay';
    overlay.className = 'modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'admin-dialog-title');
    overlay.setAttribute('tabindex', '-1');

    overlay.innerHTML = `
      <div class="modal-content admin-dialog-content">
        <div class="modal-header">
          <h2 id="admin-dialog-title">Confirmación</h2>
          <button type="button" class="btn-close" id="admin-dialog-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body">
          <p id="admin-dialog-message" class="admin-dialog-message"></p>
          <input id="admin-dialog-input" class="admin-dialog-input" type="text" />
        </div>
        <div class="modal-footer admin-dialog-footer">
          <button type="button" class="btn btn-secondary" id="admin-dialog-cancel">Cancelar</button>
          <button type="button" class="btn" id="admin-dialog-confirm">Aceptar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _closeAdminDialog(null);
    });
    document.getElementById('admin-dialog-close').addEventListener('click', () => _closeAdminDialog(null));
    document.getElementById('admin-dialog-cancel').addEventListener('click', () => _closeAdminDialog(null));
    document.getElementById('admin-dialog-confirm').addEventListener('click', () => {
      const input = document.getElementById('admin-dialog-input');
      if (_adminDialogState.mode === 'prompt') {
        _closeAdminDialog(input.value);
      } else {
        _closeAdminDialog(true);
      }
    });

    return overlay;
  }

  function _getDialogFocusable(overlay) {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(overlay.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
  }

  function _openAdminDialog({
    mode = 'confirm',
    title = 'Confirmación',
    message = '',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    confirmClass = 'btn-danger',
    inputPlaceholder = '',
    inputDefaultValue = ''
  }) {
    const overlay = _ensureAdminDialog();
    const titleEl = document.getElementById('admin-dialog-title');
    const msgEl = document.getElementById('admin-dialog-message');
    const inputEl = document.getElementById('admin-dialog-input');
    const cancelBtn = document.getElementById('admin-dialog-cancel');
    const confirmBtn = document.getElementById('admin-dialog-confirm');

    _adminDialogState.lastFocused = document.activeElement;
    _adminDialogState.mode = mode;
    _debugEvent('dialog.open', { mode, title, message });

    titleEl.textContent = title;
    msgEl.textContent = message;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${confirmClass || ''}`.trim();

    if (mode === 'prompt') {
      inputEl.style.display = 'block';
      inputEl.value = inputDefaultValue || '';
      inputEl.placeholder = inputPlaceholder || '';
    } else {
      inputEl.style.display = 'none';
      inputEl.value = '';
      inputEl.placeholder = '';
    }

    if (_adminDialogState.keyHandler) {
      overlay.removeEventListener('keydown', _adminDialogState.keyHandler);
    }

    _adminDialogState.keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        _closeAdminDialog(null);
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = _getDialogFocusable(overlay);
      if (!focusable.length) {
        e.preventDefault();
        overlay.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    overlay.addEventListener('keydown', _adminDialogState.keyHandler);
    overlay.classList.add('show');

    setTimeout(() => {
      if (mode === 'prompt') {
        inputEl.focus();
        inputEl.select();
      } else {
        confirmBtn.focus();
      }
    }, 0);

    return new Promise((resolve) => {
      _adminDialogState.resolver = resolve;
    });
  }

  function _closeAdminDialog(value) {
    const overlay = document.getElementById('admin-dialog-overlay');
    if (!overlay) return;

    overlay.classList.remove('show');
    if (_adminDialogState.keyHandler) {
      overlay.removeEventListener('keydown', _adminDialogState.keyHandler);
      _adminDialogState.keyHandler = null;
    }

    const resolver = _adminDialogState.resolver;
    _adminDialogState.resolver = null;

    if (_adminDialogState.lastFocused && typeof _adminDialogState.lastFocused.focus === 'function') {
      setTimeout(() => _adminDialogState.lastFocused.focus(), 0);
    }

    if (resolver) {
      resolver(value);
    }
    _debugEvent('dialog.close', { mode: _adminDialogState.mode, hasValue: value !== null && value !== undefined });
  }

  async function adminConfirm(message, options = {}) {
    const result = await _openAdminDialog({
      mode: 'confirm',
      title: options.title || 'Confirmación',
      message,
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      confirmClass: options.confirmClass || 'btn-danger'
    });
    return result === true;
  }

  async function adminPrompt(message, options = {}) {
    const result = await _openAdminDialog({
      mode: 'prompt',
      title: options.title || 'Ingreso de dato',
      message,
      confirmText: options.confirmText || 'Aceptar',
      cancelText: options.cancelText || 'Cancelar',
      confirmClass: options.confirmClass || 'btn-primary',
      inputPlaceholder: options.placeholder || '',
      inputDefaultValue: options.defaultValue || ''
    });
    return result === null ? null : String(result);
  }

  // ─── adminOpenModal/adminCloseModal ───────────────────────────────────────
  const _panelModalState = new WeakMap();

  function _getModalFocusable(container) {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(container.querySelectorAll(selector)).filter((el) => el.offsetParent !== null);
  }

  function adminOpenModal(modalEl, triggerEl = null, activeClass = 'show') {
    if (!modalEl) return;

    const previous = _panelModalState.get(modalEl);
    if (previous?.keyHandler) {
      modalEl.removeEventListener('keydown', previous.keyHandler);
    }

    const state = {
      lastFocused: triggerEl || document.activeElement,
      activeClass,
      keyHandler: null
    };

    state.keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        adminCloseModal(modalEl, activeClass);
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = _getModalFocusable(modalEl);
      if (!focusable.length) {
        e.preventDefault();
        modalEl.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    modalEl.classList.add(activeClass);
    modalEl.addEventListener('keydown', state.keyHandler);
    _panelModalState.set(modalEl, state);

    setTimeout(() => {
      const focusable = _getModalFocusable(modalEl);
      const first = focusable[0] || modalEl;
      first.focus();
    }, 0);
    _debugEvent('panel-modal.open', { id: modalEl.id || null, activeClass });
  }

  function adminCloseModal(modalEl, activeClass = null) {
    if (!modalEl) return;

    const state = _panelModalState.get(modalEl);
    const classToRemove = activeClass || state?.activeClass || 'show';

    modalEl.classList.remove(classToRemove);
    if (state?.keyHandler) {
      modalEl.removeEventListener('keydown', state.keyHandler);
    }

    if (state?.lastFocused && typeof state.lastFocused.focus === 'function') {
      setTimeout(() => state.lastFocused.focus(), 0);
    }

    _panelModalState.delete(modalEl);
    _debugEvent('panel-modal.close', { id: modalEl.id || null, activeClass: classToRemove });
  }

  // ─── Exponer en global ────────────────────────────────────────────────────────
  global.AdminSession      = AdminSession;
  global.adminAuthFetch    = adminAuthFetch;
  global.adminLogout       = adminLogout;
  global.adminBindLoginForm = adminBindLoginForm;
  global.initAdminPanelAuth = initAdminPanelAuth;
  global.showToast         = showToast;
  global.announceA11y      = announceA11y;
  global.adminConfirm      = adminConfirm;
  global.adminPrompt       = adminPrompt;
  global.adminOpenModal    = adminOpenModal;
  global.adminCloseModal   = adminCloseModal;

  // Ejecutar highlight e inyección a11y cuando el DOM esté listo
  function _onDOMReady() {
    _renderNavigationIfAvailable();
    _injectA11yContainers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _onDOMReady);
  } else {
    _onDOMReady();
  }

})(window);
