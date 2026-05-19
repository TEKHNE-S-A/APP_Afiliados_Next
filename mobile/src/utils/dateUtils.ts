/**
 * Formatea una fecha a formato DD/MM/AAAA
 * @param fecha - Fecha en formato ISO (YYYY-MM-DD) o Date
 * @returns Fecha formateada como DD/MM/AAAA
 */
export const formatFecha = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return 'N/A'
  
  try {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha
    
    // Verificar si es fecha válida
    if (isNaN(date.getTime())) return 'N/A'
    
    const dia = String(date.getDate()).padStart(2, '0')
    const mes = String(date.getMonth() + 1).padStart(2, '0')
    const anio = date.getFullYear()
    
    return `${dia}/${mes}/${anio}`
  } catch (error) {
    return 'N/A'
  }
}
