import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { ChevronLeft, Syringe, Calendar, Stethoscope, MoreVertical, CheckCircle2, Trash2, Clock } from 'lucide-react-native';
import { useNetwork } from '../../src/context/NetworkContext';
import { obtenerCacheLocal, guardarCacheLocal } from '../../src/services/offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DosisMedica } from '../../src/types';

interface AnimalInfo {
  arete_siniiga: string;
  nombre?: string;
}

interface ModalOpciones {
  visible: boolean;
  dosis: DosisMedica | null;
}

export default function DetalleSaludAnimal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { color } = useTheme();
  const { isConnected } = useNetwork();

  const [registros, setRegistros] = useState<DosisMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [animalInfo, setAnimalInfo] = useState<AnimalInfo | null>(null);
  const [modalOpciones, setModalOpciones] = useState<ModalOpciones>({ visible: false, dosis: null });
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Pendiente' | 'Completado'>('Todos');

  useFocusEffect(
    useCallback(() => {
      if (id) fetchTratamientosAnimal();
    }, [id, isConnected])
  );

  async function fetchTratamientosAnimal() {
    try {
      setLoading(true);

      if (isConnected) {
        const { data: animalData } = await supabase
          .from('animales')
          .select('arete_siniiga, nombre')
          .eq('id', id)
          .single();
        if (animalData) setAnimalInfo(animalData);

        const { data: dosis } = await supabase
          .from('dosis_medicas')
          .select(`*, planes_medicos!inner( animal_id, nombre_plan, tipo )`)
          .eq('planes_medicos.animal_id', id)
          .order('fecha_programada', { ascending: false });

        setRegistros(dosis || []);
        await guardarCacheLocal<DosisMedica[]>(`historial_salud_${id}`, dosis || []);
      } else {
        const cacheAnimales = await obtenerCacheLocal<any[]>('animales_cache', true) ?? [];
        const animalEncontrado = cacheAnimales.find((a) => String(a.id) === String(id));
        if (animalEncontrado) {
          setAnimalInfo({ arete_siniiga: animalEncontrado.arete_siniiga, nombre: animalEncontrado.nombre });
        }

        const cacheHistorial = await obtenerCacheLocal<DosisMedica[]>(`historial_salud_${id}`, true) ?? [];
        if (cacheHistorial.length > 0) {
          setRegistros(cacheHistorial);
        } else {
          const cacheTareas = await obtenerCacheLocal<DosisMedica[]>('tareas_cache', true) ?? [];
          setRegistros(cacheTareas.filter((t) => String(t.planes_medicos?.animal_id) === String(id)));
        }
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  // ─── Cambiar estado (Pendiente ↔ Completado) ────────────────────────────────

  async function cambiarEstado(dosis_id: string, nuevoEstado: string) {
    try {
      if (!isConnected) {
        const cache = await obtenerCacheLocal<DosisMedica[]>(`historial_salud_${id}`, true) ?? [];
        const actualizado = cache.map((d) =>
          String(d.id) === String(dosis_id) ? { ...d, estado: nuevoEstado as DosisMedica['estado'] } : d
        );
        await guardarCacheLocal(`historial_salud_${id}`, actualizado);
        setRegistros(actualizado);

        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'dosis_medicas', datos: { id: dosis_id, estado: nuevoEstado }, operacion: 'UPDATE' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      } else {
        await supabase.from('dosis_medicas').update({ estado: nuevoEstado }).eq('id', dosis_id);
        fetchTratamientosAnimal();
      }
    } catch (e) {
      console.log('Error cambiando estado:', e);
    } finally {
      setModalOpciones({ visible: false, dosis: null });
    }
  }

  // ─── Eliminar dosis ──────────────────────────────────────────────────────────

  async function eliminarDosis(dosis_id: string) {
    try {
      if (!isConnected) {
        const cache = await obtenerCacheLocal<DosisMedica[]>(`historial_salud_${id}`, true) ?? [];
        const filtrado = cache.filter((d) => String(d.id) !== String(dosis_id));
        await guardarCacheLocal(`historial_salud_${id}`, filtrado);
        setRegistros(filtrado);

        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'dosis_medicas', datos: { id: dosis_id }, operacion: 'DELETE' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      } else {
        await supabase.from('dosis_medicas').delete().eq('id', dosis_id);
        fetchTratamientosAnimal();
      }
    } catch (e) {
      console.log('Error eliminando dosis:', e);
    } finally {
      setModalOpciones({ visible: false, dosis: null });
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Tratamientos</Text>
          <Text style={styles.headerSub}>
            {animalInfo?.nombre
              ? `${animalInfo.arete_siniiga} - ${animalInfo.nombre}`
              : `Arete: ${animalInfo?.arete_siniiga}`}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Filtros de estado */}
        <View style={styles.filtrosRow}>
          {(['Todos', 'Pendiente', 'Completado'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filtroBtn, filtroEstado === f && { backgroundColor: color }]}
              onPress={() => setFiltroEstado(f)}
            >
              <Text style={[styles.filtroText, filtroEstado === f && { color: 'white' }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList<DosisMedica>
          data={filtroEstado === 'Todos' ? registros : registros.filter(r => r.estado === filtroEstado)}
          keyExtractor={(item) => item?.id?.toString() ?? Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay tratamientos registrados para este animal.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={[styles.iconBadge, {
                backgroundColor: item.tipo_producto === 'Medicamento' ? '#FEE2E2' : color + '15',
              }]}>
                {item.tipo_producto === 'Medicamento'
                  ? <Stethoscope color="#EF4444" size={24} />
                  : <Syringe color={color} size={24} />
                }
              </View>

              <View style={styles.historyInfo}>
                <Text style={styles.histProduct}>{item.producto}</Text>
                <Text style={styles.histPlan}>Plan: {item.planes_medicos?.nombre_plan}</Text>
                <View style={styles.dateRow}>
                  <Calendar size={12} color="#9CA3AF" />
                  <Text style={styles.histDate}>
                    {item.fecha_programada} {item.hora_programada ?? ''}
                  </Text>
                </View>
              </View>

              <View style={styles.rightSection}>
                <View style={[styles.statusTag, {
                  backgroundColor: item.estado === 'Completado' ? '#D1FAE5' : '#FEE2E2',
                }]}>
                  <Text style={[styles.statusTagText, {
                    color: item.estado === 'Completado' ? '#059669' : '#EF4444',
                  }]}>
                    {item.estado}
                  </Text>
                </View>

                {/* Botón de opciones */}
                <TouchableOpacity
                  style={styles.dotsBtn}
                  onPress={() => setModalOpciones({ visible: true, dosis: item })}
                >
                  <MoreVertical color="#9CA3AF" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* ─── Modal de opciones ─────────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={modalOpciones.visible}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            onPress={() => setModalOpciones({ visible: false, dosis: null })}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>{modalOpciones.dosis?.producto}</Text>
            <Text style={styles.sheetSubtitle}>
              {modalOpciones.dosis?.planes_medicos?.nombre_plan} • {modalOpciones.dosis?.fecha_programada}
            </Text>

            {/* Marcar como Completado */}
            {modalOpciones.dosis?.estado !== 'Completado' && (
              <TouchableOpacity
                style={[styles.accionBtn, { borderColor: '#10B981' }]}
                onPress={() => cambiarEstado(modalOpciones.dosis!.id, 'Completado')}
              >
                <CheckCircle2 color="#10B981" size={20} />
                <Text style={[styles.accionBtnText, { color: '#10B981' }]}>
                  Marcar como Completado
                </Text>
              </TouchableOpacity>
            )}

            {/* Marcar como Pendiente */}
            {modalOpciones.dosis?.estado === 'Completado' && (
              <TouchableOpacity
                style={[styles.accionBtn, { borderColor: '#F59E0B' }]}
                onPress={() => cambiarEstado(modalOpciones.dosis!.id, 'Pendiente')}
              >
                <Clock color="#F59E0B" size={20} />
                <Text style={[styles.accionBtnText, { color: '#F59E0B' }]}>
                  Marcar como Pendiente
                </Text>
              </TouchableOpacity>
            )}

            {/* Eliminar */}
            <TouchableOpacity
              style={[styles.accionBtn, { borderColor: '#EF4444', marginTop: 10 }]}
              onPress={() => eliminarDosis(modalOpciones.dosis!.id)}
            >
              <Trash2 color="#EF4444" size={20} />
              <Text style={[styles.accionBtnText, { color: '#EF4444' }]}>
                Eliminar Tratamiento
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalOpciones({ visible: false, dosis: null })}
              style={{ marginTop: 15 }}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filtroBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  filtroText: { fontSize: 13, fontWeight: '800', color: '#6B7280' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 15, fontWeight: '600', marginTop: 40 },

  // Tarjeta
  historyCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#E5E7EB' },
  iconBadge: { padding: 10, borderRadius: 12 },
  historyInfo: { flex: 1, marginLeft: 12 },
  histProduct: { fontSize: 16, fontWeight: '900', color: '#111827' },
  histPlan: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  histDate: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  rightSection: { alignItems: 'flex-end', gap: 6 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusTagText: { fontSize: 10, fontWeight: '900' },
  dotsBtn: { padding: 4 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.7)' },
  modalDismissArea: { flex: 1 },
  bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 34, alignItems: 'center' },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#111827', textAlign: 'left', width: '100%' },
  sheetSubtitle: { fontSize: 13, color: '#6B7280', fontWeight: '600', width: '100%', marginBottom: 20, marginTop: 4 },
  accionBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 2, gap: 10 },
  accionBtnText: { fontSize: 16, fontWeight: '900' },
  cancelText: { color: '#9CA3AF', fontWeight: '700', fontSize: 16 },
});
