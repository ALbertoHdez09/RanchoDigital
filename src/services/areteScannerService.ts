/**
 * ─── SERVICIO DE DETECCIÓN DE ARETES CON ML KIT ──────────────────────────────
 *
 * Usa Google ML Kit Text Recognition v2 — corre 100% en el dispositivo.
 * Sin internet, sin límites, sin costo.
 *
 * Librería: @react-native-ml-kit/text-recognition
 * ─────────────────────────────────────────────────────────────────────────────
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface ResultadoDeteccion {
  areteDetectado: boolean;
  numeroLeido: string | null;
  confianza: number;
  metodo: 'mlkit' | 'fallback';
  todosLosTextos?: string[];  // para debug
}

// ─── Patrones de número de arete ─────────────────────────────────────────────

const PATRONES_ARETE = [
  /^\d{3,8}$/,                          // solo números: 2292, 18042
  /^[A-Z]{1,3}[-\s]?\d{3,8}$/,         // letras + números: MX-4502, MEX001
  /^\d{3,8}[-\s]?[A-Z]{1,3}$/,         // números + letras: 2292A
  /^[A-Z]{1,3}\d{3,8}[A-Z]{0,3}$/,     // mixto: MX4502B
];

function esPosibleArete(texto: string): boolean {
  const limpio = texto.trim().toUpperCase().replace(/[\s\-_]/g, '');
  if (limpio.length < 3 || limpio.length > 12) return false;
  return PATRONES_ARETE.some(p => p.test(limpio));
}

function normalizarNumero(texto: string): string {
  return texto.trim().toUpperCase().replace(/\s+/g, '');
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Lee el número de arete en la imagen usando ML Kit (on-device, sin internet).
 * @param uri - URI local de la foto capturada por la cámara
 */
export async function detectarArete(uri: string): Promise<ResultadoDeteccion> {
  try {
    // 1. Mejorar la imagen para OCR: escala de grises + contraste
    //    Redimensionamos a 1280px para que el texto sea más legible
    const procesada = await manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { format: SaveFormat.JPEG, compress: 1.0 }
    );

    console.log('📸 Imagen procesada para OCR');

    // 2. ML Kit lee el texto en el dispositivo
    const resultado = await TextRecognition.recognize(procesada.uri);

    const todosLosTextos: string[] = [];

    // Recopilar todos los bloques de texto detectados
    for (const bloque of resultado.blocks) {
      for (const linea of bloque.lines) {
        const texto = linea.text.trim();
        if (texto) todosLosTextos.push(texto);
        // También revisar elementos individuales
        for (const elemento of linea.elements) {
          const elem = elemento.text.trim();
          if (elem && !todosLosTextos.includes(elem)) {
            todosLosTextos.push(elem);
          }
        }
      }
    }

    console.log('📝 Textos detectados:', todosLosTextos.join(' | '));

    if (todosLosTextos.length === 0) {
      return { areteDetectado: false, numeroLeido: null, confianza: 0, metodo: 'mlkit', todosLosTextos: [] };
    }

    // 3. Filtrar candidatos a número de arete
    const candidatos = todosLosTextos.filter(esPosibleArete);
    console.log('🔢 Candidatos a arete:', candidatos);

    if (candidatos.length === 0) {
      return {
        areteDetectado: false,
        numeroLeido: null,
        confianza: 0,
        metodo: 'mlkit',
        todosLosTextos,
      };
    }

    // 4. Elegir el mejor candidato
    //    Preferimos números puros de 3-6 dígitos (formato más común de arete)
    const numeroPuro = candidatos.find(c => /^\d{3,6}$/.test(c.trim()));
    const mejor = numeroPuro ?? candidatos[0];
    const numero = normalizarNumero(mejor);

    console.log(`✅ Número de arete detectado: ${numero}`);

    return {
      areteDetectado: true,
      numeroLeido: numero,
      confianza: 0.9,
      metodo: 'mlkit',
      todosLosTextos,
    };

  } catch (e: any) {
    console.error('[areteScannerService] Error ML Kit:', e?.message ?? e);
    return { areteDetectado: false, numeroLeido: null, confianza: 0, metodo: 'fallback' };
  }
}

export async function precargarModelo(): Promise<void> {}
export function liberarModelo(): void {}
