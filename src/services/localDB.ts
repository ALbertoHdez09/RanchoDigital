import * as SQLite from 'expo-sqlite';

// Abrir localDB sincronamente para evitar asincronia fatal inicial
const db = SQLite.openDatabaseSync('ranchodigital_cache.db');

// Inicializar tabla clave/valor para imitar API de AsyncStorage
db.execSync(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

/**
 * Wrapper de SQLite con la misma interface Promise que AsyncStorage 
 * para migración transparente.
 */
export const localDB = {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [key]);
      return result ? result.value : null;
    } catch (e) {
      console.error('Error in localDB.getItem:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await db.runAsync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [key, value]);
    } catch (e) {
      console.error('Error in localDB.setItem:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await db.runAsync('DELETE FROM kv_store WHERE key = ?', [key]);
    } catch (e) {
      console.error('Error in localDB.removeItem:', e);
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;
    try {
      const placeholders = keys.map(() => '?').join(',');
      await db.runAsync(`DELETE FROM kv_store WHERE key IN (${placeholders})`, keys);
    } catch (e) {
      console.error('Error in localDB.multiRemove:', e);
    }
  }
};
