import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function diasEnMes(mes: number, anio: number): number {
  return new Date(anio, mes, 0).getDate();
}

function generarAnios(): number[] {
  const actual = new Date().getFullYear();
  const anios: number[] = [];
  for (let y = actual; y >= actual - 40; y--) anios.push(y);
  return anios;
}

interface ColumnPickerProps {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  color: string;
}

function ColumnPicker({ items, selectedIndex, onSelect, color }: ColumnPickerProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    if (idx !== selectedIndex && idx >= 0 && idx < items.length) {
      onSelect(idx);
    }
  };

  return (
    <View style={styles.columnWrapper}>
      {/* Indicador de selección */}
      <View style={[styles.selectionIndicator, { borderColor: color + '40' }]} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        style={{ height: PICKER_HEIGHT }}
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <TouchableOpacity
              key={idx}
              style={styles.pickerItem}
              onPress={() => {
                onSelect(idx);
                scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pickerItemText,
                isSelected && { color, fontWeight: '900', fontSize: 18 },
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface DatePickerModalProps {
  visible: boolean;
  /** Fecha inicial en formato AAAA-MM-DD o vacío */
  valorInicial?: string;
  color: string;
  onConfirm: (fecha: string) => void;
  onClose: () => void;
}

export default function DatePickerModal({
  visible, valorInicial, color, onConfirm, onClose,
}: DatePickerModalProps) {
  const anios = generarAnios();
  const hoy = new Date();

  // Parsear valor inicial
  const parseInicial = () => {
    if (valorInicial && /^\d{4}-\d{2}-\d{2}$/.test(valorInicial)) {
      const [y, m, d] = valorInicial.split('-').map(Number);
      return { anioIdx: anios.indexOf(y) >= 0 ? anios.indexOf(y) : 0, mesIdx: m - 1, diaIdx: d - 1 };
    }
    return { anioIdx: 0, mesIdx: hoy.getMonth(), diaIdx: hoy.getDate() - 1 };
  };

  const inicial = parseInicial();
  const [anioIdx, setAnioIdx] = useState(inicial.anioIdx);
  const [mesIdx, setMesIdx] = useState(inicial.mesIdx);
  const [diaIdx, setDiaIdx] = useState(inicial.diaIdx);

  // Recalcular días cuando cambia mes o año
  const anioSel = anios[anioIdx] ?? hoy.getFullYear();
  const totalDias = diasEnMes(mesIdx + 1, anioSel);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  // Ajustar día si excede el máximo del mes
  useEffect(() => {
    if (diaIdx >= totalDias) setDiaIdx(totalDias - 1);
  }, [mesIdx, anioIdx]);

  // Resetear al abrir
  useEffect(() => {
    if (visible) {
      const p = parseInicial();
      setAnioIdx(p.anioIdx);
      setMesIdx(p.mesIdx);
      setDiaIdx(p.diaIdx);
    }
  }, [visible]);

  const handleConfirm = () => {
    const anio = anios[anioIdx];
    const mes = String(mesIdx + 1).padStart(2, '0');
    const dia = String(diaIdx + 1).padStart(2, '0');
    onConfirm(`${anio}-${mes}-${dia}`);
  };

  const anioSel2 = anios[anioIdx];
  const mesNombre = MESES[mesIdx];
  const diaSel = diaIdx + 1;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Fecha de Nacimiento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#6B7280" size={22} />
            </TouchableOpacity>
          </View>

          {/* Preview de la fecha seleccionada */}
          <View style={[styles.preview, { backgroundColor: color + '12', borderColor: color + '30' }]}>
            <Text style={[styles.previewText, { color }]}>
              {diaSel} de {mesNombre} de {anioSel2}
            </Text>
          </View>

          {/* Columnas */}
          <View style={styles.columnsRow}>
            {/* Día */}
            <View style={styles.columnContainer}>
              <Text style={styles.columnLabel}>DÍA</Text>
              <ColumnPicker
                items={dias}
                selectedIndex={Math.min(diaIdx, dias.length - 1)}
                onSelect={setDiaIdx}
                color={color}
              />
            </View>

            {/* Mes */}
            <View style={[styles.columnContainer, { flex: 1.6 }]}>
              <Text style={styles.columnLabel}>MES</Text>
              <ColumnPicker
                items={MESES}
                selectedIndex={mesIdx}
                onSelect={setMesIdx}
                color={color}
              />
            </View>

            {/* Año */}
            <View style={styles.columnContainer}>
              <Text style={styles.columnLabel}>AÑO</Text>
              <ColumnPicker
                items={anios}
                selectedIndex={anioIdx}
                onSelect={setAnioIdx}
                color={color}
              />
            </View>
          </View>

          {/* Botón confirmar */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: color }]}
            onPress={handleConfirm}
          >
            <CheckCircle2 color="white" size={22} />
            <Text style={styles.confirmText}>Confirmar Fecha</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.65)' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 36,
  },
  handle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#111827' },
  closeBtn: { padding: 6, backgroundColor: '#F3F4F6', borderRadius: 20 },
  preview: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewText: { fontSize: 17, fontWeight: '800' },
  columnsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  columnContainer: { flex: 1, alignItems: 'center' },
  columnLabel: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 },
  columnWrapper: { width: '100%', position: 'relative' },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRadius: 10,
    zIndex: 1,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    elevation: 3,
  },
  confirmText: { color: 'white', fontSize: 17, fontWeight: '900' },
});
