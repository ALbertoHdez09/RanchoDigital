/**
 * ─── UTILIDAD: ETAPA AUTOMÁTICA DEL ANIMAL ───────────────────────────────────
 *
 * Basado en literatura veterinaria bovina:
 *
 * HEMBRAS:
 *   0-6 meses    → Becerro / Becerra
 *   6-12 meses   → Becerro / Becerra (destete/desarrollo)
 *   12-24 meses  → Vaquilla
 *   24+ meses    → Vientre / Producción (si no tiene estado especial)
 *
 * MACHOS:
 *   0-12 meses   → Becerro / Becerra
 *   12-24 meses  → Torete / Novillo
 *   24+ meses    → Semental (si es reproductor) o Torete / Novillo (si es engorda)
 *
 * NOTA: "Vaca Seca", "Cargada", "Enferma", "Vacía" son estados que el ganadero
 * asigna manualmente según condición reproductiva/sanitaria. No se cambian
 * automáticamente por edad.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { EstadoAnimal, Genero } from '../types';

/** Estados que NO deben cambiarse automáticamente (son decisión del ganadero) */
const ESTADOS_MANUALES: EstadoAnimal[] = [
  'Vaca Seca', 'Cargada', 'Enferma', 'Vacía', 'Semental',
];

/**
 * Calcula la edad en meses a partir de la fecha de nacimiento.
 */
export function calcularEdadMeses(fechaNacimiento: string): number {
  const nac = new Date(fechaNacimiento);
  const hoy = new Date();
  const meses =
    (hoy.getFullYear() - nac.getFullYear()) * 12 +
    (hoy.getMonth() - nac.getMonth());
  return Math.max(0, meses);
}

/**
 * Determina la etapa esperada según edad y género.
 * Retorna null si no se puede determinar (sin fecha de nacimiento).
 */
export function etapaEsperada(
  fechaNacimiento: string | null | undefined,
  genero: Genero
): EstadoAnimal | null {
  if (!fechaNacimiento) return null;

  const meses = calcularEdadMeses(fechaNacimiento);

  if (genero === 'Hembra') {
    if (meses < 12)  return 'Becerro / Becerra';
    if (meses < 24)  return 'Vaquilla';
    return 'Vientre / Producción';
  } else {
    // Macho
    if (meses < 12)  return 'Becerro / Becerra';
    if (meses < 24)  return 'Torete / Novillo';
    return 'Torete / Novillo'; // El ganadero decide si pasa a Semental
  }
}

/**
 * Verifica si el estado actual del animal debería actualizarse según su edad.
 * Solo sugiere cambio si el estado actual es uno que se puede cambiar automáticamente.
 *
 * @returns El nuevo estado sugerido, o null si no hay cambio necesario.
 */
export function sugerirCambioEtapa(
  estadoActual: EstadoAnimal | undefined,
  fechaNacimiento: string | null | undefined,
  genero: Genero
): EstadoAnimal | null {
  if (!fechaNacimiento || !estadoActual) return null;

  // No tocar estados manuales
  if (ESTADOS_MANUALES.includes(estadoActual)) return null;

  const esperado = etapaEsperada(fechaNacimiento, genero);
  if (!esperado) return null;

  // Solo sugerir si es diferente al actual
  return esperado !== estadoActual ? esperado : null;
}

/**
 * Formatea la edad de forma legible.
 * Ej: "3 meses", "1 año 4 meses", "2 años"
 */
export function formatearEdad(fechaNacimiento: string): string {
  const meses = calcularEdadMeses(fechaNacimiento);
  if (meses < 1)  return 'Recién nacido';
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  const años = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  if (mesesRestantes === 0) return `${años} ${años === 1 ? 'año' : 'años'}`;
  return `${años} ${años === 1 ? 'año' : 'años'} ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}`;
}
