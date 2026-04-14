import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MoreVertical, CheckCircle2, Trash2, Clock } from 'lucide-react-native';

import type { DosisMedica } from '../../types';

interface TabSaludProps {
  historialSalud: DosisMedica[];
  color: string;
  onCambiarEstado: (id: string, estado: string) => void;
  onBorrar: (id: string) => void;
}

export default function TabSalud({ historialSalud, color, onCambiarEstado, onBorrar }: TabSaludProps) {
  const [modalOpciones, setModalOpciones] = useState<{ visible: boolean; dosis: any | null }>({ visible: false, dosis: null });

  return (
    <View>
      <Text style={styles.sectionTitle}>Historial Médico</Text>
      {historialSalud.map((s: any) => (
        <View key={s.id} style={styles.saludCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saludProd}>{s.producto}</Text>
            <Text style={styles.saludPlan}>{s.planes_medicos?.nombre_plan}</Text>
            <Text style={styles.saludDate}>{s.fecha_programada} {s.hora_programada}</Text>
          </View>
          <View style={styles.rightSection}>
            <View style={[styles.statusBadge, { backgroundColor: s.estado === 'Completado' ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={{ color: s.estado === 'Completado' ? '#059669' : '#D97706', fontSize: 10, fontWeight: '900' }}>{s.estado}</Text>
            </View>
            <TouchableOpacity style={styles.dotsBtn} onPress={() => setModalOpciones({ visible: true, dosis: s })}>
              <MoreVertical color="#9CA3AF" size={18} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {historialSalud.length === 0 && <Text style={styles.emptyText}>No hay registros médicos para este animal.</Text>}

      {/* MODAL DE OPCIONES */}
      <Modal animationType="slide" transparent visible={modalOpciones.visible}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalOpciones({ visible: false, dosis: null })} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{modalOpciones.dosis?.producto}</Text>
            <Text style={styles.sheetSubtitle}>{modalOpciones.dosis?.planes_medicos?.nombre_plan} • {modalOpciones.dosis?.fecha_programada}</Text>

            {modalOpciones.dosis?.estado !== 'Completado' && (
              <TouchableOpacity
                style={[styles.accionBtn, { borderColor: '#10B981' }]}
                onPress={() => {
                  onCambiarEstado(modalOpciones.dosis.id, 'Completado');
                  setModalOpciones({ visible: false, dosis: null });
                }}
              >
                <CheckCircle2 color="#10B981" size={20} />
                <Text style={[styles.accionBtnText, { color: '#10B981' }]}>Marcar como Completado</Text>
              </TouchableOpacity>
            )}

            {modalOpciones.dosis?.estado === 'Completado' && (
              <TouchableOpacity
                style={[styles.accionBtn, { borderColor: '#F59E0B' }]}
                onPress={() => {
                  onCambiarEstado(modalOpciones.dosis.id, 'Pendiente');
                  setModalOpciones({ visible: false, dosis: null });
                }}
              >
                <Clock color="#F59E0B" size={20} />
                <Text style={[styles.accionBtnText, { color: '#F59E0B' }]}>Marcar como Pendiente</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.accionBtn, { borderColor: '#EF4444', marginTop: 10 }]}
              onPress={() => {
                onBorrar(modalOpciones.dosis.id);
                setModalOpciones({ visible: false, dosis: null });
              }}
            >
              <Trash2 color="#EF4444" size={20} />
              <Text style={[styles.accionBtnText, { color: '#EF4444' }]}>Eliminar Tratamiento</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalOpciones({ visible: false, dosis: null })} style={{ marginTop: 15 }}>
              <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 15 },
  saludCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  saludProd: { fontSize: 16, fontWeight: '900', color: '#111827' },
  saludPlan: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  saludDate: { fontSize: 11, color: '#9CA3AF', fontWeight: '800', marginTop: 5 },
  rightSection: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  dotsBtn: { padding: 4 },
  emptyText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginTop: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.7)' },
  modalDismissArea: { flex: 1 },
  bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 34, alignItems: 'center' },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#111827', textAlign: 'left', width: '100%' },
  sheetSubtitle: { fontSize: 13, color: '#6B7280', fontWeight: '600', width: '100%', marginBottom: 20, marginTop: 4 },
  accionBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 2, gap: 10 },
  accionBtnText: { fontSize: 16, fontWeight: '900' },
});