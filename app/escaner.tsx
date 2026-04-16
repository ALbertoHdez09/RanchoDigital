import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { CameraView, useCameraPermissions, type CameraView as CameraViewType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import {
  ChevronLeft, CheckCircle, PlusCircle, Stethoscope, Users,
  Sparkles, X, AlertCircle, Target,
} from 'lucide-react-native';
import { useNetwork } from '../src/context/NetworkContext';
import { obtenerCacheLocal } from '../src/services/offlineService';
import { localDB as AsyncStorage } from '../src/services/localDB';
import { supabase } from '../src/services/supabase';
import type { Animal } from '../src/types';
import { detectarArete, precargarModelo, liberarModelo } from '../src/services/areteScannerService';

type ModoEscaneo = 'qr' | 'ia';

interface ModalData {
  tipo: 'encontrado' | 'familiar_encontrado' | 'nuevo';
  titulo: string;
  mensaje: string;
  arete: string;
  id: string;
}

interface ModalIA {
  visible: boolean;
  exito: boolean;
  titulo: string;
  mensaje: string;
}

async function buscarAnimalPorArete(arete: string, isConnected: boolean): Promise<Animal | null> {
  if (isConnected) {
    try {
      const { data, error } = await supabase
        .from('animales').select('id, arete_siniiga').eq('arete_siniiga', arete).single();
      if (!error && data) return data as Animal;
    } catch { /* fallback */ }
  }
  const cache = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
  return cache.find(a => String(a.arete_siniiga) === String(arete)) ?? null;
}

export default function EscanerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]     = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [modo, setModo]           = useState<ModoEscaneo>('qr');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<ModalData>({
    tipo: 'nuevo', titulo: '', mensaje: '', arete: '', id: '',
  });
  const [modalIA, setModalIA] = useState<ModalIA>({
    visible: false, exito: false, titulo: '', mensaje: '',
  });
  const [modalIAConInput, setModalIAConInput] = useState<{
    visible: boolean; confianzaDeteccion: number; numeroSugerido: string; textosSugeridos: string[];
  }>({ visible: false, confianzaDeteccion: 0, numeroSugerido: '', textosSugeridos: [] });

  const cameraRef = useRef<CameraViewType>(null);
  const router    = useRouter();
  const { color } = useTheme();
  const { isConnected } = useNetwork();
  const { origin, returnPath, animalId } = useLocalSearchParams();

  useEffect(() => {
    precargarModelo();
    return () => { liberarModelo(); };
  }, []);

  // ─── Lógica QR ───────────────────────────────────────────────────────────────

  async function procesarArete(arete: string) {
    if (scanned) return;
    setScanned(true);
    setProcesando(true);
    try {
      const animalEncontrado = await buscarAnimalPorArete(arete, !!isConnected);
      if (origin === 'padre' || origin === 'madre') {
        setModalData({
          tipo: animalEncontrado ? 'familiar_encontrado' : 'nuevo',
          titulo: animalEncontrado
            ? (origin === 'padre' ? 'Toro Encontrado' : 'Vaca Encontrada')
            : 'No registrado',
          mensaje: animalEncontrado
            ? `Listo para enlazar como ${origin}.`
            : 'Este arete no está en tu inventario.',
          arete, id: animalEncontrado?.id ?? '',
        });
      } else {
        setModalData({
          tipo: animalEncontrado ? 'encontrado' : 'nuevo',
          titulo: animalEncontrado
            ? '¡Arete Encontrado!'
            : (origin === 'salud' ? 'Animal no registrado' : 'Nuevo Registro'),
          mensaje: animalEncontrado
            ? (origin === 'salud' ? 'Animal listo para registro médico.' : 'Se encontró la ficha del animal.')
            : 'Este arete no está en tu inventario.',
          arete, id: animalEncontrado?.id ?? '',
        });
      }
      setModalVisible(true);
    } catch (e) {
      console.log('Error procesando arete:', e);
    } finally {
      setProcesando(false);
    }
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (modo !== 'qr') return;
    procesarArete(data);
  };

  // ─── Lógica IA ────────────────────────────────────────────────────────────────

  async function handleIAScan() {
    if (scanned || procesando || !cameraRef.current) return;
    setProcesando(true);

    try {
      const foto = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.7,
        skipProcessing: true,
      });

      if (!foto?.uri) {
        setModalIA({ visible: true, exito: false, titulo: 'Error de cámara', mensaje: 'No se pudo capturar la imagen. Intenta de nuevo.' });
        setProcesando(false);
        return;
      }

      // Reducir la resolución a 800px para no saturar la RAM de la IA
      const rescale = await ImageManipulator.manipulateAsync(
        foto.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const deteccion = await detectarArete(rescale.uri);
      console.log('🔍 Resultado IA:', JSON.stringify(deteccion));

      if (deteccion.areteDetectado && deteccion.numeroLeido) {
        // ML Kit leyó el número — buscar directamente
        setScanned(true);
        await procesarArete(deteccion.numeroLeido);
      } else {
        // No detectó patrón de arete — mostrar lo que sí leyó para que el usuario corrija
        setModalIAConInput({
          visible: true,
          confianzaDeteccion: deteccion.confianza,
          numeroSugerido: '',
          textosSugeridos: deteccion.todosLosTextos ?? [],
        });
      }

    } catch (e) {
      console.log('Error en IA scan:', e);
      setModalIA({ visible: true, exito: false, titulo: 'Error', mensaje: 'Ocurrió un error al procesar la imagen.' });
    } finally {
      setProcesando(false);
    }
  }

  /**
   * Usa Google Cloud Vision API (REST) para leer texto en la imagen.
   * Filtra los resultados para quedarse con el número de arete.
   * Requiere EXPO_PUBLIC_GOOGLE_VISION_KEY en .env
   */
  async function leerNumeroArete(uri: string): Promise<string | null> {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY;
    if (!apiKey) {
      console.warn('Falta EXPO_PUBLIC_GOOGLE_VISION_KEY — OCR desactivado');
      return null;
    }

    try {
      // Leer el archivo como base64
      const fotoResponse = await fetch(uri);
      const blob = await fotoResponse.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64 },
              features: [{ type: 'TEXT_DETECTION', maxResults: 10 }],
            }],
          }),
        }
      );

      const data = await visionResponse.json();
      const textos: string[] = data.responses?.[0]?.textAnnotations?.map((t: any) => t.description) ?? [];

      console.log('📝 Textos detectados:', textos.slice(0, 5));

      // Buscar el patrón de número de arete: 3-8 dígitos, posiblemente con letras
      for (const texto of textos) {
        const limpio = texto.trim().toUpperCase().replace(/\s+/g, '');
        // Acepta: 2292, MX-4502, MEX001, 1804, etc.
        if (/^[A-Z]{0,3}[-]?\d{3,8}$/.test(limpio) || /^\d{3,8}$/.test(limpio)) {
          return limpio;
        }
      }
      return null;
    } catch (e) {
      console.log('Error OCR:', e);
      return null;
    }
  }

  // ─── Acciones del modal QR ────────────────────────────────────────────────────

  const handleModalAction = () => {
    setModalVisible(false);
    if (origin === 'salud') {
      router.replace({ pathname: '/nuevo-registro-medico', params: { areteEscaneado: modalData.arete } });
      return;
    }
    if (origin === 'padre' || origin === 'madre') {
      if (modalData.tipo === 'familiar_encontrado') {
        router.navigate({ pathname: returnPath as any, params: { areteFamiliarEscaneado: modalData.arete, tipoFamiliar: origin, id: animalId } });
      } else {
        router.replace({ pathname: '/nuevo-animal', params: { areteEscaneado: modalData.arete } });
      }
      return;
    }
    if (modalData.tipo === 'encontrado') {
      router.replace(`/animal/${modalData.id}`);
    } else {
      router.replace({ pathname: '/nuevo-animal', params: { areteEscaneado: modalData.arete } });
    }
  };

  const handleCerrarModal = () => {
    setModalVisible(false);
    setTimeout(() => setScanned(false), 500);
  };

  // ─── Permisos ─────────────────────────────────────────────────────────────────

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" color={color} style={{ marginTop: 100 }} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <Text style={styles.permissionText}>Ocupamos usar la cámara para escanear los aretes, mi pa.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Dar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={modo === 'qr' && !scanned ? handleBarCodeScanned : undefined}
      />

      <View style={[styles.overlay, StyleSheet.absoluteFillObject]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft color="white" size={36} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escanear Arete</Text>
          <View style={{ width: 46 }} />
        </View>

        <View style={styles.scannerWindow}>
          <View style={[styles.corner, styles.topLeft,     { borderColor: color }]} />
          <View style={[styles.corner, styles.topRight,    { borderColor: color }]} />
          <View style={[styles.corner, styles.bottomLeft,  { borderColor: color }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: color }]} />
          {procesando && <ActivityIndicator size="large" color={color} />}
        </View>

        <View style={styles.footer}>
          <View style={styles.modoToggle}>
            <TouchableOpacity
              style={[styles.modoBtn, modo === 'qr' && { backgroundColor: color }]}
              onPress={() => { setModo('qr'); setScanned(false); }}
            >
              <Text style={[styles.modoBtnText, modo === 'qr' && { color: 'white' }]}>QR / Código</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modoBtn, modo === 'ia' && { backgroundColor: color }]}
              onPress={() => { setModo('ia'); setScanned(false); }}
            >
              <Sparkles color={modo === 'ia' ? 'white' : 'rgba(255,255,255,0.7)'} size={14} />
              <Text style={[styles.modoBtnText, modo === 'ia' && { color: 'white' }]}>Detección IA</Text>
            </TouchableOpacity>
          </View>

          {modo === 'qr' && (
            <Text style={styles.instructionText}>Apunta al código QR o de barras del arete</Text>
          )}

          {modo === 'ia' && (
            <>
              <Text style={styles.instructionText}>Enfoca el arete y presiona el botón</Text>
              <TouchableOpacity
                style={[styles.iaCaptureBtn, { backgroundColor: color }, procesando && styles.btnDisabled]}
                onPress={handleIAScan}
                disabled={procesando}
              >
                {procesando
                  ? <ActivityIndicator color="white" />
                  : <><Sparkles color="white" size={20} /><Text style={styles.iaCaptureText}>Detectar Arete</Text></>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ─── Modal resultado QR ─────────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={handleCerrarModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.sheetHandle} />

            <View style={[styles.modalIconBg, {
              backgroundColor: (modalData.tipo === 'encontrado' || modalData.tipo === 'familiar_encontrado') ? color + '15' : '#FEF3C7',
            }]}>
              {origin === 'salud' ? <Stethoscope color={color} size={36} />
                : modalData.tipo === 'familiar_encontrado' ? <Users color={color} size={36} />
                : modalData.tipo === 'encontrado' ? <CheckCircle color={color} size={36} />
                : <PlusCircle color="#F59E0B" size={36} />}
            </View>

            <Text style={styles.modalTitle}>{modalData.titulo}</Text>
            <Text style={styles.modalSubtitle}>{modalData.mensaje}</Text>

            {modalData.arete ? (
              <View style={[styles.areteTag, { borderColor: color + '30' }]}>
                <Text style={styles.areteTagLabel}>ARETE</Text>
                <Text style={[styles.areteTagText, { color }]}>{modalData.arete}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.modalBtnAction, {
                backgroundColor: (modalData.tipo === 'encontrado' || modalData.tipo === 'familiar_encontrado' || origin === 'salud') ? color : '#F59E0B',
              }]}
              onPress={handleModalAction}
            >
              <Text style={styles.modalBtnActionText}>
                {origin === 'salud' ? 'Usar en Área Médica'
                  : modalData.tipo === 'familiar_encontrado' ? 'Regresar y Enlazar'
                  : modalData.tipo === 'encontrado' ? 'Ver Ficha del Animal'
                  : 'Registrar Animal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnCancel} onPress={handleCerrarModal}>
              <Text style={styles.modalBtnCancelText}>Volver a escanear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal resultado IA ──────────────────────────────────────────────── */}
      <Modal animationType="fade" transparent visible={modalIA.visible}>
        <View style={styles.iaModalOverlay}>
          <View style={styles.iaModalContent}>
            <TouchableOpacity
              style={styles.iaModalClose}
              onPress={() => setModalIA({ ...modalIA, visible: false })}
            >
              <X color="#6B7280" size={20} />
            </TouchableOpacity>

            <View style={[styles.iaModalIconBg, {
              backgroundColor: modalIA.exito ? color + '15' : '#FEE2E2',
            }]}>
              {modalIA.exito
                ? <Sparkles color={color} size={36} />
                : <AlertCircle color="#EF4444" size={36} />
              }
            </View>

            <Text style={styles.iaModalTitle}>{modalIA.titulo}</Text>
            <Text style={styles.iaModalMensaje}>{modalIA.mensaje}</Text>

            <TouchableOpacity
              style={[styles.iaModalBtn, { backgroundColor: modalIA.exito ? color : '#EF4444' }]}
              onPress={() => setModalIA({ ...modalIA, visible: false })}
            >
              <Text style={styles.iaModalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal IA con input de número ──────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={modalIAConInput.visible}>
        <View style={styles.iaModalOverlay}>
          <View style={styles.iaModalContent}>
            <TouchableOpacity
              style={styles.iaModalClose}
              onPress={() => setModalIAConInput({ ...modalIAConInput, visible: false })}
            >
              <X color="#6B7280" size={20} />
            </TouchableOpacity>

            <View style={[styles.iaModalIconBg, { backgroundColor: color + '15' }]}>
              <Target color={color} size={36} />
            </View>

            <Text style={styles.iaModalTitle}>Arete Detectado</Text>
            <Text style={styles.iaModalMensaje}>
              {modalIAConInput.textosSugeridos.length > 0
                ? 'ML Kit detectó estos textos. Toca el número correcto o escríbelo:'
                : 'No se detectó texto. Ingresa el número manualmente:'}
            </Text>

            {/* Sugerencias tocables */}
            {modalIAConInput.textosSugeridos.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, width: '100%' }}>
                {modalIAConInput.textosSugeridos.slice(0, 8).map((t, i) => (
                  <TouchableOpacity
                    key={i}
                    style={{ backgroundColor: color + '15', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: color + '40' }}
                    onPress={() => setModalIAConInput({ ...modalIAConInput, numeroSugerido: t.toUpperCase() })}
                  >
                    <Text style={{ color, fontWeight: '800', fontSize: 14 }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={[styles.iaNumeroInput, { borderColor: color }]}
              placeholder="Ej: 2292"
              placeholderTextColor="#9CA3AF"
              value={modalIAConInput.numeroSugerido}
              onChangeText={(t) => setModalIAConInput({ ...modalIAConInput, numeroSugerido: t.toUpperCase() })}
              autoCapitalize="characters"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.iaModalBtn, { backgroundColor: color, opacity: modalIAConInput.numeroSugerido ? 1 : 0.5 }]}
              disabled={!modalIAConInput.numeroSugerido}
              onPress={() => {
                const num = modalIAConInput.numeroSugerido.trim();
                setModalIAConInput({ ...modalIAConInput, visible: false });
                if (num) { setScanned(true); procesarArete(num); }
              }}
            >
              <Text style={styles.iaModalBtnText}>Buscar Arete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionText: { color: 'white', textAlign: 'center', marginBottom: 20 },
  btn: { padding: 15, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: 'bold' },
  btnDisabled: { opacity: 0.6 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', zIndex: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
  iconBtn: { padding: 10 },

  scannerWindow: { alignSelf: 'center', width: 260, height: 260, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 40, height: 40, borderWidth: 4 },
  topLeft:     { top: 0,    left: 0,  borderBottomWidth: 0, borderRightWidth: 0 },
  topRight:    { top: 0,    right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft:  { bottom: 0, left: 0,  borderTopWidth: 0,    borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0,    borderLeftWidth: 0 },

  footer: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center', gap: 12 },
  modoToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 4, gap: 4 },
  modoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modoBtnText: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 13 },
  instructionText: { color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  iaCaptureBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20, elevation: 4 },
  iaCaptureText: { color: 'white', fontWeight: '900', fontSize: 16 },

  // Modal QR — bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 28, paddingBottom: 36, alignItems: 'center' },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, marginBottom: 24 },
  modalIconBg: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  areteTag: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 24, alignItems: 'center' },
  areteTagLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 4 },
  areteTagText: { fontSize: 24, fontWeight: '900', letterSpacing: 3 },
  modalBtnAction: { width: '100%', paddingVertical: 17, borderRadius: 18, alignItems: 'center', marginBottom: 12, elevation: 2 },
  modalBtnActionText: { color: 'white', fontSize: 16, fontWeight: '900' },
  modalBtnCancel: { width: '100%', paddingVertical: 14, borderRadius: 18, alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: '#6B7280', fontSize: 15, fontWeight: '700' },

  // Modal IA — centrado
  iaModalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  iaModalContent: { backgroundColor: 'white', borderRadius: 28, padding: 28, width: '100%', alignItems: 'center', elevation: 12 },
  iaModalClose: { position: 'absolute', top: 16, right: 16, padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  iaModalIconBg: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 18, marginTop: 8 },
  iaModalTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 10, textAlign: 'center' },
  iaModalMensaje: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  iaModalBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  iaModalBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
  iaNumeroInput: { width: '100%', borderWidth: 2, borderRadius: 14, padding: 16, fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center', backgroundColor: '#F9FAFB', marginBottom: 16, letterSpacing: 4 },
});
