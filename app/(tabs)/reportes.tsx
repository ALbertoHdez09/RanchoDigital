import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  TextInput, FlatList, Modal, ScrollView, Alert,
} from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Search, FileText, Tag, ChevronRight, X,
  Calendar, Download, Users, Beef,
} from 'lucide-react-native';
import { useNetwork } from '../../src/context/NetworkContext';
import { obtenerCacheLocal } from '../../src/services/offlineService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Animal } from '../../src/types';

// ─── Periodos de tiempo ───────────────────────────────────────────────────────
const PERIODOS = [
  { label: '1 día',        dias: 1 },
  { label: '1 semana',     dias: 7 },
  { label: '1 mes',        dias: 30 },
  { label: '3 meses',      dias: 90 },
  { label: '6 meses',      dias: 180 },
  { label: '1 año',        dias: 365 },
  { label: 'Todo',         dias: 9999 },
];

export default function ReportesScreen() {
  const { color } = useTheme();
  const router    = useRouter();
  const { isConnected } = useNetwork();

  const [animales, setAnimales]         = useState<Animal[]>([]);
  const [busqueda, setBusqueda]         = useState('');
  const [loading, setLoading]           = useState(true);
  const [generando, setGenerando]       = useState(false);

  // Modal selección de periodo
  const [modalPeriodo, setModalPeriodo] = useState<{
    visible: boolean;
    modo: 'animal' | 'todos';
    animal?: Animal;
  }>({ visible: false, modo: 'todos' });

  useFocusEffect(useCallback(() => { fetchAnimales(); }, [isConnected]));

  async function fetchAnimales() {
    setLoading(true);
    try {
      if (isConnected) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data } = await supabase
          .from('animales')
          .select('id, arete_siniiga, nombre, raza, genero, peso_inicial, estado, fecha_nacimiento, user_id')
          .eq('user_id', session?.user?.id)
          .order('arete_siniiga', { ascending: true });
        setAnimales(data ?? []);
      } else {
        const cache = await obtenerCacheLocal<Animal[]>('animales_cache', true) ?? [];
        setAnimales(cache);
      }
    } catch (e) {
      console.log('Error reportes:', e);
    } finally {
      setLoading(false);
    }
  }

  const animalesFiltrados = animales.filter(a =>
    a.arete_siniiga?.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ─── Generar PDF ──────────────────────────────────────────────────────────

  async function generarReporte(periodo: typeof PERIODOS[0], animal?: Animal) {
    if (!isConnected) {
      Alert.alert('Sin conexión', 'Necesitas internet para generar reportes PDF.');
      return;
    }
    setModalPeriodo({ visible: false, modo: 'todos' });
    setGenerando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const fechaDesde = periodo.dias === 9999
        ? new Date(0).toISOString()
        : new Date(Date.now() - periodo.dias * 86400000).toISOString();

      let animalesReporte: Animal[] = [];
      let pesajes: any[] = [];
      let dosis: any[] = [];

      if (animal) {
        // Reporte de un animal específico
        animalesReporte = [animal];
        const { data: p } = await supabase
          .from('pesajes')
          .select('*')
          .eq('animal_id', animal.id)
          .gte('fecha_pesaje', fechaDesde)
          .order('fecha_pesaje', { ascending: false });
        pesajes = p ?? [];

        const { data: d } = await supabase
          .from('dosis_medicas')
          .select(`*, planes_medicos!inner(nombre_plan, animal_id)`)
          .eq('planes_medicos.animal_id', animal.id)
          .gte('fecha_programada', fechaDesde.split('T')[0])
          .order('fecha_programada', { ascending: false });
        dosis = d ?? [];
      } else {
        // Reporte de todos los animales
        const { data: a } = await supabase
          .from('animales')
          .select('*')
          .eq('user_id', userId);
        animalesReporte = a ?? [];

        const ids = animalesReporte.map(x => x.id);
        if (ids.length > 0) {
          const { data: d } = await supabase
            .from('dosis_medicas')
            .select(`*, planes_medicos!inner(nombre_plan, animal_id)`)
            .in('planes_medicos.animal_id', ids)
            .gte('fecha_programada', fechaDesde.split('T')[0])
            .order('fecha_programada', { ascending: false });
          dosis = d ?? [];

          const { data: p } = await supabase
            .from('pesajes')
            .select('*')
            .in('animal_id', ids)
            .gte('fecha_pesaje', fechaDesde)
            .order('fecha_pesaje', { ascending: false });
          pesajes = p ?? [];
        }
      }

      const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
      const titulo = animal
        ? `Reporte: Arete ${animal.arete_siniiga}${animal.nombre ? ` — ${animal.nombre}` : ''}`
        : `Reporte General del Rancho`;

      // ── Tabla de animales ──
      const filasAnimales = animalesReporte.map(a => `
        <tr>
          <td><strong>${a.arete_siniiga}</strong></td>
          <td>${a.nombre || '—'}</td>
          <td>${a.raza}</td>
          <td>${a.genero}</td>
          <td>${a.peso_inicial} kg</td>
          <td>${a.estado || '—'}</td>
          <td>${a.fecha_nacimiento || '—'}</td>
        </tr>`).join('');

      // ── Tabla de pesajes ──
      const filasPesajes = pesajes.map(p => {
        const a = animalesReporte.find(x => x.id === p.animal_id);
        return `<tr>
          <td><strong>${a?.arete_siniiga || '—'}</strong></td>
          <td>${p.peso} kg</td>
          <td>${new Date(p.fecha_pesaje).toLocaleDateString('es-MX')}</td>
        </tr>`;
      }).join('');

      // ── Tabla de tratamientos ──
      const filasDosis = dosis.map((d: any) => {
        const plan = Array.isArray(d.planes_medicos) ? d.planes_medicos[0] : d.planes_medicos;
        const a = animalesReporte.find(x => x.id === plan?.animal_id);
        return `<tr>
          <td><strong>${a?.arete_siniiga || '—'}</strong></td>
          <td>${plan?.nombre_plan || '—'}</td>
          <td>${d.producto}</td>
          <td>${d.fecha_programada}</td>
          <td><span class="badge ${d.estado === 'Completado' ? 'ok' : 'pend'}">${d.estado}</span></td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;color:#333;padding:32px;font-size:13px}
        h1{font-size:24px;font-weight:900;color:#111;margin:0}
        h2{font-size:16px;font-weight:800;color:#111;margin:28px 0 10px;border-bottom:2px solid ${color};padding-bottom:6px}
        .meta{color:#6B7280;font-size:12px;margin:4px 0 24px}
        table{width:100%;border-collapse:collapse;margin-bottom:8px}
        th{background:${color};color:white;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase}
        td{padding:9px 12px;border-bottom:1px solid #E5E7EB;font-size:12px}
        tr:nth-child(even){background:#F9FAFB}
        .badge{padding:3px 8px;border-radius:10px;font-size:11px;font-weight:700}
        .ok{background:#D1FAE5;color:#065F46}
        .pend{background:#FEF3C7;color:#92400E}
        .footer{margin-top:40px;text-align:center;font-size:11px;color:#9CA3AF}
        .resumen{display:flex;gap:20px;margin-bottom:24px}
        .res-item{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 20px;text-align:center}
        .res-num{font-size:28px;font-weight:900;color:${color}}
        .res-label{font-size:11px;color:#6B7280;font-weight:700;text-transform:uppercase}
      </style></head><body>
      <h1>${titulo}</h1>
      <p class="meta">Período: ${periodo.label} &nbsp;|&nbsp; Generado el ${fecha}</p>

      <div class="resumen">
        <div class="res-item"><div class="res-num">${animalesReporte.length}</div><div class="res-label">Animales</div></div>
        <div class="res-item"><div class="res-num">${pesajes.length}</div><div class="res-label">Pesajes</div></div>
        <div class="res-item"><div class="res-num">${dosis.length}</div><div class="res-label">Tratamientos</div></div>
      </div>

      <h2>Inventario de Animales</h2>
      <table><thead><tr>
        <th>Arete</th><th>Nombre</th><th>Raza</th><th>Género</th><th>Peso</th><th>Estado</th><th>Nacimiento</th>
      </tr></thead><tbody>${filasAnimales || '<tr><td colspan="7" style="text-align:center;color:#9CA3AF">Sin datos</td></tr>'}</tbody></table>

      ${pesajes.length > 0 ? `<h2>Historial de Pesajes</h2>
      <table><thead><tr><th>Arete</th><th>Peso</th><th>Fecha</th></tr></thead>
      <tbody>${filasPesajes}</tbody></table>` : ''}

      ${dosis.length > 0 ? `<h2>Historial de Tratamientos</h2>
      <table><thead><tr><th>Arete</th><th>Plan</th><th>Producto</th><th>Fecha</th><th>Estado</th></tr></thead>
      <tbody>${filasDosis}</tbody></table>` : ''}

      <div class="footer">Generado por RanchoDigital</div>
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (e) {
      console.log('Error generando PDF:', e);
      Alert.alert('Error', 'No se pudo generar el reporte.');
    } finally {
      setGenerando(false);
    }
  }

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={color} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>Reportes</Text>
        <Text style={styles.headerSub}>Genera reportes PDF de tu hato</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── REPORTE GENERAL ── */}
        <Text style={styles.seccionTitulo}>Reporte General</Text>
        <TouchableOpacity
          style={styles.opcionCard}
          onPress={() => setModalPeriodo({ visible: true, modo: 'todos' })}
          activeOpacity={0.7}
        >
          <View style={[styles.opcionIconBg, { backgroundColor: color + '15' }]}>
            <Users color={color} size={28} />
          </View>
          <View style={styles.opcionInfo}>
            <Text style={styles.opcionTitulo}>Todos los Animales</Text>
            <Text style={styles.opcionDesc}>Inventario completo + pesajes + tratamientos</Text>
          </View>
          <ChevronRight color="#D1D5DB" size={22} />
        </TouchableOpacity>

        {/* ── REPORTE POR ANIMAL ── */}
        <Text style={styles.seccionTitulo}>Reporte por Animal</Text>

        {/* Barra de búsqueda */}
        <View style={styles.searchBar}>
          <Search color="#999" size={18} />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#333' }}
            placeholder="Buscar arete o nombre..."
            placeholderTextColor="#999"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <X color="#9CA3AF" size={18} />
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de animales */}
        {animalesFiltrados.map(animal => (
          <TouchableOpacity
            key={animal.id}
            style={styles.animalRow}
            onPress={() => setModalPeriodo({ visible: true, modo: 'animal', animal })}
            activeOpacity={0.7}
          >
            <View style={[styles.areteIconBg, { backgroundColor: color + '15' }]}>
              <Tag color={color} size={18} />
            </View>
            <View style={styles.animalInfo}>
              <Text style={styles.animalArete}>{animal.arete_siniiga}</Text>
              <Text style={styles.animalDetalle}>
                {animal.nombre ? `${animal.nombre} · ` : ''}{animal.raza} · {animal.genero}
              </Text>
            </View>
            <FileText color="#D1D5DB" size={20} />
          </TouchableOpacity>
        ))}

        {animalesFiltrados.length === 0 && (
          <View style={styles.emptyState}>
            <Beef color="#DDD" size={60} strokeWidth={1} />
            <Text style={styles.emptyText}>
              {busqueda ? 'Sin resultados' : 'Sin animales registrados'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Indicador de generación */}
      {generando && (
        <View style={styles.generandoOverlay}>
          <ActivityIndicator color="white" size="large" />
          <Text style={styles.generandoText}>Generando PDF...</Text>
        </View>
      )}

      {/* ── MODAL SELECCIÓN DE PERIODO ── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalPeriodo.visible}
        onRequestClose={() => setModalPeriodo({ visible: false, modo: 'todos' })}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            onPress={() => setModalPeriodo({ visible: false, modo: 'todos' })}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {modalPeriodo.modo === 'animal' && modalPeriodo.animal
                ? `Arete: ${modalPeriodo.animal.arete_siniiga}`
                : 'Todos los Animales'}
            </Text>
            <Text style={styles.sheetSub}>Selecciona el período del reporte</Text>

            {PERIODOS.map(p => (
              <TouchableOpacity
                key={p.label}
                style={styles.periodoRow}
                onPress={() => generarReporte(p, modalPeriodo.animal)}
                activeOpacity={0.7}
              >
                <View style={[styles.periodoIconBg, { backgroundColor: color + '12' }]}>
                  <Calendar color={color} size={20} />
                </View>
                <Text style={styles.periodoLabel}>{p.label}</Text>
                <Download color="#D1D5DB" size={18} />
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
  header: {
    paddingTop: 55, paddingBottom: 25, paddingHorizontal: 24,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600', marginTop: 4 },

  content: { flex: 1, paddingHorizontal: 20 },
  seccionTitulo: { fontSize: 18, fontWeight: '900', color: '#111827', marginTop: 24, marginBottom: 12 },

  opcionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 20, padding: 18, marginBottom: 12, gap: 14,
    elevation: 2, borderWidth: 1, borderColor: '#E5E7EB',
  },
  opcionIconBg: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  opcionInfo: { flex: 1 },
  opcionTitulo: { fontSize: 17, fontWeight: '900', color: '#111827' },
  opcionDesc: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 3 },

  searchBar: {
    flexDirection: 'row', backgroundColor: 'white', padding: 13,
    borderRadius: 16, alignItems: 'center', marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },

  animalRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 16, padding: 14, marginBottom: 10, gap: 12,
    elevation: 1, borderWidth: 1, borderColor: '#F0F0F0',
  },
  areteIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  animalInfo: { flex: 1 },
  animalArete: { fontSize: 16, fontWeight: '900', color: '#111827' },
  animalDetalle: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 },

  emptyState: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },

  generandoOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(17,24,39,0.7)',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  generandoText: { color: 'white', fontSize: 16, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.65)' },
  modalDismiss: { flex: 1 },
  bottomSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sheetSub: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginTop: 4, marginBottom: 20 },

  periodoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 14,
  },
  periodoIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  periodoLabel: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111827' },
});
