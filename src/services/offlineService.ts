import { localDB as AsyncStorage } from './localDB';
import type { CacheEntry } from '../types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Guarda datos en caché local con timestamp para TTL */
export const guardarCacheLocal = async <T>(llave: string, datos: T): Promise<void> => {
  try {
    const entry: CacheEntry<T> = { data: datos, timestamp: Date.now() };
    await AsyncStorage.setItem(llave, JSON.stringify(entry));
  } catch (e) {
    console.log(`Error guardando en caché la llave ${llave}:`, e);
  }
};

/** Lee datos del caché local. Retorna null si expiró o no existe. */
export const obtenerCacheLocal = async <T>(
  llave: string,
  ignorarTTL = false
): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(llave);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Soporte para entradas antiguas sin timestamp (backward compat)
    if (!entry.timestamp) return entry as unknown as T;

    const expirado = Date.now() - entry.timestamp > CACHE_TTL_MS;
    if (expirado && !ignorarTTL) {
      console.log(`⏰ Caché expirado para: ${llave}`);
      return null;
    }

    return entry.data;
  } catch (e) {
    console.log(`Error leyendo caché de la llave ${llave}:`, e);
    return null;
  }
};

/** Invalida manualmente una entrada del caché */
export const invalidarCache = async (llave: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(llave);
  } catch (e) {
    console.log(`Error invalidando caché de la llave ${llave}:`, e);
  }
};