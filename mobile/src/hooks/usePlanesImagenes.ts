/**
 * Hook para obtener imágenes de planes desde el backend.
 * Cachea el resultado en memoria para evitar múltiples requests.
 *
 * Uso:
 *   const { getPlanImageUrl } = usePlanesImagenes()
 *   <CredencialCard planImageUrl={getPlanImageUrl(credencial.crcreplaid)} ... />
 */

import { useState, useEffect } from 'react'
import { apiGet } from '../services/api'
import { API_BASE_URL } from '../config'
import { StorageManager } from '../services/storageManager'
import * as FileSystem from 'expo-file-system/legacy'

const PLANES_CACHE_TTL_MS = 60 * 1000

interface PlanInfo {
  id: string
  descripcion: string
  imagen_url: string | null
}

function normalizePlanKey(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase()
}

function normalizePlanImageUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl
  if (rawUrl.startsWith('gxdbfile:')) return null
  if (rawUrl.startsWith('/')) return `${API_BASE_URL}${rawUrl}`
  return `${API_BASE_URL}/${rawUrl}`
}

// Cache en módulo (persiste mientras el bundle esté en memoria)
let _cache: Record<string, string | null> | null = null
let _loading = false
let _listeners: Array<(cache: Record<string, string | null>) => void> = []
let _lastFetchAt = 0

function getLocalPlanImagePath(planId: string): string | null {
  const cacheDir = FileSystem.cacheDirectory
  if (!cacheDir) return null

  const safePlanId = encodeURIComponent(planId.trim())
  return `${cacheDir}planes/${safePlanId}.img`
}

async function cachePlanImageLocally(planId: string, remoteUrl: string): Promise<string | null> {
  try {
    const localPath = getLocalPlanImagePath(planId)
    if (!localPath) return null

    const info = await FileSystem.getInfoAsync(localPath)
    if (info.exists) {
      await FileSystem.deleteAsync(localPath, { idempotent: true })
    }

    const planesDir = `${FileSystem.cacheDirectory}planes/`
    await FileSystem.makeDirectoryAsync(planesDir, { intermediates: true })
    await FileSystem.downloadAsync(remoteUrl, localPath)

    const downloaded = await FileSystem.getInfoAsync(localPath)
    return downloaded.exists ? localPath : null
  } catch {
    return null
  }
}

async function fetchPlanes(force = false) {
  if (_loading) return
  const now = Date.now()
  if (!force && _cache && now - _lastFetchAt < PLANES_CACHE_TTL_MS) return

  _loading = true
  try {
    const fetchVersion = Date.now()
    const resp = await apiGet('/planes')
    if (resp.planes && Array.isArray(resp.planes)) {
      const map: Record<string, string | null> = {}
      for (const plan of resp.planes as PlanInfo[]) {
        const planId = plan.id.trim()
        const planDesc = String(plan.descripcion || '').trim()
        const planIdKey = normalizePlanKey(planId)
        const planDescKey = normalizePlanKey(planDesc)
        const normalizedUrl = normalizePlanImageUrl(plan.imagen_url)

        if (normalizedUrl) {
          // Guardar copia local para que la imagen siga disponible sin conexión.
          const localUri = await cachePlanImageLocally(planId, normalizedUrl)
          const baseUrl = localUri || normalizedUrl
          const sep = baseUrl.includes('?') ? '&' : '?'
          const resolvedUrl = `${baseUrl}${sep}v=${fetchVersion}`
          map[planIdKey] = resolvedUrl
          if (planDescKey) map[planDescKey] = resolvedUrl
        } else {
          map[planIdKey] = null
          if (planDescKey) map[planDescKey] = null
        }
      }
      _cache = map
      _lastFetchAt = Date.now()
      _listeners.forEach(fn => fn(map))
      // Persistir en AsyncStorage para disponibilidad offline
      StorageManager.savePlanesMap(map).catch(() => {/* silencioso */})
    }
  } catch (_) {
    // Sin conexión: intentar cargar desde AsyncStorage
    if (!_cache) {
      try {
        const persisted = await StorageManager.getPlanesMap()
        if (persisted) {
          _cache = persisted
          _listeners.forEach(fn => fn(persisted))
        }
      } catch (_2) {/* silencioso */}
    }
  } finally {
    _loading = false
  }
}

export function usePlanesImagenes() {
  const [planesPorId, setPlanesPorId] = useState<Record<string, string | null> | null>(_cache)

  useEffect(() => {
    const listener = (map: Record<string, string | null>) => setPlanesPorId(map)
    _listeners.push(listener)
    if (_cache) {
      setPlanesPorId(_cache)
      fetchPlanes(false)
    } else {
      // Cargar desde AsyncStorage mientras se hace fetch (disponibilidad inmediata offline)
      StorageManager.getPlanesMap().then(persisted => {
        if (persisted && !_cache) {
          _cache = persisted
          setPlanesPorId(persisted)
        }
      }).catch(() => {/* silencioso */})
      fetchPlanes(false)
    }
    return () => {
      _listeners = _listeners.filter(fn => fn !== listener)
    }
  }, [])

  const refreshPlanes = async () => {
    await fetchPlanes(true)
  }

  const getPlanImageUrl = (planId: string | number | null | undefined): string | null => {
    if (planId == null || !planesPorId) return null
    const key = normalizePlanKey(String(planId))
    if (!key) return null
    return planesPorId[key] ?? null
  }

  return { getPlanImageUrl, planesPorId, refreshPlanes }
}
