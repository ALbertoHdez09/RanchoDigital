import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Plus } from 'lucide-react-native';

import type { AnimalRef } from '../../types';

interface SeccionGenealogiaProps {
  padre: AnimalRef | null;
  madre: AnimalRef | null;
  abrirModalPadres: (tipo: 'padre' | 'madre') => void;
  color: string;
}

export default function SeccionGenealogia({ padre, madre, abrirModalPadres, color }: SeccionGenealogiaProps) {
  return (
    <View>
      <Text style={[styles.cardTitle, { marginTop: 30, fontSize: 22 }]}>Genealogía</Text>
      <Text style={[styles.cardSubtitle, { marginBottom: 15 }]}>Opcional. Enlaza a los padres.</Text>
      
      <View style={styles.genealogiaRow}>
        <TouchableOpacity 
          style={[styles.parentBtn, padre && { borderColor: color, backgroundColor: color + '10' }]} 
          onPress={() => abrirModalPadres('padre')}
        >
          {padre ? (
            <>
              <CheckCircle2 color={color} size={24} />
              <Text style={styles.parentRole}>Padre</Text>
              <Text style={[styles.parentArete, { color: color }]}>{padre.arete_siniiga}</Text>
            </>
          ) : (
            <>
              <Plus color="#9CA3AF" size={24} />
              <Text style={styles.parentRole}>Añadir Padre</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ width: 15 }} />

        <TouchableOpacity 
          style={[styles.parentBtn, madre && { borderColor: color, backgroundColor: color + '10' }]} 
          onPress={() => abrirModalPadres('madre')}
        >
          {madre ? (
            <>
              <CheckCircle2 color={color} size={24} />
              <Text style={styles.parentRole}>Madre</Text>
              <Text style={[styles.parentArete, { color: color }]}>{madre.arete_siniiga}</Text>
            </>
          ) : (
            <>
              <Plus color="#9CA3AF" size={24} />
              <Text style={styles.parentRole}>Añadir Madre</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 16, color: '#4B5563', fontWeight: '600', marginBottom: 25 },
  genealogiaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  parentBtn: { flex: 1, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  parentRole: { fontSize: 14, color: '#6B7280', fontWeight: '800', marginTop: 5 },
  parentArete: { fontSize: 16, fontWeight: '900', marginTop: 2 },
});