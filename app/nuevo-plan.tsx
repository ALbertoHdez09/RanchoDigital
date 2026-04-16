import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../src/services/supabase';
import { useTheme } from '../src/context/ThemeContext';
import { ChevronLeft, Plus, Trash2, Calendar, Clock, Camera } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNetwork } from '../src/context/NetworkContext';
import { agregarAlBuzon } from '../src/services/syncService';
import { obtenerCacheLocal } from '../src/services/offlineService';
import ModalAlerta from '../src/components/ModalAlerta';

export default function NuevoPlanMedico() {
  const { color } = useTheme();
  const router = useRouter();
  const { areteEscaneado } = useLocalSearchParams();
  
  // 🛡️ 2. INVOCAMOS AL VIGILANTE
  const { isConnected } = useNetwork();
  
  const [loading, setLoading] = useState(false);
  const [nombrePlan, setNombrePlan] = useState('');
  const [arete, setArete] = useState((areteEscaneado as string) || '');
  const [tipoPlan] = useState('Preventivo');
  const [alerta, setAlerta] = useState<{ visible: boolean; tipo: 'exito' | 'error' | 'info'; titulo: string; mensaje: string }>({ visible: false, tipo: 'info', titulo: '', mensaje: '' });

  const mostrar = (titulo: string, mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info') =>
    setAlerta({ visible: true, titulo, mensaje, tipo });

  const [dosis, setDosis] = useState([
    { id: Date.now(), producto: '', tipo: 'Vacuna', fecha: new Date(), hora: new Date(), showFecha: false, showHora: false }
  ]);

  useEffect(() => {
    if (areteEscaneado) setArete(areteEscaneado as string);
  }, [areteEscaneado]);

  const agregarDosis = () => {
    setDosis([...dosis, { 
      id: Date.now(), 
      producto: '', 
      tipo: 'Vitamina', 
      fecha: new Date(), 
      hora: new Date(), 
      showFecha: false, 
      showHora: false 
    }]);
  };

  const eliminarDosis = (id: number) => {
    if (dosis.length > 1) {
      setDosis(dosis.filter(d => d.id !== id));
    }
  };

  const actualizarDosis = (id: number, campo: string, valor: any) => {
    setDosis(dosis.map(d => d.id === id ? { ...d, [campo]: valor } : d));
  };

  async function guardarTodo() {
    if (!arete || !nombrePlan || dosis.some(d => !d.producto)) {
      mostrar('Faltan datos', 'Asegúrate de poner el arete, nombre del plan y nombre de todos los productos.', 'error');
      return;
    }

    // 🛡️ VALIDACIÓN DE FECHAS EN EL PASADO
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Ignorar horas para la limitación

    const fechaPasada = dosis.some(d => {
      const fechaDosis = new Date(d.fecha);
      fechaDosis.setHours(0, 0, 0, 0);
      return fechaDosis < hoy;
    });

    if (fechaPasada) {
      mostrar('Fecha inválida', 'No puedes agendar rutinas médicas en fechas del pasado.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 🛡️ 3. USAMOS getSession PARA NO DEPENDER DEL INTERNET
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) throw new Error("No se encontró sesión de usuario");

      if (isConnected) {
        // 🟢 PLAN A: HAY INTERNET
        // 1. Buscar animal en Supabase
        const { data: animal } = await supabase
          .from('animales')
          .select('id')
          .eq('arete_siniiga', arete)
          .single();

        if (!animal) throw new Error('No se encontró ningún animal con ese arete.');

        // 2. Insertar el Plan Médico
        const { data: plan, error: errorPlan } = await supabase
          .from('planes_medicos')
          .insert([{
            animal_id: animal.id,
            user_id: userId,
            nombre_plan: nombrePlan,
            tipo: tipoPlan
          }])
          .select()
          .single();

        if (errorPlan) throw errorPlan;

        // 3. Insertar las Dosis
        const dosisAInsertar = dosis.map(d => ({
          plan_id: plan.id,
          producto: d.producto,
          tipo_producto: d.tipo,
          fecha_programada: d.fecha.toISOString().split('T')[0],
          hora_programada: d.hora.toTimeString().split(' ')[0],
          estado: 'Pendiente'
        }));

        const { error: errorDosis } = await supabase.from('dosis_medicas').insert(dosisAInsertar);
        if (errorDosis) throw errorDosis;

      } else {
        // 🔴 PLAN B: NO HAY INTERNET (MODO OFFLINE)
        console.log("Guardando plan en buzón de salida...");
        
        // 1. Buscamos el animal en la libreta local
        const cacheAnimales = await obtenerCacheLocal<any[]>('animales_cache') || [];
        const animalEnCache = cacheAnimales.find((a: any) => String(a.arete_siniiga) === String(arete));

        if (!animalEnCache) {
          mostrar('Modo Offline', 'No encontramos este animal en la memoria local. Conéctate a internet para poder registrarle este plan.', 'info');
          setLoading(false);
          return;
        }

        // 2. Empacamos el plan y las dosis juntas
        const paqueteOffline = {
          animal_id: animalEnCache.id,
          user_id: userId,
          nombre_plan: nombrePlan,
          tipo: tipoPlan,
          dosis_relacionadas: dosis.map(d => ({
            producto: d.producto,
            tipo_producto: d.tipo,
            fecha_programada: d.fecha.toISOString().split('T')[0],
            hora_programada: d.hora.toTimeString().split(' ')[0],
            estado: 'Pendiente'
          }))
        };

        // 3. Lo metemos al buzón con una etiqueta especial
        await agregarAlBuzon('planes_medicos_compuesto', 'INSERT', paqueteOffline);
      }

      mostrar(
        isConnected ? '¡Éxito!' : 'Guardado Local',
        isConnected
          ? 'Plan médico programado correctamente en la nube.'
          : 'Sin internet. El plan se guardó en el celular y se programará cuando haya señal.',
        'exito'
      );
      // Cerramos al confirmar el modal
    } catch (_e: any) {
      console.log('Error al guardar plan:', _e);
      mostrar('Error', _e.message || 'No se pudo guardar el plan.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()}><ChevronLeft color="white" size={30} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Plan Médico</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.label}>IDENTIFICACIÓN DEL ANIMAL</Text>
          <View style={styles.rowArete}>
            <TextInput 
              style={[styles.input, { flex: 1 }]} 
              placeholder="Número de Arete"
              value={arete}
              onChangeText={setArete}
            />
            <TouchableOpacity 
              style={[styles.cameraBtn, { backgroundColor: color }]}
              onPress={() => router.push({ pathname: '/escaner', params: { origin: 'salud' }})}
            >
              <Camera color="white" size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>NOMBRE DEL TRATAMIENTO / PLAN</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej: Protocolo de Recepción"
            value={nombrePlan}
            onChangeText={setNombrePlan}
          />
        </View>

        <Text style={styles.sectionTitle}>Dosis y Aplicaciones</Text>

        {dosis.map((item, index) => (
          <View key={item.id} style={styles.dosisCard}>
            <View style={styles.dosisHeader}>
              <Text style={[styles.dosisNumber, { color: color }]}>Dosis #{index + 1}</Text>
              <TouchableOpacity onPress={() => eliminarDosis(item.id)}>
                <Trash2 color="#EF4444" size={20} />
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.inputSmall} 
              placeholder="Producto (Ej: Vitamina ADE)"
              value={item.producto}
              onChangeText={(v) => actualizarDosis(item.id, 'producto', v)}
            />

            <View style={styles.row}>
              <TouchableOpacity 
                style={styles.datePickerBtn} 
                onPress={() => actualizarDosis(item.id, 'showFecha', true)}
              >
                <Calendar color={color} size={20} />
                <Text style={styles.dateText}>{item.fecha.toLocaleDateString()}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.datePickerBtn} 
                onPress={() => actualizarDosis(item.id, 'showHora', true)}
              >
                <Clock color={color} size={20} />
                <Text style={styles.dateText}>
                  {item.hora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {item.showFecha && (
              <DateTimePicker
                value={item.fecha}
                mode="date"
                onChange={(_e: any, date: any) => {
                  actualizarDosis(item.id, 'showFecha', false);
                  if (date) actualizarDosis(item.id, 'fecha', date);
                }}
              />
            )}
            {item.showHora && (
              <DateTimePicker
                value={item.hora}
                mode="time"
                onChange={(_e: any, date: any) => {
                  actualizarDosis(item.id, 'showHora', false);
                  if (date) actualizarDosis(item.id, 'hora', date);
                }}
              />
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={agregarDosis}>
          <Plus color={color} size={24} />
          <Text style={[styles.addBtnText, { color: color }]}>Agregar otra dosis</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: color }]} 
          onPress={guardarTodo}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Programar Plan Completo</Text>}
        </TouchableOpacity>
        
        <View style={{ height: 50 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    height: 120,
    paddingTop: 60, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
  content: { flex: 1, padding: 20 },
  sectionCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, elevation: 2, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, fontSize: 16, fontWeight: '600', marginBottom: 15 },
  rowArete: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  cameraBtn: { width: 55, height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 15 },
  dosisCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#E5E7EB', marginBottom: 15, elevation: 1 },
  dosisHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  dosisNumber: { fontWeight: '900' },
  inputSmall: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  datePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  dateText: { fontWeight: '700', color: '#374151' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderStyle: 'dashed', borderWidth: 2, borderRadius: 15, borderColor: '#D1D5DB', marginTop: 10 },
  addBtnText: { marginLeft: 10, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', marginTop: 30, padding: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: '900' }
});