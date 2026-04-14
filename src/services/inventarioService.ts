/**
 * ─── SERVICIO DE INVENTARIO ───────────────────────────────────────────────────
 * Maneja el descuento automático de medicamentos cuando se crea un tratamiento.
 * Funciona offline-first: descuenta del caché local y encola para sincronizar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';
import { obtenerCacheLocal, guardarCacheLocal } from './offlineService';
import { agregarAlBuzon } from './syncService';
import type { Medicamento } from '../types';

/**
 * Extrae el número de la dosis de un string como "5 ml", "10mg", "2 dosis"
 */
function parsearCantidad(dosisStr: string): number {
  const match = dosisStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Busca un medicamento por nombre (búsqueda flexible, ignora mayúsculas)
 */
function encontrarMedicamento(medicamentos: Medicamento[], nombreProducto: string): Medicamento | null {
  const nombre = nombreProducto.toLowerCase().trim();
  return medicamentos.find(m =>
    m.nombre.toLowerCase().includes(nombre) ||
    nombre.includes(m.nombre.toLowerCase())
  ) ?? null;
}

/**
 * Descuenta del inventario cuando se crea un tratamiento.
 * @param productos - Array de { producto: string, dosis?: string } de las dosis creadas
 * @param userId - ID del usuario
 * @param isConnected - Si hay internet
 */
export async function descontarInventario(
  productos: Array<{ producto: string; dosis?: string }>,
  userId: string,
  isConnected: boolean
): Promise<{ descontados: string[]; sinStock: string[]; noEncontrados: string[] }> {
  const descontados: string[] = [];
  const sinStock: string[] = [];
  const noEncontrados: string[] = [];

  try {
    // Cargar medicamentos del caché o de Supabase
    let medicamentos: Medicamento[] = [];

    if (isConnected) {
      const { data } = await supabase
        .from('medicamentos')
        .select('*')
        .eq('user_id', userId);
      medicamentos = data ?? [];
      // Actualizar caché
      await guardarCacheLocal<Medicamento[]>('medicamentos_cache', medicamentos);
    } else {
      medicamentos = await obtenerCacheLocal<Medicamento[]>('medicamentos_cache', true) ?? [];
    }

    if (medicamentos.length === 0) return { descontados, sinStock, noEncontrados };

    // Agrupar productos para descontar (puede haber el mismo producto varias veces)
    const agrupados: Record<string, number> = {};
    for (const { producto, dosis } of productos) {
      const cantidad = dosis ? parsearCantidad(dosis) : 1;
      agrupados[producto] = (agrupados[producto] ?? 0) + cantidad;
    }

    // Procesar cada producto
    for (const [nombreProducto, cantidadADescontar] of Object.entries(agrupados)) {
      const med = encontrarMedicamento(medicamentos, nombreProducto);

      if (!med) {
        noEncontrados.push(nombreProducto);
        continue;
      }

      const nuevaCantidad = Math.max(0, med.cantidad_disponible - cantidadADescontar);

      if (isConnected) {
        const { error } = await supabase
          .from('medicamentos')
          .update({ cantidad_disponible: nuevaCantidad })
          .eq('id', med.id);

        if (!error) {
          descontados.push(`${med.nombre}: -${cantidadADescontar} ${med.unidad}`);
        }
      } else {
        // Offline: actualizar caché y encolar
        const cacheActualizado = medicamentos.map(m =>
          m.id === med.id ? { ...m, cantidad_disponible: nuevaCantidad } : m
        );
        await guardarCacheLocal<Medicamento[]>('medicamentos_cache', cacheActualizado);
        await agregarAlBuzon('medicamentos', 'UPDATE', {
          id: med.id,
          cantidad_disponible: nuevaCantidad,
        });
        descontados.push(`${med.nombre}: -${cantidadADescontar} ${med.unidad}`);
      }

      // Actualizar el array local para siguientes iteraciones
      const idx = medicamentos.findIndex(m => m.id === med.id);
      if (idx !== -1) medicamentos[idx] = { ...medicamentos[idx], cantidad_disponible: nuevaCantidad };

      if (nuevaCantidad <= med.cantidad_minima) {
        sinStock.push(med.nombre);
      }
    }
  } catch (e) {
    console.error('[inventarioService] Error descontando:', e);
  }

  return { descontados, sinStock, noEncontrados };
}
