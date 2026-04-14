import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { supabase } from '../services/supabase';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Save, CheckCircle2, Search, ScanLine, Calendar } from 'lucide-react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import ModalAlerta from './ModalAlerta';
import DatePickerModal from './DatePickerModal';

// 1. IMPORTAMOS LAS HERRAMIENTAS OFFLINE Y EL CARTERO (BUZÓN)
import { useNetwork } from '../context/NetworkContext';
import { agregarAlBuzon } from '../services/syncService';
import { guardarCacheLocal, obtenerCacheLocal } from '../services/offlineService';

import SeccionBasica from './FormularioAnimal/SeccionBasica';
import SeccionGenealogia from './FormularioAnimal/SeccionGenealogia';
import type { Animal, Genero, EstadoAnimal, FinProductivo } from '../types';

interface FormState {
  arete: string;
  nombre: string;
  raza: string;
  peso_inicial: string;
  genero: Genero;
  estado: EstadoAnimal;
  fin_productivo: FinProductivo;
  fecha_nacimiento: string;
}

export default function FormularioVaca() {
  const { color } = useTheme();
  const router = useRouter();
  
  // 2. INVOCAMOS AL VIGILANTE DE RED
  const { isConnected } = useNetwork();
  
  const [alerta, setAlerta] = useState({ visible: false, titulo: '', mensaje: '', tipo: 'exito' as 'exito' | 'error' | 'info' });
  const { areteEscaneado } = useLocalSearchParams();
  const [form, setForm] = useState<FormState>({
    arete: (areteEscaneado as string) || '',
    nombre: '',
    raza: '',
    peso_inicial: '',
    genero: 'Hembra',
    estado: 'Becerro / Becerra',
    fin_productivo: 'Doble Propósito',
    fecha_nacimiento: '',
  });

  const [padre, setPadre] = useState<{ id: string, arete_siniiga: string } | null>(null);
  const [madre, setMadre] = useState<{ id: string, arete_siniiga: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // ESTADOS PARA MODALES
  const [selectorConfig, setSelectorConfig] = useState({ visible: false, tipo: '', titulo: '' });
  const [modalPadres, setModalPadres] = useState({ visible: false, tipo: 'padre' as 'padre' | 'madre' });
  const [busquedaArete, setBusquedaArete] = useState('');
  const [buscandoPadre, setBuscandoPadre] = useState(false);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);

  const opcionesEstado = ['Becerro / Becerra', 'Vaquilla', 'Vientre / Producción', 'Vaca Seca', 'Torete / Novillo', 'Semental'];
  const opcionesFin = ['Pie de Cría', 'Engorda', 'Doble Propósito', 'Lechero Especializado'];

  const abrirSelector = (tipo: string, titulo: string) => setSelectorConfig({ visible: true, tipo, titulo });

  const seleccionarOpcion = (valor: string) => {
    if (selectorConfig.tipo === 'estado') {
      setForm({ ...form, estado: valor as EstadoAnimal });
    } else {
      setForm({ ...form, fin_productivo: valor as FinProductivo });
    }
    setSelectorConfig({ ...selectorConfig, visible: false });
  };

  const abrirModalPadres = (tipo: 'padre' | 'madre') => {
    setBusquedaArete('');
    setModalPadres({ visible: true, tipo });
  };

  const { areteFamiliarEscaneado, tipoFamiliar } = useLocalSearchParams();

  useEffect(() => {
    if (areteFamiliarEscaneado && tipoFamiliar) {
      setBusquedaArete(areteFamiliarEscaneado as string);
      setModalPadres({ visible: true, tipo: tipoFamiliar as 'padre' | 'madre' });
    }
  }, [areteFamiliarEscaneado, tipoFamiliar]);

  // 🛡️ BÚSQUEDA DE PADRES BLINDADA OFFLINE
  async function buscarPadreEnBD() {
    if (!busquedaArete) return;
    setBuscandoPadre(true);
    try {
      let dataEncontrada = null;

      if (isConnected) {
        // PLAN A: Buscar en Supabase
        try {
          const { data, error } = await supabase
            .from('animales')
            .select('id, arete_siniiga')
            .eq('arete_siniiga', busquedaArete.trim())
            .single();
          if (!error && data) dataEncontrada = data;
        } catch (e) {
          console.log("Fallo red buscando padre, buscando en local...");
          dataEncontrada = await buscarEnMemoriaLocal(busquedaArete.trim());
        }
      } else {
        // PLAN B: Buscar en la memoria del celular
        dataEncontrada = await buscarEnMemoriaLocal(busquedaArete.trim());
      }

      if (!dataEncontrada) {
        setAlerta({
          visible: true,
          titulo: 'No encontrado',
          mensaje: 'No tenemos registro de este arete. Puedes registrar este animal primero desde el inventario.',
          tipo: 'error',
        });
      } else {
        if (modalPadres.tipo === 'padre') {
          setPadre(dataEncontrada);
        } else {
          setMadre(dataEncontrada);
        }
        setModalPadres({ ...modalPadres, visible: false });
        setAlerta({ visible: true, titulo: '¡Enlazado!', mensaje: `Se agregó a ${dataEncontrada.arete_siniiga} como ${modalPadres.tipo}.`, tipo: 'exito' });
      }
    } catch (e) {
      console.log(e);
    } finally {
      setBuscandoPadre(false);
    }
  }

  // FUNCIÓN AUXILIAR PARA BUSCAR PADRES EN CACHÉ
  async function buscarEnMemoriaLocal(arete: string) {
    const cache = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
    return cache.find((a) => a.arete_siniiga.toLowerCase() === arete.toLowerCase()) ?? null;
  }

  // 🛡️ GUARDADO MAESTRO OFFLINE-FIRST
  const guardarAnimal = async () => {
    if (!form.arete.trim()) {
      setAlerta({ visible: true, titulo: 'Faltan datos', mensaje: 'El número de arete es obligatorio.', tipo: 'error' });
      return;
    }
    if (!form.raza.trim()) {
      setAlerta({ visible: true, titulo: 'Faltan datos', mensaje: 'La raza es obligatoria.', tipo: 'error' });
      return;
    }
    if (form.peso_inicial && parseFloat(form.peso_inicial) <= 0) {
      setAlerta({ visible: true, titulo: 'Peso inválido', mensaje: 'El peso debe ser mayor a 0.', tipo: 'error' });
      return;
    }
    if (form.fecha_nacimiento) {
      const fecha = new Date(form.fecha_nacimiento);
      if (isNaN(fecha.getTime())) {
        setAlerta({ visible: true, titulo: 'Fecha inválida', mensaje: 'El formato de fecha no es válido.', tipo: 'error' });
        return;
      }
      if (fecha > new Date()) {
        setAlerta({ visible: true, titulo: 'Fecha inválida', mensaje: 'La fecha de nacimiento no puede ser en el futuro.', tipo: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      // 🛡️ CAMBIO 1: Usamos getSession para obtener el ID del usuario sin forzar red
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) throw new Error("No se encontró sesión de usuario");

      const nuevoAnimal = {
        user_id: userId,
        arete_siniiga: form.arete,
        nombre: form.nombre,
        raza: form.raza,
        peso_inicial: parseFloat(form.peso_inicial) || 0,
        genero: form.genero,
        estado: form.estado,
        fin_productivo: form.fin_productivo,
        // 🛡️ IMPORTANTE: Solo mandamos el ID, no el objeto completo
        id_padre: padre?.id || null, 
        id_madre: madre?.id || null,
        created_at: new Date().toISOString(),
        fecha_nacimiento: form.fecha_nacimiento || null,
      };

      if (isConnected) {
        // 🟢 MODO ONLINE
        const { error } = await supabase.from('animales').insert([nuevoAnimal]);
        if (error) throw error;
      } else {
        // 🔴 MODO OFFLINE
        console.log("Guardando en buzón de salida...");
        await agregarAlBuzon('animales', 'INSERT', nuevoAnimal);
        
        // 🛡️ CAMBIO 2: Creamos un objeto para el caché con un ID temporal (Timestamp)
        // Esto evita el error "Cannot read property 'toString' of undefined"
        const animalParaCache = { 
          ...nuevoAnimal, 
          id: `temp_${Math.random().toString(36).slice(2)}_${Date.now()}` // UUID temporal
        };

        const cacheActual = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
        await guardarCacheLocal('animales_cache', [animalParaCache, ...cacheActual]);
      }

      setAlerta({ 
        visible: true, 
        titulo: isConnected ? '¡Éxito!' : 'Guardado Local', 
        mensaje: isConnected ? 'Animal registrado en la nube.' : 'Sin internet. Se guardó en el celular y se subirá solo cuando vuelvas a tener señal.', 
        tipo: 'exito' 
      });

      setTimeout(() => {
        setAlerta({ ...alerta, visible: false });
        router.replace('/(tabs)/inventario');
      }, 2000);

    } catch (error: any) {
      console.log("Error al guardar:", error);
      setAlerta({ visible: true, titulo: 'Error', mensaje: error.message || 'No se pudo guardar.', tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentOptions = selectorConfig.tipo === 'estado' ? opcionesEstado : opcionesFin;
  const currentValue = selectorConfig.tipo === 'estado' ? form.estado : form.fin_productivo;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
        
        <View style={[styles.header, { backgroundColor: color }]}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <ChevronLeft color="white" size={36} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Registrar Animal</Text>
            <View style={{ width: 46 }} />
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Datos Iniciales</Text>
          <Text style={styles.cardSubtitle}>Crea la ficha del nuevo integrante.</Text>

          <SeccionBasica form={form} setForm={setForm} color={color} abrirSelector={abrirSelector} />
          {/* FECHA DE NACIMIENTO */}
          <View style={styles.campoFecha}>
            <Text style={styles.campoFechaLabel}>Fecha de Nacimiento <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>(opcional)</Text></Text>
            <TouchableOpacity
              style={[styles.campoFechaBtn, { borderColor: form.fecha_nacimiento ? color : '#E5E7EB' }]}
              onPress={() => setMostrarDatePicker(true)}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={form.fecha_nacimiento ? color : '#9CA3AF'} />
              <Text style={[styles.campoFechaBtnText, { color: form.fecha_nacimiento ? '#111827' : '#9CA3AF' }]}>
                {form.fecha_nacimiento
                  ? (() => {
                      const [y, m, d] = form.fecha_nacimiento.split('-').map(Number);
                      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                      return `${d} de ${meses[m - 1]} de ${y}`;
                    })()
                  : 'Seleccionar fecha (opcional)'}
              </Text>
              {form.fecha_nacimiento && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setForm({ ...form, fecha_nacimiento: '' }); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
          <SeccionGenealogia padre={padre} madre={madre} abrirModalPadres={abrirModalPadres} color={color} />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color }]} onPress={guardarAnimal} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="white" size="large" /> : <><Save color="white" size={28} /><Text style={styles.saveBtnText}>Guardar en Inventario</Text></>}
          </TouchableOpacity>
          
        </View>
        <View style={{height: 60}} /> 
      </ScrollView>

      {/* MODALES DE SELECTOR Y ALERTA (SIN CAMBIOS) */}
      <Modal animationType="slide" transparent visible={selectorConfig.visible}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setSelectorConfig({ ...selectorConfig, visible: false })} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selectorConfig.titulo}</Text>
            <View style={styles.optionsContainer}>
              {currentOptions.map((opcion) => {
                const isSelected = currentValue === opcion;
                return (
                  <TouchableOpacity key={opcion} style={[styles.optionBtn, isSelected && { backgroundColor: color + '15', borderColor: color }]} onPress={() => seleccionarOpcion(opcion)}>
                    <Text style={[styles.optionText, isSelected && { color: color, fontWeight: '900' }]}>{opcion}</Text>
                    {isSelected && <CheckCircle2 color={color} size={24} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectorConfig({ ...selectorConfig, visible: false })}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={modalPadres.visible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalPadres({ ...modalPadres, visible: false })} />
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Enlazar {modalPadres.tipo === 'padre' ? 'Toro (Padre)' : 'Vaca (Madre)'}</Text>
              
              <View style={[styles.inputWrapper, { borderColor: color, marginBottom: 15, width: '100%' }]}>
                <Search size={24} color={color} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Ingresa el arete..." 
                  value={busquedaArete}
                  onChangeText={setBusquedaArete}
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: color, width: '100%', marginTop: 0, marginBottom: 15, minHeight: 56 }]} 
                onPress={buscarPadreEnBD}
                disabled={buscandoPadre || !busquedaArete}
              >
                {buscandoPadre ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Buscar y Enlazar</Text>}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                <Text style={{ marginHorizontal: 10, color: '#9CA3AF', fontWeight: 'bold' }}>O</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              </View>

              <TouchableOpacity 
                style={styles.scanModalBtn}
                onPress={() => {
                  setModalPadres({ ...modalPadres, visible: false });
                  router.push({ 
                    pathname: '/escaner', 
                    params: { origin: modalPadres.tipo, returnPath: '/nuevo-animal' } 
                  });
                }}
              >
                <ScanLine color="#4B5563" size={24} />
                <Text style={styles.scanModalText}>Escanear Arete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      <DatePickerModal
        visible={mostrarDatePicker}
        valorInicial={form.fecha_nacimiento}
        color={color}
        onConfirm={(fecha) => { setForm({ ...form, fecha_nacimiento: fecha }); setMostrarDatePicker(false); }}
        onClose={() => setMostrarDatePicker(false)}
      />

      <ModalAlerta 
        visible={alerta.visible}
        titulo={alerta.titulo}
        mensaje={alerta.mensaje}
        tipo={alerta.tipo}
        colorTema={color}
        onClose={() => {
          setAlerta({ ...alerta, visible: false });
          if (alerta.tipo === 'exito') router.back(); 
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ... ESTILOS (IGUALES A TU ARCHIVO ORIGINAL)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { height: 180, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 60 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  iconBtn: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  formCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -50, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', elevation: 4 },
  cardTitle: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 16, color: '#4B5563', fontWeight: '600', marginBottom: 25 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, minHeight: 64 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 18, color: '#111827', fontWeight: '700', minHeight: 64 },
  scanModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', width: '100%', padding: 16, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  scanModalText: { fontSize: 16, fontWeight: '800', color: '#4B5563' },
  saveBtn: { flexDirection: 'row', minHeight: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 35, gap: 12, elevation: 4 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.7)' },
  modalDismissArea: { flex: 1 },
  bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, alignItems: 'center', elevation: 20 },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, marginBottom: 20 },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 20, width: '100%', textAlign: 'left' },
  optionsContainer: { width: '100%', gap: 12, marginBottom: 25 },
  optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, minHeight: 64, borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  optionText: { fontSize: 18, fontWeight: '700', color: '#4B5563' },
  cancelBtn: { width: '100%', minHeight: 60, borderRadius: 16, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#111827', fontSize: 18, fontWeight: '800' },
  campoFecha: { marginBottom: 20 },
  campoFechaLabel: { fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 8 },
  campoFechaBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 14, padding: 14, backgroundColor: '#F9FAFB' },
  campoFechaBtnText: { flex: 1, fontSize: 15, fontWeight: '700' },
});