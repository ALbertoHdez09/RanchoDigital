import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext'; // Verifica que esta ruta sea la correcta en tu estructura
import { ChevronLeft, Info } from 'lucide-react-native';

export default function TestScreen() {
  const router = useRouter();
  const { color } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header simple */}
      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prueba de Ruta</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Info size={80} color={color} style={{ marginBottom: 20 }} />
        <Text style={styles.title}>¡La ruta funciona!</Text>
        <Text style={styles.subtitle}>
          Si puedes ver esta pantalla, significa que Expo Router está trabajando bien. 
          El error de la cámara es por la falta del plugin en app.json.
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: color }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Regresar al Inventario</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    padding: 25, 
    paddingTop: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 30 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#111827', 
    marginBottom: 10 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 24,
    marginBottom: 30
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 3
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});