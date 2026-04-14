import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Scale, TrendingUp, TrendingDown, Calendar } from 'lucide-react-native';

import type { Pesaje, Animal } from '../../types';

interface TabPesosProps {
  pesoActual: number;
  gananciaUltima: number;
  historialPesos: Pesaje[];
  animal: Animal | null;
  color: string;
  setModalVisible: (v: boolean) => void;
}

export default function TabPesos({ pesoActual, gananciaUltima, historialPesos, animal, color, setModalVisible }: TabPesosProps) {
  return (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Peso Actual</Text>
          <Text style={styles.statValue}>{pesoActual} <Text style={styles.statUnit}>kg</Text></Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Última Ganancia</Text>
          <View style={styles.trendRow}>
            {gananciaUltima >= 0 ? <TrendingUp color="#10B981" size={20} /> : <TrendingDown color="#EF4444" size={20} />}
            <Text style={[styles.trendValue, { color: gananciaUltima >= 0 ? '#10B981' : '#EF4444' }]}>
              {gananciaUltima > 0 ? '+' : ''}{gananciaUltima.toFixed(1)} kg
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.addWeightBtn, { backgroundColor: color }]} onPress={() => setModalVisible(true)}>
        <Scale color="white" size={24} />
        <Text style={styles.addWeightText}>Registrar Nuevo Peso</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Historial de Pesajes</Text>
      {historialPesos.map((item: any, index: number) => (
        <View key={item.id} style={styles.historyCard}>
          <View style={styles.historyLeft}>
            <View style={[styles.historyIconWrapper, { backgroundColor: color + '15' }]}>
              <Calendar color={color} size={20} />
            </View>
            <View>
              <Text style={styles.historyDate}>{new Date(item.fecha_pesaje).toLocaleDateString()}</Text>
              {index === 0 && <Text style={[styles.historyBadge, { color: color }]}>Último registro</Text>}
            </View>
          </View>
          <Text style={styles.historyWeight}>{item.peso} kg</Text>
        </View>
      ))}
      {historialPesos.length === 0 && <Text style={styles.emptyTextDescendencia}>Solo cuenta con el peso inicial de {animal?.peso_inicial} kg.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '700', marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: '900', color: '#111827' },
  statUnit: { fontSize: 16, color: '#9CA3AF', fontWeight: '700' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trendValue: { fontSize: 18, fontWeight: '900' },
  addWeightBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, marginBottom: 30, gap: 10, elevation: 3 },
  addWeightText: { color: 'white', fontSize: 18, fontWeight: '900' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 15 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  historyIconWrapper: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  historyDate: { fontSize: 16, fontWeight: '800', color: '#111827' },
  historyBadge: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  historyWeight: { fontSize: 20, fontWeight: '900', color: '#111827' },
  emptyTextDescendencia: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginTop: 10 },
});