import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Plus, Search, Package, ChevronDown, AlertTriangle,
  CheckCircle2, X, Save, Trash2,
} from 'lucide-react-native';
import { useNetwork } from '../../src/context/NetworkContext';
import { obtenerCacheLocal, guardarCacheLocal } from '../../src/services/offlineService';
import { agregarAlBuzon } from '../../src/services/syncService';
import ModalAlerta from '../../src/components/ModalAlerta';
import { localDB as AsyncStorage } from '../../src/services/localDB';
import type { Medicamento, TipoMedicamento, UnidadMedicamento } from '../../src/types';

const TIPOS: TipoMedicamento[]    = ['Medicamento', 'Vacuna', 'Vitamina', 'Antiparasitario', 'Mineral'];
const UNIDADES: UnidadMedicamento[] = ['ml', 'mg', 'dosis', 'tabletas', 'kg', 'g'];

const TIPO_COLORES: Record<TipoMedicamento, string> = {
  Medicamento:    '#EF4444',
  Vacuna:         '#3B82F6',
  Vitamina:       '#10B981',
  Antiparasitario:'#F59E0B',
  Mineral:        '#8B5CF6',
};

interface FormMed {
  nombre: string;
  tipo: TipoMedicamento;
  unidad: UnidadMedicamento;
  cantidad_disponible: string;
  cantidad_minima: string;
  descripcion: string;
}

const formInicial: FormMed = {
  nombre: '', tipo: 'Medicamento', unidad: 'ml',
  cantidad_disponible: '', cantidad_minima: '10', descripcion: '',
};

type TipoAlerta = 'exito' | 'error' | 'info';
interface EstadoAlerta { visible: boolean; titulo: string; mensaje: string; tipo: TipoAlerta; }
const alertaInicial: EstadoAlerta = { visible: false, titulo: '', mensaje: '', tipo: 'info' };

export default function InventarioScreen() {
  const { color } = useTheme();
  const router    = useRouter();
  const { isConnected } = useNetwork();

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [busqueda, setBusqueda]         = useState('');
  const [limiteMinimo, setLimiteMinimo] = useState(10);

  // Modal nuevo/editar
  const [modalForm, setModalForm]       = useState(false);
  const [editando, setEditando]         = useState<Medicamento | null>(null);
  const [form, setForm]                 = useState<FormMed>(formInicial);
  const [guardando, setGuardando]       = useState(false);
  const [selectorTipo, setSelectorTipo] = useState(false);
  const [selectorUnidad, setSelectorUnidad] = useState(false);

  const [alerta, setAlerta] = useState<EstadoAlerta>(alertaInicial);
  const mostrar = (titulo: string, mensaje: string, tipo: TipoAlerta = 'info') =>
    setAlerta({ visible: true, titulo, mensaje, tipo });

  useFocusEffect(useCallback(() => { fetchMedicamentos(); }, [isConnected]));

  async function fetchMedicamentos() {
    setLoading(true);
    try {
      // Leer límite mínimo de ajustes
      const lim = await AsyncStorage.getItem('limite_inventario');
      if (lim) setLimiteMinimo(parseInt(lim) || 10);

      if (isConnected) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase
          .from('medicamentos')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('nombre', { ascending: true });
        if (error) throw error;
        setMedicamentos(data ?? []);
        await guardarCacheLocal<Medicamento[]>('medicamentos_cache', data ?? []);
      } else {
        const cache = await obtenerCacheLocal<Medicamento[]>('medicamentos_cache', true) ?? [];
        setMedicamentos(cache);
      }
    } catch (e) {
      console.log('Error medicamentos:', e);
      const cache = await obtenerCacheLocal<Medicamento[]>('medicamentos_cache', true) ?? [];
      setMedicamentos(cache);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ─── Ordenar: sin stock → bajo stock → normal ─────────────────────────────
  const medicamentosFiltrados = medicamentos
    .filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      const nivelA = a.cantidad_disponible <= 0 ? 0 : a.cantidad_disponible <= limiteMinimo ? 1 : 2;
      const nivelB = b.cantidad_disponible <= 0 ? 0 : b.cantidad_disponible <= limiteMinimo ? 1 : 2;
      return nivelA - nivelB;
    });

  // ─── Guardar medicamento ──────────────────────────────────────────────────
  async function guardarMedicamento() {
    if (!form.nombre.trim()) {
      mostrar('Falta el nombre', 'El nombre del medicamento es obligatorio.', 'error');
      return;
    }
    setGuardando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = {
        user_id: session?.user?.id,
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        unidad: form.unidad,
        cantidad_disponible: parseFloat(form.cantidad_disponible) || 0,
        cantidad_minima: parseFloat(form.cantidad_minima) || 10,
        descripcion: form.descripcion.trim() || null,
      };

      if (editando) {
        // UPDATE
        if (isConnected) {
          const { error } = await supabase.from('medicamentos').update(payload).eq('id', editando.id);
          if (error) throw error;
        } else {
          await agregarAlBuzon('medicamentos', 'UPDATE', { ...payload, id: editando.id });
          const cache = await obtenerCacheLocal<Medicamento[]>('medicamentos_cache', true) ?? [];
          await guardarCacheLocal('medicamentos_cache', cache.map(m => m.id === editando.id ? { ...m, ...payload } : m));
        }
        mostrar('¡Actualizado!', 'Medicamento actualizado correctamente.', 'exito');
      } else {
        // INSERT
        if (isConnected) {
          const { error } = await supabase.from('medicamentos').insert([payload]);
          if (error) throw error;
        } else {
          const tempId = `temp_${Date.now()}`;
          await agregarAlBuzon('medicamentos', 'INSERT', payload);
          const cache = await obtenerCacheLocal<Medicamento[]>('medicamentos_cache', true) ?? [];
          await guardarCacheLocal('medicamentos_cache', [{ ...payload, id: tempId } as Medicamento, ...cache]);
        }
        mostrar('¡Guardado!', 'Medicamento agregado al inventario.', 'exito');
      }

      setModalForm(false);
      setForm(formInicial);
      setEditando(null);
      fetchMedicamentos();
    } catch (e: any) {
      mostrar('Error', e.message || 'No se pudo guardar.', 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarMedicamento(med: Medicamento) {
    try {
      if (isConnected) {
        await supabase.from('medicamentos').delete().eq('id', med.id);
      } else {
        await agregarAlBuzon('medicamentos', 'DELETE', { id: med.id });
        const cache = await obtenerCacheLocal<Medicamento[]>('medicamentos_cache', true) ?? [];
        await guardarCacheLocal('medicamentos_cache', cache.filter(m => m.id !== med.id));
      }
      fetchMedicamentos();
    } catch (e) {
      mostrar('Error', 'No se pudo eliminar.', 'error');
    }
  }

  function abrirEditar(med: Medicamento) {
    setEditando(med);
    setForm({
      nombre: med.nombre,
      tipo: med.tipo,
      unidad: med.unidad,
      cantidad_disponible: String(med.cantidad_disponible),
      cantidad_minima: String(med.cantidad_minima),
      descripcion: med.descripcion ?? '',
    });
    setModalForm(true);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(formInicial);
    setModalForm(true);
  }

  // ─── Render tarjeta ───────────────────────────────────────────────────────
  const renderMedicamento = ({ item }: { item: Medicamento }) => {
    const sinStock  = item.cantidad_disponible <= 0;
    const bajoStock = !sinStock && item.cantidad_disponible <= limiteMinimo;
    const badgeColor = sinStock ? '#EF4444' : bajoStock ? '#F59E0B' : '#10B981';
    const badgeBg    = sinStock ? '#FEE2E2' : bajoStock ? '#FEF3C7' : '#D1FAE5';
    const badgeText  = sinStock ? 'Sin stock' : bajoStock ? 'Stock bajo' : 'Disponible';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirEditar(item)}
        activeOpacity={0.7}
      >
        {/* Barra de color por tipo */}
        <View style={[styles.tipoBarra, { backgroundColor: TIPO_COLORES[item.tipo] }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombreText}>{item.nombre}</Text>
              <Text style={styles.tipoText}>{item.tipo}</Text>
            </View>
            <View style={[styles.stockBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.stockBadgeText, { color: badgeColor }]}>{badgeText}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.cantidadBox}>
              {sinStock
                ? <AlertTriangle color="#EF4444" size={18} />
                : bajoStock
                  ? <AlertTriangle color="#F59E0B" size={18} />
                  : <CheckCircle2 color="#10B981" size={18} />
              }
              <Text style={[styles.cantidadText, { color: badgeColor }]}>
                {item.cantidad_disponible} {item.unidad}
              </Text>
            </View>
            <Text style={styles.minimoText}>Mín: {item.cantidad_minima} {item.unidad}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={color} size="large" /></View>;
  }

  const sinStock  = medicamentos.filter(m => m.cantidad_disponible <= 0).length;
  const bajoStock = medicamentos.filter(m => m.cantidad_disponible > 0 && m.cantidad_disponible <= limiteMinimo).length;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>Inventario</Text>
        <Text style={styles.headerSub}>Medicamentos y suministros</Text>
        {/* Resumen rápido */}
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{medicamentos.length}</Text>
            <Text style={styles.headerStatLabel}>Total</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: '#FEF3C7' }]}>{bajoStock}</Text>
            <Text style={styles.headerStatLabel}>Bajo stock</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: '#FEE2E2' }]}>{sinStock}</Text>
            <Text style={styles.headerStatLabel}>Sin stock</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Barra de búsqueda */}
        <View style={styles.searchBar}>
          <Search color="#999" size={20} />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#333' }}
            placeholder="Buscar medicamento..."
            placeholderTextColor="#999"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
          />
        </View>

        <FlashList<Medicamento>
          data={medicamentosFiltrados}
          keyExtractor={item => item.id}
          // @ts-ignore
          estimatedItemSize={100}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150, paddingTop: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMedicamentos(); }} colors={[color]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Package color="#DDD" size={80} strokeWidth={1} />
              <Text style={styles.emptyText}>
                {busqueda ? 'Sin resultados' : 'Inventario vacío'}
              </Text>
              <Text style={styles.emptySubText}>
                {busqueda ? 'Intenta con otro nombre.' : 'Agrega tu primer medicamento con el botón +'}
              </Text>
            </View>
          }
          renderItem={renderMedicamento}
        />
      </View>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: color }]} onPress={abrirNuevo}>
        <Plus color="white" size={32} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* ── MODAL FORMULARIO ── */}
      <Modal animationType="slide" transparent visible={modalForm} onRequestClose={() => setModalForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismiss} onPress={() => setModalForm(false)} />
            <View style={[styles.bottomSheet, { maxHeight: '90%' }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.sheetTitle}>
                  {editando ? 'Editar Medicamento' : 'Nuevo Medicamento'}
                </Text>
                {editando && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => { setModalForm(false); eliminarMedicamento(editando); }}
                  >
                    <Trash2 color="#EF4444" size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Nombre */}
                <Text style={styles.fieldLabel}>NOMBRE *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.nombre}
                  onChangeText={t => setForm({ ...form, nombre: t })}
                  placeholder="Ej: Ivermectina 1%"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />

                {/* Tipo */}
                <Text style={styles.fieldLabel}>TIPO</Text>
                <TouchableOpacity style={styles.selectorBtn} onPress={() => setSelectorTipo(true)}>
                  <View style={[styles.tipoDot, { backgroundColor: TIPO_COLORES[form.tipo] }]} />
                  <Text style={styles.selectorText}>{form.tipo}</Text>
                  <ChevronDown color="#9CA3AF" size={18} />
                </TouchableOpacity>

                {/* Cantidad y unidad */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.fieldLabel}>CANTIDAD DISPONIBLE</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={form.cantidad_disponible}
                      onChangeText={t => setForm({ ...form, cantidad_disponible: t })}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>UNIDAD</Text>
                    <TouchableOpacity style={styles.selectorBtn} onPress={() => setSelectorUnidad(true)}>
                      <Text style={styles.selectorText}>{form.unidad}</Text>
                      <ChevronDown color="#9CA3AF" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Cantidad mínima */}
                <Text style={styles.fieldLabel}>CANTIDAD MÍNIMA (alerta)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.cantidad_minima}
                  onChangeText={t => setForm({ ...form, cantidad_minima: t })}
                  placeholder="10"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Descripción */}
                <Text style={styles.fieldLabel}>DESCRIPCIÓN (opcional)</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                  value={form.descripcion}
                  onChangeText={t => setForm({ ...form, descripcion: t })}
                  placeholder="Notas adicionales..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />

                <TouchableOpacity
                  style={[styles.saveModalBtn, { backgroundColor: color, opacity: guardando ? 0.7 : 1 }]}
                  onPress={guardarMedicamento}
                  disabled={guardando}
                >
                  {guardando
                    ? <ActivityIndicator color="white" />
                    : <><Save color="white" size={22} /><Text style={styles.saveModalBtnText}>Guardar</Text></>
                  }
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Selector tipo */}
      <Modal animationType="fade" transparent visible={selectorTipo}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setSelectorTipo(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: 30 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Tipo de producto</Text>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.opcionRow, form.tipo === t && { backgroundColor: TIPO_COLORES[t] + '15' }]}
                onPress={() => { setForm({ ...form, tipo: t }); setSelectorTipo(false); }}
              >
                <View style={[styles.tipoDot, { backgroundColor: TIPO_COLORES[t] }]} />
                <Text style={[styles.opcionText, form.tipo === t && { color: TIPO_COLORES[t], fontWeight: '900' }]}>{t}</Text>
                {form.tipo === t && <CheckCircle2 color={TIPO_COLORES[t]} size={20} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Selector unidad */}
      <Modal animationType="fade" transparent visible={selectorUnidad}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setSelectorUnidad(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: 30 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Unidad de medida</Text>
            {UNIDADES.map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.opcionRow, form.unidad === u && { backgroundColor: color + '15' }]}
                onPress={() => { setForm({ ...form, unidad: u }); setSelectorUnidad(false); }}
              >
                <Text style={[styles.opcionText, form.unidad === u && { color, fontWeight: '900' }]}>{u}</Text>
                {form.unidad === u && <CheckCircle2 color={color} size={20} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ModalAlerta
        visible={alerta.visible}
        titulo={alerta.titulo}
        mensaje={alerta.mensaje}
        tipo={alerta.tipo}
        colorTema={color}
        onClose={() => { setAlerta(alertaInicial); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    paddingTop: 55, paddingBottom: 20, paddingHorizontal: 24,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600', marginBottom: 16 },
  headerStats: { flexDirection: 'row', gap: 20 },
  headerStat: { alignItems: 'center' },
  headerStatNum: { color: 'white', fontSize: 22, fontWeight: '900' },
  headerStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: 20 },
  searchBar: {
    flexDirection: 'row', backgroundColor: 'white', padding: 14,
    borderRadius: 18, alignItems: 'center', marginTop: -20, marginBottom: 14,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
  },

  card: {
    backgroundColor: 'white', borderRadius: 20, marginBottom: 12,
    elevation: 2, borderWidth: 1, borderColor: '#F0F0F0',
    flexDirection: 'row', overflow: 'hidden',
  },
  tipoBarra: { width: 6 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  nombreText: { fontSize: 17, fontWeight: '900', color: '#111827' },
  tipoText: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 2 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stockBadgeText: { fontSize: 11, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cantidadBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cantidadText: { fontSize: 18, fontWeight: '900' },
  minimoText: { fontSize: 12, color: '#9CA3AF', fontWeight: '700' },

  emptyState: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 20, fontWeight: '900', color: '#111827', marginTop: 20 },
  emptySubText: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 },

  fab: {
    position: 'absolute', right: 24, bottom: 95,
    width: 64, height: 64, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.7)' },
  modalDismiss: { flex: 1 },
  bottomSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  deleteBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 12 },

  fieldLabel: { fontSize: 12, fontWeight: '900', color: '#6B7280', marginBottom: 8, marginTop: 16, letterSpacing: 1 },
  fieldInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 14, fontSize: 16, fontWeight: '700', color: '#111827',
  },
  selectorBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, gap: 10,
  },
  selectorText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  tipoDot: { width: 12, height: 12, borderRadius: 6 },

  opcionRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 14, marginBottom: 6, gap: 12,
  },
  opcionText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#374151' },

  saveModalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 18, borderRadius: 18, gap: 10, marginTop: 24,
  },
  saveModalBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
});
