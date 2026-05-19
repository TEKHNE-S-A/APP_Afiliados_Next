/**
 * Query keys centralizadas para TanStack Query.
 * NUNCA usar strings literales inline en useQuery / useMutation.
 */

export const queryKeys = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  me: () => ['me'] as const,

  // ── Credenciales ──────────────────────────────────────────────────────────
  credenciales: {
    all: () => ['credenciales'] as const,
    list: () => [...queryKeys.credenciales.all(), 'list'] as const,
    detail: (id: string) => [...queryKeys.credenciales.all(), 'detail', id] as const,
    shared: (token: string) => [...queryKeys.credenciales.all(), 'shared', token] as const,
  },

  // ── Solicitudes / Autorizaciones ──────────────────────────────────────────
  solicitudes: {
    all: () => ['solicitudes'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? [...queryKeys.solicitudes.all(), 'list', filters] : [...queryKeys.solicitudes.all(), 'list'] as const,
    detail: (id: string) => [...queryKeys.solicitudes.all(), 'detail', id] as const,
  },

  // ── Notificaciones ────────────────────────────────────────────────────────
  notificaciones: {
    all: () => ['notificaciones'] as const,
    list: (page?: number) =>
      page != null ? [...queryKeys.notificaciones.all(), 'list', page] : [...queryKeys.notificaciones.all(), 'list'] as const,
    unreadCount: () => [...queryKeys.notificaciones.all(), 'unread-count'] as const,
  },

  // ── Cartilla ──────────────────────────────────────────────────────────────
  cartilla: {
    all: () => ['cartilla'] as const,
    entidades: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.cartilla.all(), 'entidades', filters]
        : ([...queryKeys.cartilla.all(), 'entidades'] as const),
    entidad: (id: string) => [...queryKeys.cartilla.all(), 'entidad', id] as const,
    rubros: () => [...queryKeys.cartilla.all(), 'rubros'] as const,
    especialidades: (rubroid?: string) =>
      rubroid
        ? [...queryKeys.cartilla.all(), 'especialidades', rubroid]
        : ([...queryKeys.cartilla.all(), 'especialidades'] as const),
    localidades: () => [...queryKeys.cartilla.all(), 'localidades'] as const,
  },

  // ── Admin: Usuarios ───────────────────────────────────────────────────────
  adminUsers: {
    all: () => ['admin', 'users'] as const,
    list: (page?: number, search?: string) =>
      [...queryKeys.adminUsers.all(), 'list', { page, search }] as const,
    detail: (id: string) => [...queryKeys.adminUsers.all(), 'detail', id] as const,
  },

  // ── Admin: Roles y permisos ──────────────────────────────────────────────
  adminRoles: {
    all: () => ['admin', 'roles'] as const,
    list: () => [...queryKeys.adminRoles.all(), 'list'] as const,
  },

  // ── Admin: Parámetros ─────────────────────────────────────────────────────
  adminParametros: {
    all: () => ['admin', 'parametros'] as const,
    list: (search?: string, grupo?: string) =>
      [...queryKeys.adminParametros.all(), 'list', { search, grupo }] as const,
  },

  // ── Admin: Notificaciones ─────────────────────────────────────────────────
  adminNotificaciones: {
    all: () => ['admin', 'notificaciones'] as const,
    list: (page?: number) => [...queryKeys.adminNotificaciones.all(), 'list', page] as const,
    stats: () => [...queryKeys.adminNotificaciones.all(), 'stats'] as const,
    historial: (params: Record<string, string | number>) =>
      [...queryKeys.adminNotificaciones.all(), 'historial', params] as const,
  },

  // ── Admin: Noticias ───────────────────────────────────────────────────────
  adminNoticias: {
    all: () => ['admin', 'noticias'] as const,
    list: (page?: number) => [...queryKeys.adminNoticias.all(), 'list', page] as const,
  },

  // ── Admin: Info util ──────────────────────────────────────────────────────
  adminInfoUtil: {
    all: () => ['admin', 'info-util'] as const,
    list: (tipo?: string) => [...queryKeys.adminInfoUtil.all(), 'list', tipo] as const,
    tipos: () => [...queryKeys.adminInfoUtil.all(), 'tipos'] as const,
  },

  // ── Noticias ──────────────────────────────────────────────────────────────
  noticias: {
    all: () => ['noticias'] as const,
    list: () => [...queryKeys.noticias.all(), 'list'] as const,
  },

  // ── Admin: Diagnóstico ────────────────────────────────────────────────────
  adminDiagnostico: () => ['admin', 'diagnostico'] as const,

  // ── Admin: Analytics ─────────────────────────────────────────────────────
  adminAnalytics: (days?: number) =>
    days != null ? ['admin', 'analytics', days] as const : ['admin', 'analytics'] as const,

  // ── Admin: Soporte / Audit logs ───────────────────────────────────────────
  adminSoporte: (page?: number, entity?: string, action?: string, actor?: string) =>
    ['admin', 'soporte', { page, entity, action, actor }] as const,
  adminSoporteAfiliado: (q?: string, limit?: number) =>
    ['admin', 'soporte', 'afiliado', { q, limit }] as const,
  // ── Admin: Historial de Atención ─────────────────────────────────────────
  adminHistorialDesconocimientos: (page?: number, estado?: string, q?: string) =>
    ['admin', 'historial', 'desconocimientos', { page, estado, q }] as const,
  adminHistorialCalificaciones: (page?: number, puntuacion?: string, q?: string) =>
    ['admin', 'historial', 'calificaciones', { page, puntuacion, q }] as const,
  adminHistorialResumen: () => ['admin', 'historial', 'resumen'] as const,

  // ── Admin: Planes ─────────────────────────────────────────────────────────
  adminPlanes: () => ['admin', 'planes'] as const,
  // ── Admin: Credenciales / Layout ──────────────────────────────────────────
  adminCredencialesLayout: (scope?: string, planId?: string) =>
    ['admin', 'credenciales', 'layout', { scope, planId }] as const,

  // ── Admin: Cartilla ───────────────────────────────────────────────────────
  adminCartilla: {
    all: () => ['admin', 'cartilla'] as const,
    entidades: (filters?: Record<string, unknown>) =>
      filters
        ? [...queryKeys.adminCartilla.all(), 'entidades', filters]
        : ([...queryKeys.adminCartilla.all(), 'entidades'] as const),
    rubros: () => [...queryKeys.adminCartilla.all(), 'rubros'] as const,
    especialidades: (rubroid?: string) =>
      rubroid
        ? [...queryKeys.adminCartilla.all(), 'especialidades', rubroid]
        : ([...queryKeys.adminCartilla.all(), 'especialidades'] as const),
    localidades: () => [...queryKeys.adminCartilla.all(), 'localidades'] as const,
    geocoding: () => [...queryKeys.adminCartilla.all(), 'geocoding'] as const,
  },} as const
