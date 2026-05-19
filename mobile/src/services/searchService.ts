/**
 * searchService.ts — Búsqueda inteligente (#28)
 *
 * Provee:
 * - debounce() helper
 * - getCartillaSugerencias(): llama a GET /api/cartilla/sugerencias
 * - normalizeQuery(): limpia texto para búsqueda consistente
 * - filterInfoUtil(): filtrado local por relevancia para info útil
 */

import { apiGet } from './api';

// --------------------------------------------------------------------------
// Tipos
// --------------------------------------------------------------------------

export interface CartillaSugerencia {
  caentid: string;
  caentapeno: string;
  carubdescr?: string;
  caespecial?: string;
  caendirecc?: string;
}

export interface InfoUtilItem {
  id?: number | string;
  titulo: string;
  tipo: string;
  telefono?: string;
  link?: string;
  direccion?: string;
  geo?: string;
  descripcion?: string;
  categoria?: string;
  orden?: number;
  activo?: boolean;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Normaliza texto para comparación: minúsculas, sin tildes, sin puntuación extra.
 */
export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar diacríticos
    .replace(/[^\w\s]/g, ' ')        // reemplazar puntuación por espacio
    .trim();
}

/**
 * Debounce: retorna versión retardada de `fn`. Limpia el timer anterior.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => { fn(...args); }, ms);
  };
  debounced.cancel = () => { if (timer !== null) clearTimeout(timer); };
  return debounced as T & { cancel: () => void };
}

// --------------------------------------------------------------------------
// Cartilla sugerencias (servidor)
// --------------------------------------------------------------------------

/**
 * Pide sugerencias al backend para autocomplete en cartilla.
 * Devuelve array vacío si hay error o query muy corta.
 */
export async function getCartillaSugerencias(
  q: string,
  options?: { excludeRubroIds?: string[]; rubroId?: string; limit?: number }
): Promise<CartillaSugerencia[]> {
  const query = normalizeQuery(q);
  if (query.length < 2) return [];

  try {
    const params = new URLSearchParams({ q, limit: String(options?.limit ?? 8) });
    if (options?.excludeRubroIds) {
      options.excludeRubroIds.forEach(id => params.append('excludeRubroId', id));
    }
    if (options?.rubroId) {
      params.append('rubroId', options.rubroId);
    }
    const res = await apiGet(`/api/cartilla/sugerencias?${params.toString()}`);
    return Array.isArray(res?.sugerencias) ? res.sugerencias : [];
  } catch {
    return [];
  }
}

// --------------------------------------------------------------------------
// Info útil — filtrado local por relevancia
// --------------------------------------------------------------------------

interface RankedItem<T> { item: T; score: number; }

/**
 * Filtra y rankea items de info útil localmente.
 * Devuelve los ítems ordenados por score descendente.
 */
export function filterInfoUtil(items: InfoUtilItem[], q: string): InfoUtilItem[] {
  const query = normalizeQuery(q);
  if (!query) return items;

  const tokens = query.split(/\s+/).filter(Boolean);

  const ranked: RankedItem<InfoUtilItem>[] = [];

  for (const item of items) {
    const titulo = normalizeQuery(item.titulo || '');
    const descripcion = normalizeQuery(item.descripcion || '');
    const direccion = normalizeQuery(item.direccion || '');
    const texto = `${titulo} ${descripcion} ${direccion}`;

    let score = 0;
    for (const token of tokens) {
      if (titulo === query) { score += 100; continue; }
      if (titulo.startsWith(token)) { score += 80; continue; }
      if (titulo.includes(token)) { score += 60; continue; }
      if (text_includes(texto, token)) { score += 30; continue; }
    }

    if (score > 0) ranked.push({ item, score });
  }

  return ranked
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}

function text_includes(text: string, token: string): boolean {
  return text.includes(token);
}
