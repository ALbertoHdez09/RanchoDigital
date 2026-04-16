import { localDB as AsyncStorage } from './localDB';
import { supabase } from './supabase';
import type { TareaSync } from '../types';

const SYNC_QUEUE_KEY = 'sync_queue';

export async function agregarAlBuzon(tabla: string, operacion: TareaSync['operacion'], datos: Record<string, unknown>): Promise<void> {
  try {
    const queueCachada = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: TareaSync[] = queueCachada ? JSON.parse(queueCachada) : [];
    queue.push({ tabla, operacion, datos, timestamp: Date.now() });
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log(`📦 Tarea guardada en el buzón: ${operacion} en ${tabla}`);
  } catch (error) {
    console.error('Error al guardar en el buzón:', error);
  }
}

export async function sincronizarBuzon(): Promise<void> {
  try {
    const queueCachada = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueCachada) return;

    let queue: TareaSync[] = JSON.parse(queueCachada);
    if (queue.length === 0) return;

    console.log(`🚀 Iniciando sincronización de ${queue.length} elementos...`);
    const tareasFallidas: TareaSync[] = [];

    for (const tarea of queue) {
      const { tabla, operacion, datos } = tarea;
      let error: { code?: string; message: string } | null = null;

      const datosLimpios: Record<string, unknown> = { ...datos };
        if (datosLimpios.padre) delete datosLimpios.padre;
        if (datosLimpios.madre) delete datosLimpios.madre;

        // 🆕 Normalizar nombres de campos viejos (backward compatibility)
        if (tabla === 'animales') {
        if ('madre_id' in datosLimpios) {
            datosLimpios.id_madre = datosLimpios.madre_id || null;
            delete datosLimpios.madre_id;
        }
        if ('padre_id' in datosLimpios) {
            datosLimpios.id_padre = datosLimpios.padre_id || null;
            delete datosLimpios.padre_id;
        }
        }

      // 🎁 CASO 1: Plan médico compuesto (desde nuevo-plan)
      if (tabla === 'planes_medicos_compuesto' && operacion === 'INSERT') {
        console.log("🛠️ Desempacando plan médico compuesto...");
        const { dosis_relacionadas, ...planData } = datosLimpios;

        const { data: planInsertado, error: errPlan } = await supabase
          .from('planes_medicos')
          .insert([planData])
          .select()
          .single();

        if (errPlan) {
          error = errPlan;
        } else if (planInsertado && dosis_relacionadas) {
          const dosisAInsertar = (dosis_relacionadas as Record<string, unknown>[]).map((d) => ({
            ...d,
            plan_id: planInsertado.id
          }));
          const { error: errDosis } = await supabase.from('dosis_medicas').insert(dosisAInsertar);
          if (errDosis) error = errDosis;
        }
      }
      // 🆕 CASO 2: Plan médico con dosis embebidas (desde nuevo-registro-medico)
      else if (tabla === 'planes_medicos' && operacion === 'INSERT' && datosLimpios.dosis_medicas) {
        console.log("🛠️ Desempacando plan médico con dosis embebidas...");
        const { dosis_medicas, ...planData } = datosLimpios;

        const { data: planInsertado, error: errPlan } = await supabase
          .from('planes_medicos')
          .insert([planData])
          .select()
          .single();

        if (errPlan) {
          error = errPlan;
        } else if (planInsertado && dosis_medicas) {
          const dosisAInsertar = (dosis_medicas as Record<string, unknown>[]).map((d) => ({
            ...d,
            plan_id: planInsertado.id
          }));
          const { error: errDosis } = await supabase.from('dosis_medicas').insert(dosisAInsertar);
          if (errDosis) error = errDosis;
        }
      }
      // 🟢 CASO 3: INSERT normal (animales, registros_salud, etc.)
      // En el CASO 3 (INSERT normal), después del insert exitoso de 'animales':
        else if (operacion === 'INSERT') {
        const { data: insertado, error: err } = await supabase
            .from(tabla)
            .insert([datosLimpios])
            .select()
            .single();
        error = err;

        // 🆕 Si era un animal, actualizamos el caché con el ID real de Supabase
        if (!err && insertado && tabla === 'animales') {
            const { guardarCacheLocal, obtenerCacheLocal } = require('./offlineService');
            const cache = await obtenerCacheLocal('animales_cache', true) || [];
            // Reemplazamos el animal con ID temporal por el que tiene ID real
            const cacheActualizado = cache.map((a: any) =>
            String(a.arete_siniiga) === String(insertado.arete_siniiga) ? insertado : a
            );
            await guardarCacheLocal('animales_cache', cacheActualizado);
            console.log(`🔄 Caché de animales actualizado con ID real: ${insertado.id}`);
        }
        }
      // 🔄 CASO 4: UPDATE
      else if (operacion === 'UPDATE') {
        // Estrategia "Last Write Wins" para Resolución de Conflictos
        const { data: remoteData, error: fetchErr } = await supabase
          .from(tabla)
          .select('updated_at')
          .eq('id', datosLimpios.id)
          .single();
          
        let ignorarLocal = false;
        if (!fetchErr && remoteData?.updated_at) {
          const tiempoNube = new Date(remoteData.updated_at).getTime();
          if (tiempoNube > tarea.timestamp) {
             console.log(`⚠️ [Conflicto] ${tabla}: La nube tiene una versión más nueva. Descartando edición local.`);
             ignorarLocal = true;
          }
        }

        if (!ignorarLocal) {
          const { error: err } = await supabase.from(tabla).update(datosLimpios).eq('id', datosLimpios.id);
          error = err;
        }
      }

      // 🗑️ CASO 5: DELETE
      else if (operacion === 'DELETE') {
        const { error: err } = await supabase.from(tabla).delete().eq('id', datosLimpios.id);
        error = err;

        // Si era un animal, limpiamos el caché relacionado
        if (!err && tabla === 'animales' && datosLimpios.id) {
          const { guardarCacheLocal, obtenerCacheLocal } = require('./offlineService');
          const cache = await obtenerCacheLocal('animales_cache', true) || [];
          await guardarCacheLocal('animales_cache', cache.filter((a: any) => String(a.id) !== String(datosLimpios.id)));
          // Limpiar caché de pesajes e historial de salud de ese animal
          const AsyncStorageModule = require('./localDB').localDB;
          await AsyncStorageModule.multiRemove([
            `pesajes_${datosLimpios.id}`,
            `historial_salud_${datosLimpios.id}`,
          ]);
          console.log(`🗑️ Caché relacionado limpiado para animal: ${datosLimpios.id}`);
        }
      }

      if (error) {
        if (error.code === '23505' || error.code === '22P02') {
          // Solo descartamos duplicados — el resto se reintenta
          console.log(`⚠️ Descartando duplicado en ${tabla}:`, error.message);
        } else {
          console.error(`❌ Error en ${tabla}:`, error.message);
          tareasFallidas.push(tarea);
        }
      } else {
        console.log(`✅ Sincronizado: ${tabla}`);
      }
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(tareasFallidas));

    if (tareasFallidas.length > 0) {
      console.log(`⚠️ Quedan ${tareasFallidas.length} tareas pendientes.`);
    } else {
      console.log('✨ Buzón limpio al 100%.');
    }
  } catch (error) {
    console.error('Error general sincronizando buzón:', error);
  }
}