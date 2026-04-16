import { localDB as AsyncStorage } from '../../src/services/localDB';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Plus,
    RefreshCw,
    ScanLine,
    Syringe,
    X
} from 'lucide-react-native';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNetwork } from '../../src/context/NetworkContext';
import { useTheme } from '../../src/context/ThemeContext';
import { guardarCacheLocal, obtenerCacheLocal } from '../../src/services/offlineService';
import { supabase } from '../../src/services/supabase';
import type { Animal, DosisMedica } from '../../src/types';

export default function InicioScreen() {
  const { color } = useTheme();
  const router   = useRouter();
  const { isConnected } = useNetwork();

  const [nombreRancho, setNombreRancho]     = useState('Mi Rancho');
  const [logoUrl, setLogoUrl]               = useState<string | null>(null);
  const [totalAnimales, setTotalAnimales]   = useState(0);
  const [totalMachos, setTotalMachos]       = useState(0);
  const [totalHembras, setTotalHembras]     = useState(0);
  const [tareasPendientes, setTareasPendientes] = useState(0);
  const [todasLasTareas, setTodasLasTareas] = useState<DosisMedica[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [modalAgendaVisible, setModalAgendaVisible] = useState(false);
  const [pendientesSync, setPendientesSync] = useState(0);

  // Contar operaciones pendientes de sync
  useEffect(() => {
    const contarPendientes = async () => {
      const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
      setPendientesSync(queue.length);
    };
    contarPendientes();
    const interval = setInterval(contarPendientes, 5000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => { fetchDatos(); }, []) // UX: sin isConnected para no saltar la UI
  );

  async function fetchDatos() {
    setLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      // Cargar nombre y logo desde caché local primero (instantáneo)
      const nombreCache = await AsyncStorage.getItem(`nombre_rancho_${userId}`);
      const logoCache   = await AsyncStorage.getItem(`logo_url_${userId}`);
      if (nombreCache) setNombreRancho(nombreCache);
      if (logoCache)   setLogoUrl(logoCache);

      if (isConnected) {
        // Nombre del rancho
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre_rancho, logo_url')
          .eq('id', userId)
          .single();
        if (perfil?.nombre_rancho) {
          setNombreRancho(perfil.nombre_rancho);
          await AsyncStorage.setItem(`nombre_rancho_${userId}`, perfil.nombre_rancho);
        }
        if (perfil?.logo_url) {
          setLogoUrl(perfil.logo_url);
          await AsyncStorage.setItem(`logo_url_${userId}`, perfil.logo_url);
        }

        // Conteos por género
        const { data: conteos } = await supabase
          .from('animales')
          .select('genero')
          .eq('user_id', userId);

        const total   = conteos?.length ?? 0;
        const machos  = conteos?.filter(a => a.genero === 'Macho').length ?? 0;
        const hembras = conteos?.filter(a => a.genero === 'Hembra').length ?? 0;
        setTotalAnimales(total);
        setTotalMachos(machos);
        setTotalHembras(hembras);

        // Caché de animales completo (para offline) — sin límite
        const { data: cacheData, error: errAn } = await supabase
          .from('animales')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        // 🛡️ Previene que un timeout (error) guarde un array vacío (null) y borre el caché
        if (errAn) throw errAn; 
        await guardarCacheLocal('animales_cache', cacheData || []);

        // Tareas pendientes — sin límite artificial
        const { data: dataT } = await supabase
          .from('dosis_medicas')
          .select(`*, planes_medicos!inner( animal_id, animales!inner(arete_siniiga) )`)
          .eq('estado', 'Pendiente')
          .order('fecha_programada', { ascending: true });

        if (dataT) {
          const idSet = new Set((conteos ?? []).map((a: any) => a.id ?? ''));
          // Filtramos por animales del usuario
          const { data: misIds } = await supabase
            .from('animales').select('id').eq('user_id', userId);
          const idSetFull = new Set((misIds ?? []).map((a: { id: string }) => a.id));
          const misTareas = dataT.filter(t => idSetFull.has(t.planes_medicos?.animal_id));
          setTodasLasTareas(misTareas);
          setTareasPendientes(misTareas.length);
          await guardarCacheLocal('tareas_cache', misTareas);
        }
      } else {
        const cacheAn = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
        const cacheTa = await obtenerCacheLocal<DosisMedica[]>('tareas_cache', true) ?? [];
        setTotalAnimales(cacheAn.length);
        setTotalMachos(cacheAn.filter(a => a.genero === 'Macho').length);
        setTotalHembras(cacheAn.filter(a => a.genero === 'Hembra').length);
        setTodasLasTareas(cacheTa);
        setTareasPendientes(cacheTa.length);
      }
    } catch (error) {
      console.log('Error en fetch dashboard:', error);
      const cacheAn = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
      const cacheTa = await obtenerCacheLocal<DosisMedica[]>('tareas_cache', true) ?? [];
      setTotalAnimales(cacheAn.length);
      setTotalMachos(cacheAn.filter(a => a.genero === 'Macho').length);
      setTotalHembras(cacheAn.filter(a => a.genero === 'Hembra').length);
      setTodasLasTareas(cacheTa);
      setTareasPendientes(cacheTa.length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const porcHembras = totalAnimales > 0 ? (totalHembras / totalAnimales) * 100 : 0;
  const porcMachos  = totalAnimales > 0 ? (totalMachos  / totalAnimales) * 100 : 0;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDatos(); }} colors={[color]} />}
    >
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: color }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{nombreRancho}</Text>
          <View style={styles.headerRight}>
            {/* Indicador de sync */}
            {pendientesSync > 0 ? (
              <View style={styles.syncBadge}>
                <RefreshCw color="white" size={12} />
                <Text style={styles.syncText}>{pendientesSync}</Text>
              </View>
            ) : isConnected ? (
              <CheckCircle2 color="rgba(255,255,255,0.6)" size={16} />
            ) : (
              <AlertCircle color="rgba(255,255,255,0.6)" size={16} />
            )}
            {logoUrl && (
              <Image source={{ uri: logoUrl }} style={styles.headerLogo} contentFit="cover" cachePolicy="disk" />
            )}
          </View>
        </View>
      </View>

      {/* ── TARJETA RESUMEN GANADO ── */}
      <View style={styles.resumenCard}>
        {/* Total — toca para ver todos */}
        <TouchableOpacity
          style={styles.resumenTotal}
          onPress={() => router.push({ pathname: '/lista-animales', params: { filtro: 'todos' } } as any)}
          activeOpacity={0.7}
        >
          <Text style={[styles.resumenNumero, { color }]}>{totalAnimales}</Text>
          <Text style={styles.resumenLabel}>Total Cabezas</Text>
        </TouchableOpacity>

        <View style={styles.resumenDivider} />

        {/* Barra de distribución */}
        <View style={styles.resumenDistribucion}>
          {/* Barra */}
          <View style={styles.barraContainer}>
            <TouchableOpacity
              style={[styles.barraSeg, { backgroundColor: '#FF6B6B', width: `${porcHembras}%` }]}
              onPress={() => router.push({ pathname: '/lista-animales', params: { filtro: 'hembras' } } as any)}
              activeOpacity={0.8}
            />
            <TouchableOpacity
              style={[styles.barraSeg, { backgroundColor: '#4ECDC4', width: `${porcMachos}%` }]}
              onPress={() => router.push({ pathname: '/lista-animales', params: { filtro: 'machos' } } as any)}
              activeOpacity={0.8}
            />
          </View>

          {/* Leyenda interactiva */}
          <View style={styles.leyendaRow}>
            <TouchableOpacity
              style={styles.leyendaItem}
              onPress={() => router.push({ pathname: '/lista-animales', params: { filtro: 'hembras' } } as any)}
            >
              <View style={[styles.leyendaDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.leyendaTexto}>Hembras</Text>
              <Text style={[styles.leyendaNum, { color: '#FF6B6B' }]}>{totalHembras}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leyendaItem}
              onPress={() => router.push({ pathname: '/lista-animales', params: { filtro: 'machos' } } as any)}
            >
              <View style={[styles.leyendaDot, { backgroundColor: '#4ECDC4' }]} />
              <Text style={styles.leyendaTexto}>Machos</Text>
              <Text style={[styles.leyendaNum, { color: '#4ECDC4' }]}>{totalMachos}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── ACCIONES RÁPIDAS ── */}
      <Text style={styles.seccionTitulo}>Acciones Rápidas</Text>
      <View style={styles.accionesRow}>
        <TouchableOpacity
          style={styles.accionBtn}
          onPress={() => router.push('/escaner')}
          activeOpacity={0.7}
        >
          <View style={[styles.accionIconBg, { backgroundColor: '#E0E7FF' }]}>
            <ScanLine color="#4F46E5" size={32} />
          </View>
          <Text style={styles.accionTexto}>Escanear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accionBtn}
          onPress={() => router.push('/nuevo-animal')}
          activeOpacity={0.7}
        >
          <View style={[styles.accionIconBg, { backgroundColor: color + '15' }]}>
            <Plus color={color} size={32} />
          </View>
          <Text style={styles.accionTexto}>Agregar Nuevo Animal</Text>
        </TouchableOpacity>
      </View>

      {/* ── PRÓXIMAS TAREAS ── */}
      <View style={styles.tareasHeader}>
        <Text style={styles.seccionTitulo}>Próximas Tareas</Text>
        <TouchableOpacity
          style={styles.verTodasBtn}
          onPress={() => setModalAgendaVisible(true)}
        >
          <Text style={[styles.verTodasTexto, { color }]}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      {/* Cuadrado con número de tareas */}
      <TouchableOpacity
        style={[styles.tareasCard, { borderColor: tareasPendientes > 0 ? color : '#E5E7EB' }]}
        onPress={() => setModalAgendaVisible(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.tareasIconBg, { backgroundColor: tareasPendientes > 0 ? color + '15' : '#F3F4F6' }]}>
          <Syringe color={tareasPendientes > 0 ? color : '#9CA3AF'} size={32} />
        </View>
        <View style={styles.tareasInfo}>
          <Text style={[styles.tareasNumero, { color: tareasPendientes > 0 ? color : '#9CA3AF' }]}>
            {tareasPendientes}
          </Text>
          <Text style={styles.tareasLabel}>
            {tareasPendientes === 0
              ? 'Sin tareas pendientes 🤠'
              : tareasPendientes === 1
                ? 'tratamiento pendiente'
                : 'tratamientos pendientes'}
          </Text>
        </View>
        <ChevronRight color="#D1D5DB" size={24} />
      </TouchableOpacity>

      <View style={{ height: 100 }} />

      {/* ── MODAL AGENDA ── */}
      <Modal
        visible={modalAgendaVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalAgendaVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.accionIconBg, { backgroundColor: color + '20', width: 44, height: 44 }]}>
                <CalendarDays color={color} size={24} />
              </View>
              <Text style={styles.modalTitulo}>Agenda Médica</Text>
            </View>
            <TouchableOpacity onPress={() => setModalAgendaVisible(false)} style={styles.closeBtn}>
              <X color="#4B5563" size={28} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={todasLasTareas}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.agendaRow}>
                <View style={styles.agendaFechaBox}>
                  <Text style={styles.agendaDia}>{item.fecha_programada?.split('-')[2]}</Text>
                  <Text style={styles.agendaMes}>{item.fecha_programada?.split('-')[1]}</Text>
                </View>
                <TouchableOpacity
                  style={styles.agendaCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setModalAgendaVisible(false);
                    router.push(`/detalle-salud/${item.planes_medicos?.animal_id}` as any);
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.agendaProducto} numberOfLines={1}>{item.producto}</Text>
                    <View style={styles.pendienteBadge}>
                      <Text style={styles.pendienteTexto}>Pendiente</Text>
                    </View>
                  </View>
                  <Text style={styles.agendaArete}>
                    Arete: <Text style={{ fontWeight: '800', color: '#111827' }}>
                      {item.planes_medicos?.animales?.arete_siniiga}
                    </Text>
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Syringe size={13} color="#9CA3AF" />
                    <Text style={styles.agendaTipo}>{item.tipo_producto || 'Dosis Médica'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 8 }}>
                  Agenda Libre
                </Text>
                <Text style={{ color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 }}>
                  No tienes tratamientos ni vacunas programadas.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header
  header: {
    paddingTop: 65, paddingBottom: 50,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: 'white', fontSize: 30, fontWeight: '900', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  syncText: { color: 'white', fontSize: 11, fontWeight: '900' },
  headerLogo: { width: 80, height: 80, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },

  // Tarjeta resumen
  resumenCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 24,
    padding: 20,
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  resumenTotal: { alignItems: 'center', paddingBottom: 16 },
  resumenNumero: { fontSize: 48, fontWeight: '900' },
  resumenLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginTop: 2 },
  resumenDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 },
  resumenDistribucion: { gap: 12 },
  barraContainer: {
    width: '100%', height: 20, borderRadius: 10,
    flexDirection: 'row', overflow: 'hidden', backgroundColor: '#F3F4F6',
  },
  barraSeg: { height: '100%' },
  leyendaRow: { flexDirection: 'row', justifyContent: 'space-around' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  leyendaDot: { width: 12, height: 12, borderRadius: 6 },
  leyendaTexto: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  leyendaNum: { fontSize: 16, fontWeight: '900' },

  // Sección
  seccionTitulo: { fontSize: 20, fontWeight: '900', color: '#111827', marginHorizontal: 20, marginTop: 28, marginBottom: 14 },

  // Acciones rápidas
  accionesRow: { flexDirection: 'row', marginHorizontal: 20, gap: 14 },
  accionBtn: {
    flex: 1, backgroundColor: 'white', borderRadius: 22, padding: 18,
    alignItems: 'center', elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  accionIconBg: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  accionTexto: { fontSize: 13, fontWeight: '800', color: '#111827', textAlign: 'center' },

  // Tareas
  tareasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 28, marginBottom: 14 },
  verTodasBtn: { paddingVertical: 5, paddingHorizontal: 12, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  verTodasTexto: { fontWeight: '800', fontSize: 13 },
  tareasCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: 'white', marginHorizontal: 20, borderRadius: 22,
    padding: 20, elevation: 2, borderWidth: 1.5,
  },
  tareasIconBg: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tareasInfo: { flex: 1 },
  tareasNumero: { fontSize: 36, fontWeight: '900' },
  tareasLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginTop: 2 },

  // Modal agenda
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: 'white',
  },
  modalTitulo: { fontSize: 22, fontWeight: '900', color: '#111827' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 12 },
  agendaRow: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  agendaFechaBox: {
    width: 52, height: 62, backgroundColor: 'white', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', elevation: 2,
  },
  agendaDia: { fontSize: 20, fontWeight: '900', color: '#111827' },
  agendaMes: { fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  agendaCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', elevation: 1, gap: 6,
  },
  agendaProducto: { fontSize: 16, fontWeight: '900', color: '#111827', flex: 1 },
  pendienteBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendienteTexto: { fontSize: 10, fontWeight: '900', color: '#D97706' },
  agendaArete: { fontSize: 13, color: '#6B7280' },
  agendaTipo: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
});
