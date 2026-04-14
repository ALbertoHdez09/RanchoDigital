import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../src/services/supabase';
import { useTheme } from '../src/context/ThemeContext';
import { ChevronLeft, Search, Check, Stethoscope, Clock, X, Syringe, ShieldAlert } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useNetwork } from '../src/context/NetworkContext';
import { obtenerCacheLocal, guardarCacheLocal } from '../src/services/offlineService';
import { agregarAlBuzon } from '../src/services/syncService';
import ModalAlerta from '../src/components/ModalAlerta';
import type { Animal, DosisMedica } from '../src/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { descontarInventario } from '../src/services/inventarioService';

export default function NuevoTratamientoScreen() {
  const router = useRouter();
  const { color } = useTheme();

  // 2. INVOCAMOS AL VIGILANTE
  const { isConnected } = useNetwork();

  const [animales, setAnimales] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [animalSeleccionado, setAnimalSeleccionado] = useState<any>(null);

  const [tipo, setTipo] = useState('Vacuna'); 
  const [enfermedad, setEnfermedad] = useState(''); 
  const [producto, setProducto] = useState(''); 
  const [dosis, setDosis] = useState(''); 
  const [via, setVia] = useState('IM'); // IM, SC, Oral
  const [frecuencia, setFrecuencia] = useState('Dosis única'); 
  const [duracion, setDuracion] = useState(''); 
  const [horaInicio, setHoraInicio] = useState(''); 
  
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<{ visible: boolean; tipo: 'exito' | 'error' | 'info'; titulo: string; mensaje: string }>({ visible: false, tipo: 'info', titulo: '', mensaje: '' });

  const mostrar = (titulo: string, mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info') =>
    setAlerta({ visible: true, titulo, mensaje, tipo });

  useEffect(() => {
    const now = new Date();
    setHoraInicio(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAnimales();
    }, [isConnected])
  );

  // 🛡️ BUSCADOR DE ANIMALES BLINDADO
  async function fetchAnimales() {
    try {
      let dataAnimales: any[] = [];
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (isConnected) {
        try {
          const { data } = await supabase
            .from('animales')
            .select('id, arete_siniiga, nombre')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });
          if (data) dataAnimales = data;
        } catch (e) {
          console.log("Fallo red buscando animales, usando caché...");
          dataAnimales = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
        }
      } else {
        dataAnimales = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
      }

      setAnimales(dataAnimales);
    } catch (e) {
      console.log('Error fetchAnimales Tratamiento:', e);
    }
  }

  // Filtro de animales en tiempo real
  const animalesFiltrados = animales.filter(a => 
    String(a.arete_siniiga || '').toLowerCase().includes(busqueda.toLowerCase()) || 
    String(a.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // 🛡️ GUARDADO OFFLINE-FIRST
  async function guardarRegistro() {
    if (!animalSeleccionado || !producto || !dosis) {
      mostrar('Faltan Datos', 'Selecciona un animal, el producto y la dosis.', 'error');
      return;
    }

    setGuardando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      const nuevoRegistro = {
        animal_id: animalSeleccionado.id,
        tipo: tipo,
        enfermedad: enfermedad,
        producto: producto,
        dosis: dosis,
        via_administracion: via,
        frecuencia: tipo === 'Tratamiento' ? frecuencia : 'Dosis única',
        duracion_dias: tipo === 'Tratamiento' ? parseInt(duracion) || 1 : 1,
        fecha: new Date().toISOString().split('T')[0],
        user_id: user?.id,
      };

      // ✅ PONER esto — agenda una notificación por cada día del tratamiento
        try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
            const sonidoGuardado = await AsyncStorage.getItem('sonido_escaneo');
            const conSonido = sonidoGuardado !== 'false';
            const diasNum = tipo === 'Tratamiento' ? (parseInt(duracion) || 1) : 1;
            for (let i = 0; i < diasNum; i++) {
            const fechaDosis = new Date();
            fechaDosis.setDate(fechaDosis.getDate() + i);
            if (horaInicio) {
                const [h, m] = horaInicio.split(':');
                fechaDosis.setHours(parseInt(h), parseInt(m), 0, 0);
            } else {
                fechaDosis.setHours(8, 0, 0, 0);
            }
            if (fechaDosis <= new Date()) continue;

            await Notifications.scheduleNotificationAsync({
                content: {
                title: '💉 Dosis programada',
                body: `Aplicar ${producto} (${dosis}) al animal ${animalSeleccionado.arete_siniiga}`,
                sound: conSonido,
                },
                trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: fechaDosis,
                },
            });
            }
        }
        } catch (e) {
        console.log('Error notificaciones:', e);
        }

      // Descontar del inventario al crear el tratamiento
      const { sinStock } = await descontarInventario(
        [{ producto, dosis }],
        user?.id ?? '',
        !!isConnected
      );
      if (sinStock.length > 0) {
        mostrar('Stock bajo', `${sinStock.join(', ')} está por agotarse.`, 'info');
      }

      if (isConnected) {
        // 🟢 PLAN A: Hay internet
        try {
          const { error } = await supabase.from('registros_salud').insert([nuevoRegistro]);
          if (error) throw error;
          mostrar('¡Guardado!', 'El registro médico se guardó correctamente en la nube. ☁️', 'exito');
        } catch (error) {
          console.log("Fallo red al guardar, mandando al buzón...");
          await guardarEnBuzon(nuevoRegistro);
        }
      } else {
        await guardarEnBuzon(nuevoRegistro);
      }

    } catch (error: any) {
      mostrar('Error', error.message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEnBuzon(registro: any) {
    await agregarAlBuzon('registros_salud', 'INSERT', registro);
    const cacheActual = await obtenerCacheLocal<DosisMedica[]>('tareas_cache', true) ?? [];
    const registroParaCache = {
      id: Date.now(),
      producto: registro.producto,
      tipo_producto: registro.tipo,
      fecha_programada: registro.fecha,
      estado: 'Pendiente',
      planes_medicos: {
        animal_id: registro.animal_id,
        animales: animales.find((a: Animal) => a.id === registro.animal_id) ?? {}
      }
    };
    await guardarCacheLocal('tareas_cache', [registroParaCache, ...cacheActual]);
    mostrar('Modo Offline', 'Tratamiento guardado en tu celular. Se sincronizará cuando regrese la red. 📡', 'exito');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* HEADER CURVO */}
        <View style={[styles.header, { backgroundColor: color }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft color="white" size={32} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Registro Médico</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.formCard}>
            
            <Text style={styles.label}>TIPO DE REGISTRO</Text>
            <View style={styles.tipoRow}>
              {['Vacuna', 'Tratamiento', 'Vitamina'].map((t) => (
                <TouchableOpacity 
                  key={t}
                  style={[styles.tipoBtn, tipo === t && { backgroundColor: color, borderColor: color }]} 
                  onPress={() => {
                      setTipo(t);
                      setFrecuencia(t === 'Tratamiento' ? 'Cada 24h' : 'Dosis única');
                  }}
                >
                  <Text style={[styles.tipoBtnText, { color: tipo === t ? 'white' : '#666' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* BUSCADOR DE ANIMALES */}
            <Text style={styles.label}>SELECCIONA EL ANIMAL</Text>
            {!animalSeleccionado ? (
              <View>
                <View style={styles.searchContainer}>
                  <Search color="#999" size={20} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar arete..."
                    placeholderTextColor="#999"
                    value={busqueda}
                    onChangeText={setBusqueda}
                  />
                </View>
                {busqueda.length > 0 && (
                  <View style={styles.listaResultados}>
                    {animalesFiltrados.slice(0, 3).map(a => (
                      <TouchableOpacity 
                        key={a.id} 
                        style={styles.resultadoItem}
                        onPress={() => {
                          setAnimalSeleccionado(a);
                          setBusqueda('');
                        }}
                      >
                        <Text style={styles.resultadoText}>{a.arete_siniiga} {a.nombre ? `(${a.nombre})` : ''}</Text>
                        <Check color={color} size={20} />
                      </TouchableOpacity>
                    ))}
                    {animalesFiltrados.length === 0 && (
                      <Text style={{padding: 10, color: '#999', textAlign: 'center'}}>No se encontraron animales</Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.animalSeleccionadoCard, { borderColor: color }]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={[styles.iconBadge, {backgroundColor: color + '15'}]}><ShieldAlert color={color} size={24} /></View>
                  <View style={{marginLeft: 12}}>
                    <Text style={styles.animalSelText}>{animalSeleccionado.arete_siniiga}</Text>
                    {animalSeleccionado.nombre && <Text style={styles.animalSelSub}>{animalSeleccionado.nombre}</Text>}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setAnimalSeleccionado(null)} style={styles.cancelBtn}>
                  <X color="#EF4444" size={20} />
                </TouchableOpacity>
              </View>
            )}

            {/* RESTO DEL FORMULARIO */}
            <Text style={styles.label}>ENFERMEDAD / MOTIVO</Text>
            <TextInput 
              style={styles.input} 
              value={enfermedad} 
              onChangeText={setEnfermedad} 
              placeholder="Ej: Neumonía, Prevención..." 
              placeholderTextColor="#BBB"
            />

            <Text style={styles.label}>MEDICAMENTO / PRODUCTO</Text>
            <View style={styles.inputWithIcon}>
              <Syringe color="#999" size={22} style={{marginRight: 10}}/>
              <TextInput 
                style={styles.inputInner} 
                value={producto} 
                onChangeText={setProducto} 
                placeholder="Nombre del fármaco" 
                placeholderTextColor="#BBB"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>DOSIS</Text>
                <TextInput 
                  style={styles.input} 
                  value={dosis} 
                  onChangeText={setDosis} 
                  placeholder="Ej: 5 ml" 
                  placeholderTextColor="#BBB"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>VÍA (RÁPIDA)</Text>
                <View style={styles.viaRow}>
                  {['IM', 'SC'].map((v) => (
                    <TouchableOpacity 
                      key={v}
                      style={[styles.viaBtn, via === v && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setVia(v)}
                    >
                      <Text style={{fontWeight: 'bold', color: via === v ? 'white' : '#666'}}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* CAJA CONDICIONAL SI ES TRATAMIENTO */}
            {tipo === 'Tratamiento' && (
              <View style={styles.tratamientoBox}>
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                      <View style={{ flex: 1 }}>
                          <Text style={styles.label}>FRECUENCIA</Text>
                          <TextInput 
                            style={styles.input} 
                            value={frecuencia} 
                            onChangeText={setFrecuencia} 
                            placeholder="Cada 12h" 
                            placeholderTextColor="#BBB"
                          />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={styles.label}>DÍAS</Text>
                          <TextInput 
                            style={styles.input} 
                            value={duracion} 
                            onChangeText={setDuracion} 
                            placeholder="Ej: 3" 
                            keyboardType="numeric" 
                            placeholderTextColor="#BBB"
                          />
                      </View>
                  </View>
                  <Text style={styles.label}>PRIMER DOSIS A LAS:</Text>
                  <View style={styles.inputWithIcon}>
                      <Clock color="#999" size={22} style={{marginRight: 10}}/>
                      <TextInput 
                        style={styles.inputInner} 
                        value={horaInicio} 
                        onChangeText={setHoraInicio} 
                        placeholder="HH:MM" 
                        placeholderTextColor="#BBB"
                      />
                  </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: color }]} 
              onPress={guardarRegistro} 
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <>
                  <Stethoscope color="white" size={28} />
                  <Text style={styles.saveBtnText}>Guardar Historial</Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
      <ModalAlerta
        visible={alerta.visible}
        titulo={alerta.titulo}
        mensaje={alerta.mensaje}
        tipo={alerta.tipo}
        colorTema={color}
        onClose={() => {
          const wasExito = alerta.tipo === 'exito';
          setAlerta({ ...alerta, visible: false });
          if (wasExito) router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { height: 180, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 60, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 15 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900' },

  content: { paddingHorizontal: 20 },
  formCard: { backgroundColor: 'white', borderRadius: 30, padding: 25, marginTop: -50, marginBottom: 40, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, borderWidth: 1, borderColor: '#F0F0F0' },

  label: { fontSize: 12, fontWeight: '900', color: '#888', marginBottom: 8, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  tipoRow: { flexDirection: 'row', gap: 10 },
  tipoBtn: { flex: 1, paddingVertical: 15, borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#F9FAFB' },
  tipoBtnText: { fontWeight: '900', fontSize: 13 },

  // Buscador
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 15 },
  searchInput: { flex: 1, paddingVertical: 15, fontSize: 18, color: '#000', fontWeight: '800', marginLeft: 10 },
  listaResultados: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 15, marginTop: 5, padding: 5, elevation: 3 },
  resultadoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultadoText: { fontSize: 16, fontWeight: '800', color: '#000' },
  
  // Animal Seleccionado
  animalSeleccionadoCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 2, backgroundColor: '#FAFAFA' },
  iconBadge: { padding: 10, borderRadius: 12 },
  animalSelText: { fontSize: 20, fontWeight: '900', color: '#000' },
  animalSelSub: { fontSize: 13, color: '#666', fontWeight: '600' },
  cancelBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10 },

  // Inputs
  input: { backgroundColor: '#F9FAFB', padding: 18, borderRadius: 15, fontSize: 18, color: '#000', fontWeight: '800', borderWidth: 1, borderColor: '#E5E7EB' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 15 },
  inputInner: { flex: 1, paddingVertical: 18, fontSize: 18, color: '#000', fontWeight: '800' },
  
  // Botones de Vía Rápida
  viaRow: { flexDirection: 'row', gap: 8 },
  viaBtn: { flex: 1, paddingVertical: 18, borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#F9FAFB' },

  tratamientoBox: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 20, marginTop: 15, borderWidth: 1, borderColor: '#E2E8F0' },

  saveBtn: { flexDirection: 'row', padding: 22, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 35, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  saveBtnText: { color: 'white', fontWeight: '900', fontSize: 20 }
});