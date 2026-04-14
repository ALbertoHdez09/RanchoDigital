import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Tag, ClipboardList, ChevronDown } from 'lucide-react-native';

import type { Animal, AnimalRef, EstadoAnimal, FinProductivo, Genero } from '../../types';

interface FormularioAnimalForm {
  arete: string;
  nombre: string;
  raza: string;
  peso_inicial: string;
  genero: Genero;
  estado: EstadoAnimal;
  fin_productivo: FinProductivo;
  fecha_nacimiento: string;
}

interface SeccionBasicaProps {
  form: FormularioAnimalForm;
  setForm: (f: FormularioAnimalForm) => void;
  color: string;
  abrirSelector: (tipo: string, titulo: string) => void;
}

export default function SeccionBasica({ form, setForm, color, abrirSelector }: SeccionBasicaProps) {
  return (
    <View>
      <Text style={styles.label}>NÚMERO DE ARETE / SINIIGA *</Text>
      <View style={[styles.inputWrapper, { borderColor: color + '50' }]}>
        <Tag size={24} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Ej: MX-4502" placeholderTextColor="#9CA3AF" value={form.arete} onChangeText={(t) => setForm({...form, arete: t})} autoCapitalize="characters" />
      </View>

      <Text style={styles.label}>NOMBRE (OPCIONAL)</Text>
      <View style={[styles.inputWrapper, { borderColor: color + '50' }]}>
        <ClipboardList size={24} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Ej: La Pinta" placeholderTextColor="#9CA3AF" value={form.nombre} onChangeText={(t) => setForm({...form, nombre: t})} autoCapitalize="words" />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1.2 }}>
          <Text style={styles.label}>RAZA *</Text>
          <TextInput style={[styles.inputSimple, { borderColor: color + '50' }]} placeholder="Ej: Angus" placeholderTextColor="#9CA3AF" value={form.raza} onChangeText={(t) => setForm({...form, raza: t})} autoCapitalize="words" />
        </View>
        <View style={{ width: 15 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>PESO (kg)</Text>
          <TextInput style={[styles.inputSimple, { borderColor: color + '50' }]} placeholder="0.0" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" value={form.peso_inicial} onChangeText={(t) => setForm({...form, peso_inicial: t})} />
        </View>
      </View>

      <Text style={styles.label}>GÉNERO</Text>
      <View style={styles.genderContainer}>
        {['Hembra', 'Macho'].map((g) => (
          <TouchableOpacity key={g} style={[styles.genderBtn, form.genero === g && { backgroundColor: color, borderColor: color }]} onPress={() => setForm({...form, genero: g as import('../../types').Genero})}>
            <Text style={[styles.genderText, form.genero === g ? { color: 'white' } : { color: '#4B5563' }]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>ETAPA / ESTADO</Text>
          <TouchableOpacity style={[styles.selectorBtn, { borderColor: color + '50' }]} onPress={() => abrirSelector('estado', 'Selecciona la Etapa')}>
            <Text style={styles.selectorText} numberOfLines={1}>{form.estado}</Text>
            <ChevronDown color="#9CA3AF" size={20} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 15 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>FIN PRODUCTIVO</Text>
          <TouchableOpacity style={[styles.selectorBtn, { borderColor: color + '50' }]} onPress={() => abrirSelector('fin', 'Selecciona el Fin')}>
            <Text style={styles.selectorText} numberOfLines={1}>{form.fin_productivo}</Text>
            <ChevronDown color="#9CA3AF" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', color: '#4B5563', marginBottom: 8, marginTop: 20, letterSpacing: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, minHeight: 64 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 18, color: '#111827', fontWeight: '700', minHeight: 64 },
  inputSimple: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, borderRadius: 16, fontSize: 18, color: '#111827', fontWeight: '700', borderWidth: 2, minHeight: 64 },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, minHeight: 64 },
  selectorText: { fontSize: 15, color: '#111827', fontWeight: '700', flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  genderContainer: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, minHeight: 64, borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  genderText: { fontSize: 18, fontWeight: '800' },
});