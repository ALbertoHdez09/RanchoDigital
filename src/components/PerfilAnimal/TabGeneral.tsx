import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, ArrowRight, MoreVertical, Pencil, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { sugerirCambioEtapa, formatearEdad } from '../../utils/etapaAnimal';
import type { Animal, AnimalRef } from '../../types';

interface TabGeneralProps {
  animal: Animal & { padre?: AnimalRef | null; madre?: AnimalRef | null };
  hijos: AnimalRef[];
  abrirModalPadres: (tipo: 'padre' | 'madre') => void;
  onOpcionesPariente: (tipo: 'padre' | 'madre') => void;
  onOpcionesAnimal: () => void;
  onEditarFecha: () => void;
  onActualizarEtapa?: (nuevaEtapa: string) => void;
}

export default function TabGeneral({ animal, hijos, abrirModalPadres, onOpcionesPariente, onOpcionesAnimal, onEditarFecha, onActualizarEtapa }: TabGeneralProps) {
  const router = useRouter();

  const etapaSugerida = sugerirCambioEtapa(animal?.estado, animal?.fecha_nacimiento, animal?.genero ?? 'Hembra');
  const edadFormateada = animal?.fecha_nacimiento ? formatearEdad(animal.fecha_nacimiento) : null;
  return (
    <View>
      {/* Banner de sugerencia de etapa */}
      {etapaSugerida && onActualizarEtapa && (
        <TouchableOpacity
          style={styles.etapaBanner}
          onPress={() => onActualizarEtapa(etapaSugerida)}
          activeOpacity={0.8}
        >
          <AlertCircle color="#D97706" size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.etapaBannerTitulo}>Etapa desactualizada</Text>
            <Text style={styles.etapaBannerTexto}>
              Con {edadFormateada}, la etapa debería ser "{etapaSugerida}". Toca para actualizar.
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          <TouchableOpacity style={styles.dotsBtn} onPress={onOpcionesAnimal}>
            <MoreVertical color="#9CA3AF" size={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}><Text style={styles.infoLabel}>Nombre:</Text><Text style={styles.infoValue}>{animal?.nombre || 'Sin nombre'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Estado:</Text><Text style={styles.infoValue}>{animal?.estado}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Propósito:</Text><Text style={styles.infoValue}>{animal?.fin_productivo}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Peso Inicial:</Text><Text style={styles.infoValue}>{animal?.peso_inicial} kg</Text></View>

        {/* FECHA Y EDAD */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nacimiento:</Text>
          <View style={styles.fechaRow}>
            {animal?.fecha_nacimiento ? (
              <>
                <Text style={styles.infoValue}>{animal.fecha_nacimiento}</Text>
                <Text style={styles.edadBadge}>{edadFormateada ?? ''}</Text>
                <TouchableOpacity onPress={onEditarFecha} style={styles.editFechaBtn}>
                  <Pencil color="#9CA3AF" size={14} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.addFechaBtn} onPress={onEditarFecha}>
                <Plus color="#9CA3AF" size={14} />
                <Text style={styles.addFechaText}>Agregar fecha</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Genealogía</Text>
        <Text style={styles.subLabel}>Padres</Text>
        <View style={styles.genealogyRow}>
          {animal?.padre ? (
            <View style={styles.familyBtnContainer}>
              <TouchableOpacity style={styles.familyBtn} onPress={() => router.push(`/animal/${animal.padre!.id}`)}>
                <Text style={styles.familyRole}>Toro</Text>
                <Text style={styles.familyArete}>{animal.padre!.arete_siniiga}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dotsBtn} onPress={() => onOpcionesPariente('padre')}>
                <MoreVertical color="#9CA3AF" size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.familyBtnEmpty} onPress={() => abrirModalPadres('padre')}>
              <Plus color="#9CA3AF" size={24} />
              <Text style={styles.emptyText}>Añadir Padre</Text>
            </TouchableOpacity>
          )}
          {animal?.madre ? (
            <View style={styles.familyBtnContainer}>
              <TouchableOpacity style={styles.familyBtn} onPress={() => router.push(`/animal/${animal.madre!.id}`)}>
                <Text style={styles.familyRole}>Vaca</Text>
                <Text style={styles.familyArete}>{animal.madre!.arete_siniiga}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dotsBtn} onPress={() => onOpcionesPariente('madre')}>
                <MoreVertical color="#9CA3AF" size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.familyBtnEmpty} onPress={() => abrirModalPadres('madre')}>
              <Plus color="#9CA3AF" size={24} />
              <Text style={styles.emptyText}>Añadir Madre</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.subLabel, { marginTop: 15 }]}>Descendencia ({hijos.length})</Text>
        {hijos.length > 0 ? hijos.map((h: any) => (
          <TouchableOpacity key={h.id} style={styles.hijoRow} onPress={() => router.push(`/animal/${h.id}`)}>
            <Text style={styles.hijoArete}>Arete: {h.arete_siniiga}</Text>
            <ArrowRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )) : <Text style={styles.emptyTextDescendencia}>No tiene crías registradas.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  etapaBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF3C7', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  etapaBannerTitulo: { fontSize: 13, fontWeight: '900', color: '#92400E' },
  etapaBannerTexto: { fontSize: 12, color: '#92400E', fontWeight: '600', marginTop: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '800' },
  fechaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  edadBadge: { fontSize: 12, color: '#6B7280', fontWeight: '700', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  editFechaBtn: { padding: 4 },
  addFechaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  addFechaText: { fontSize: 13, color: '#9CA3AF', fontWeight: '700' },
  subLabel: { fontSize: 12, fontWeight: '900', color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase' },
  genealogyRow: { flexDirection: 'row', gap: 10 },
  familyBtnContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  familyBtn: { flex: 1, padding: 15, alignItems: 'center' },
  familyBtnEmpty: { flex: 1, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 15, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  familyRole: { fontSize: 12, color: '#6B7280', fontWeight: '800', marginBottom: 5 },
  familyArete: { fontSize: 16, color: '#111827', fontWeight: '900' },
  dotsBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 13, fontWeight: '800', marginTop: 8 },
  emptyTextDescendencia: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginTop: 10 },
  hijoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  hijoArete: { fontSize: 15, fontWeight: '800', color: '#111827' },
});