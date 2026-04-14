import { useFocusEffect, useRouter } from 'expo-router';
import { Activity, ChevronRight, Plus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetwork } from '../../src/context/NetworkContext';
import { useTheme } from '../../src/context/ThemeContext';
import { guardarCacheLocal, obtenerCacheLocal } from '../../src/services/offlineService';
import { supabase } from '../../src/services/supabase';
import type { DosisMedica } from '../../src/types';

interface GrupoActividad {
  animalId: string;
  arete: string;
  nombre: string;
  total: number;
  fechaProxima: string | null;
}

function urgencia(fecha: string | null): 'rojo' | 'amarillo' | 'normal' {
  if (!fecha) return 'normal';
  const diff = (new Date(fecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 0) return 'rojo';
  if (diff <= 3) return 'amarillo';
  return 'normal';
}

export default function ActividadesScreen() {
  const { color } = useTheme();
  const router = useRouter();
  const { isConnected } = useNetwork();

  const [grupos, setGrupos] = useState<GrupoActividad[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { fetchDatosAgrupados(); }, [isConnected]));

  async function fetchDatosAgrupados() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      let dosisData: DosisMedica[] = [];

      if (isConnected) {
        const { data: misAn } = await supabase.from('animales').select('id').eq('user_id', userId);
        const misIds = (misAn ?? []).map((a: { id: string }) => a.id);

        const { data, error } = await supabase
          .from('dosis_medicas')
          .select(`*, planes_medicos!inner( animal_id, animales!inner(arete_siniiga, nombre) )`)
          .neq('estado', 'Completado')
          .order('fecha_programada', { ascending: true });

        if (error) throw error;
        dosisData = (data ?? []).filter((d: DosisMedica) => misIds.includes(d.planes_medicos?.animal_id ?? ''));
        await guardarCacheLocal<DosisMedica[]>('tareas_cache', dosisData);
      } else {
        dosisData = (await obtenerCacheLocal<DosisMedica[]>('tareas_cache', true)) ?? [];
      }

      if (dosisData.length > 0) {
        const agrupados = dosisData.reduce<Record<string, GrupoActividad>>((acc, curr) => {
          const plan = curr.planes_medicos;
          if (!plan) return acc;
          const animalId = plan.animal_id;
          const info = plan.animales ?? {};
          if (!acc[animalId]) {
            acc[animalId] = {
              animalId,
              arete: (info as any).arete_siniiga ?? 'Desconocido',
              nombre: (info as any).nombre ?? '',
              total: 0,
              fechaProxima: curr.fecha_programada ?? null,
            };
          }
          acc[animalId].total += 1;
          if (curr.fecha_programada && (!acc[animalId].fechaProxima || curr.fecha_programada < acc[animalId].fechaProxima!)) {
            acc[animalId].fechaProxima = curr.fecha_programada;
          }
          return acc;
        }, {});

        setGrupos(Object.values(agrupados).sort((a, b) => {
          if (!a.fechaProxima) return 1;
          if (!b.fechaProxima) return -1;
          return a.fechaProxima.localeCompare(b.fechaProxima);
        }));
      } else {
        setGrupos([]);
      }
    } catch (e) {
      console.log('Error Actividades:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>Actividades</Text>
        <Text style={styles.headerSub}>Tratamientos y tareas pendientes</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={color} style={{ marginTop: 50 }} />
        ) : (
          <FlatList<GrupoActividad>
            data={grupos}
            keyExtractor={item => item.animalId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>¡Todo al día! Sin actividades pendientes.</Text>
            }
            renderItem={({ item }) => {
              const nivel = urgencia(item.fechaProxima);
              const indicadorColor = nivel === 'rojo' ? '#EF4444' : nivel === 'amarillo' ? '#F59E0B' : '#10B981';
              return (
                <TouchableOpacity
                  style={styles.groupCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/detalle-salud/${item.animalId}` as any)}
                >
                  <View style={[styles.urgenciaIndicador, { backgroundColor: indicadorColor }]} />
                  <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
                    <Activity color={color} size={26} />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.arete}>
                      {item.nombre ? `${item.arete} — ${item.nombre}` : item.arete}
                    </Text>
                    <Text style={[styles.subtitle, { color: indicadorColor }]}>
                      {item.total} {item.total === 1 ? 'actividad pendiente' : 'actividades pendientes'}
                    </Text>
                    {item.fechaProxima && (
                      <Text style={styles.fechaProxima}>Próxima: {item.fechaProxima}</Text>
                    )}
                  </View>
                  <ChevronRight color="#D1D5DB" size={22} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: color }]}
        onPress={() => router.push('/nuevo-registro-medico')}
      >
        <Plus color="white" size={28} />
        <Text style={styles.fabText}>Nueva Actividad</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { height: 150, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 50, paddingHorizontal: 25 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  groupCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
    overflow: 'hidden',
  },
  urgenciaIndicador: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  iconBadge: { padding: 11, borderRadius: 14, marginLeft: 8 },
  groupInfo: { flex: 1, marginLeft: 14 },
  arete: { fontSize: 17, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  fechaProxima: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 16, marginTop: 40, fontWeight: '600', paddingHorizontal: 20 },
  fab: { position: 'absolute', bottom: 70, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  fabText: { color: 'white', fontWeight: '900', fontSize: 16 },
});
