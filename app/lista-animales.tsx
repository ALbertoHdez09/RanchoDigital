import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../src/services/supabase';
import { useTheme } from '../src/context/ThemeContext';
import { useNetwork } from '../src/context/NetworkContext';
import { obtenerCacheLocal } from '../src/services/offlineService';
import { ChevronLeft, Search, Tag, Scale, ChevronDown, X } from 'lucide-react-native';
import type { Animal, EstadoAnimal, FinProductivo } from '../src/types';

const PAGE_SIZE = 20;

const ESTADOS: (EstadoAnimal | 'Todos')[] = [
  'Todos', 'Becerro / Becerra', 'Vaquilla', 'Vientre / Producción',
  'Vaca Seca', 'Torete / Novillo', 'Semental', 'En engorda', 'Cargada', 'Enferma', 'Vacía',
];
const FINES: (FinProductivo | 'Todos')[] = [
  'Todos', 'Pie de Cría', 'Engorda', 'Doble Propósito', 'Lechero Especializado',
];

export default function ListaAnimalesScreen() {
  const { color } = useTheme();
  const router    = useRouter();
  const { isConnected } = useNetwork();
  const { filtro } = useLocalSearchParams<{ filtro: 'todos' | 'machos' | 'hembras' }>();

  const titulo = filtro === 'machos' ? 'Machos' : filtro === 'hembras' ? 'Hembras' : 'Todos los Animales';

  const [animales, setAnimales]     = useState<Animal[]>([]);
  const [busqueda, setBusqueda]     = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagina, setPagina]         = useState(0);
  const [hayMas, setHayMas]         = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [filtroFin, setFiltroFin]       = useState<string>('Todos');
  const [selectorEstado, setSelectorEstado] = useState(false);
  const [selectorFin, setSelectorFin]       = useState(false);

  const ESTADOS_FILTRO = ['Todos', 'Becerro / Becerra', 'Vaquilla', 'Vientre / Producción', 'Vaca Seca', 'Torete / Novillo', 'Semental'];

  useFocusEffect(useCallback(() => { fetchAnimales(true); }, [isConnected, filtro]));

  async function fetchAnimales(reset = false) {
    const paginaActual = reset ? 0 : pagina;
    reset ? setLoading(true) : setCargandoMas(true);
    if (reset) { setPagina(0); setHayMas(true); }

    try {
      if (isConnected) {
        const { data: { session } } = await supabase.auth.getSession();
        let query = supabase
          .from('animales')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('created_at', { ascending: false })
          .range(paginaActual * PAGE_SIZE, paginaActual * PAGE_SIZE + PAGE_SIZE - 1);

        if (filtro === 'machos')  query = query.eq('genero', 'Macho');
        if (filtro === 'hembras') query = query.eq('genero', 'Hembra');

        const { data, error } = await query;
        if (error) throw error;
        const nuevos = data ?? [];
        setAnimales(prev => reset ? nuevos : [...prev, ...nuevos]);
        setHayMas(nuevos.length === PAGE_SIZE);
        setPagina(paginaActual + 1);
      } else {
        const cache = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
        const filtrados = filtro === 'machos'
          ? cache.filter(a => a.genero === 'Macho')
          : filtro === 'hembras'
            ? cache.filter(a => a.genero === 'Hembra')
            : cache;
        setAnimales(filtrados);
        setHayMas(false);
      }
    } catch (e) {
      console.log('Error lista animales:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCargandoMas(false);
    }
  }

  const filtrados = animales.filter(a => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = a.arete_siniiga?.toLowerCase().includes(q) || a.raza?.toLowerCase().includes(q) || a.nombre?.toLowerCase().includes(q);
    const coincideEstado = filtroEstado === 'Todos' || a.estado === filtroEstado;
    const coincideFin    = filtroFin === 'Todos' || a.fin_productivo === filtroFin;
    return coincideBusqueda && coincideEstado && coincideFin;
  });

  if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={color} /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{titulo}</Text>
          <Text style={styles.headerSub}>{animales.length} animales</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBar}>
          <Search color="#999" size={20} />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#333' }}
            placeholder="Buscar por arete, nombre o raza..."
            placeholderTextColor="#999"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
          />
        </View>

        {/* Filtros dropdown compactos */}
        <View style={styles.filtrosRow}>
          <TouchableOpacity
            style={[styles.filtroDropdown, filtroEstado !== 'Todos' && { borderColor: color }]}
            onPress={() => setSelectorEstado(true)}
          >
            <Text style={[styles.filtroDropdownText, filtroEstado !== 'Todos' && { color }]} numberOfLines={1}>
              {filtroEstado === 'Todos' ? 'Etapa' : filtroEstado}
            </Text>
            {filtroEstado !== 'Todos'
              ? <TouchableOpacity onPress={() => setFiltroEstado('Todos')}><X color={color} size={14} /></TouchableOpacity>
              : <ChevronDown color="#9CA3AF" size={14} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroDropdown, filtroFin !== 'Todos' && { borderColor: color }]}
            onPress={() => setSelectorFin(true)}
          >
            <Text style={[styles.filtroDropdownText, filtroFin !== 'Todos' && { color }]} numberOfLines={1}>
              {filtroFin === 'Todos' ? 'Propósito' : filtroFin}
            </Text>
            {filtroFin !== 'Todos'
              ? <TouchableOpacity onPress={() => setFiltroFin('Todos')}><X color={color} size={14} /></TouchableOpacity>
              : <ChevronDown color="#9CA3AF" size={14} />
            }
          </TouchableOpacity>
        </View>

        <FlashList<Animal>
          data={filtrados}
          keyExtractor={item => item.id.toString()}
          estimatedItemSize={110}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnimales(true); }} colors={[color]} />}
          onEndReached={() => { if (!cargandoMas && hayMas && !busqueda) fetchAnimales(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={cargandoMas ? <ActivityIndicator color={color} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={<Text style={styles.emptyText}>Sin animales en esta categoría</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/animal/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
                  <Tag color={color} size={20} />
                </View>
                <Text style={styles.areteText}>{item.arete_siniiga}</Text>
                <View style={styles.generoBadge}>
                  <Text style={styles.generoText}>{item.genero}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <View>
                  <Text style={styles.razaLabel}>RAZA</Text>
                  <Text style={styles.razaValue}>{item.raza}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Scale color="#666" size={16} />
                  <Text style={styles.pesoText}>{item.peso_inicial} kg</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Modal selector etapa */}
      <Modal animationType="fade" transparent visible={selectorEstado}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectorEstado(false)} />
          <View style={styles.selectorSheet}>
            <View style={styles.selectorHandle} />
            <Text style={styles.selectorTitulo}>Seleccionar Etapa</Text>
            {ESTADOS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.selectorOpcion, filtroEstado === e && { backgroundColor: color + '15' }]}
                onPress={() => { setFiltroEstado(e); setSelectorEstado(false); }}
              >
                <Text style={[styles.selectorOpcionText, filtroEstado === e && { color, fontWeight: '900' }]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal selector propósito */}
      <Modal animationType="fade" transparent visible={selectorFin}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectorFin(false)} />
          <View style={styles.selectorSheet}>
            <View style={styles.selectorHandle} />
            <Text style={styles.selectorTitulo}>Seleccionar Propósito</Text>
            {FINES.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.selectorOpcion, filtroFin === f && { backgroundColor: color + '15' }]}
                onPress={() => { setFiltroFin(f); setSelectorFin(false); }}
              >
                <Text style={[styles.selectorOpcionText, filtroFin === f && { color, fontWeight: '900' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, gap: 15 },
  backBtn: { padding: 4 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  searchBar: { flexDirection: 'row', backgroundColor: 'white', padding: 14, borderRadius: 18, alignItems: 'center', marginTop: -20, marginBottom: 14, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  filtrosRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  filtroDropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 6 },
  filtroDropdownText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#6B7280' },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBadge: { padding: 8, borderRadius: 10 },
  areteText: { flex: 1, fontSize: 20, fontWeight: '900', color: '#111827' },
  generoBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  generoText: { color: '#666', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  razaLabel: { fontSize: 11, fontWeight: '800', color: '#AAA', letterSpacing: 1 },
  razaValue: { fontSize: 15, fontWeight: '700', color: '#333' },
  pesoText: { fontSize: 18, fontWeight: '900', color: '#111827' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.6)' },
  selectorSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  selectorHandle: { width: 44, height: 5, backgroundColor: '#D1D5DB', borderRadius: 10, alignSelf: 'center', marginBottom: 16 },
  selectorTitulo: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 12 },
  selectorOpcion: { paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  selectorOpcionText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 16, marginTop: 60, fontWeight: '600' },
});
