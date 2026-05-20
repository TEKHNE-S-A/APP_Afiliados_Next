import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      // Proxy de archivos al backend legado
      {
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/uploads/:path*`,
      },
      // ─── Rutas mobile sin prefijo /api ────────────────────────────────────────
      // La app mobile llama a rutas sin /api (ej: /auth/login, /noticias).
      // Next.js App Router las sirve en /api/... , por lo que se reescriben aquí.
      { source: '/auth/login',                              destination: '/api/auth/login' },
      { source: '/auth/me',                                 destination: '/api/auth/me' },
      { source: '/auth/refresh-token',                      destination: '/api/auth/refresh-token' },
      { source: '/noticias',                                destination: '/api/noticias' },
      { source: '/planes',                                  destination: '/api/planes' },
      { source: '/feature-flags',                           destination: '/api/feature-flags' },
      { source: '/dashboard',                               destination: '/api/dashboard' },
      { source: '/info-util',                               destination: '/api/info-util' },
      { source: '/home/botonera',                           destination: '/api/home/botonera' },
      { source: '/parametros/funciones-app/:key',           destination: '/api/parametros/funciones-app/:key' },
      { source: '/cartilla',                                destination: '/api/cartilla' },
      { source: '/cartilla/especialidades',                 destination: '/api/cartilla/especialidades' },
      { source: '/cartilla/rubros',                         destination: '/api/cartilla/rubros' },
      { source: '/cartilla/:id',                            destination: '/api/cartilla/:id' },
      { source: '/credenciales',                            destination: '/api/credenciales' },
      { source: '/credenciales/sync',                       destination: '/api/credenciales/sync' },
      { source: '/credenciales/refresh',                    destination: '/api/credenciales/refresh' },
      { source: '/sia/detalle-consumo',                     destination: '/api/sia/detalle-consumo' },
      { source: '/sia/historial-atencion',                  destination: '/api/sia/historial-atencion' },
      { source: '/sia/enrolamientos-afiliado',              destination: '/api/sia/enrolamientos-afiliado' },
      { source: '/sia/solicitudes',                         destination: '/api/sia/solicitudes' },
      { source: '/sia/coseguros-pendientes',                destination: '/api/sia/coseguros-pendientes' },
      { source: '/sia/prestaciones',                        destination: '/api/sia/prestaciones' },
      { source: '/sia/enrolamientos',                       destination: '/api/sia/enrolamientos' },
      { source: '/sia/crear-solicitud',                     destination: '/api/sia/crear-solicitud' },
      { source: '/mis-autorizaciones',                     destination: '/api/mis-autorizaciones' },
      { source: '/mis-autorizaciones/:id/fotos',            destination: '/api/mis-autorizaciones/:id/fotos' },
      { source: '/solicitudes',                             destination: '/api/solicitudes' },
      { source: '/notificaciones',                          destination: '/api/notificaciones' },
      { source: '/notifications',                           destination: '/api/notifications' },
      { source: '/notifications/:path*',                    destination: '/api/notifications/:path*' },
      { source: '/me',                                      destination: '/api/me' },
      { source: '/gam/userinfo',                            destination: '/api/gam/userinfo' },
      { source: '/gam/cancel-registration',                 destination: '/api/gam/cancel-registration' },
      { source: '/register',                                destination: '/api/register' },
      { source: '/desconocimientos',                        destination: '/api/desconocimientos' },
      { source: '/calificaciones',                          destination: '/api/calificaciones' },
      { source: '/cartilla/sugerencias',                    destination: '/api/cartilla/sugerencias' },
    ]
  },
}

export default nextConfig
