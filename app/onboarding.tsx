import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Package,
    ScanLine, Syringe,
    WifiOff,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    Dimensions, ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icono: React.ReactNode;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  gradiente: [string, string, string];
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icono: <ScanLine color="white" size={64} strokeWidth={1.5} />,
    titulo: 'Escanea el arete,\nconoce al animal',
    subtitulo: 'Identificación instantánea',
    descripcion: 'Apunta la cámara al arete de cualquier animal y en segundos verás su historial médico, peso, genealogía y tratamientos pendientes. Sin buscar en papeles ni en Excel.',
    gradiente: ['#1A3A14', '#2D5A27', '#4A7C59'],
  },
  {
    id: '2',
    icono: <Syringe color="white" size={64} strokeWidth={1.5} />,
    titulo: 'Control médico\ncompleto',
    subtitulo: 'Salud del hato en tu bolsillo',
    descripcion: 'Programa vacunas y tratamientos, recibe notificaciones cuando es hora de aplicarlos y lleva el historial médico de cada animal. La app te avisa qué animal necesita atención hoy.',
    gradiente: ['#1A2A4A', '#1E3A6E', '#2563EB'],
  },
  {
    id: '3',
    icono: <Package color="white" size={64} strokeWidth={1.5} />,
    titulo: 'Inventario que\nse actualiza solo',
    subtitulo: 'Nunca te quedes sin medicamentos',
    descripcion: 'Cuando registras un tratamiento, el inventario de medicamentos se descuenta automáticamente. Te avisamos cuando el stock está por agotarse para que puedas reabastecerte a tiempo.',
    gradiente: ['#3A1A14', '#6E2A1E', '#B45309'],
  },
  {
    id: '4',
    icono: <FileText color="white" size={64} strokeWidth={1.5} />,
    titulo: 'Reportes PDF\nen segundos',
    subtitulo: 'Informes para el patrón',
    descripcion: 'Genera reportes completos de cualquier animal o de todo el hato en el período que necesites. Un toque y el PDF está listo para compartir por WhatsApp o email.',
    gradiente: ['#2A1A3A', '#4A1E6E', '#7C3AED'],
  },
  {
    id: '5',
    icono: <WifiOff color="white" size={64} strokeWidth={1.5} />,
    titulo: 'Funciona sin\ninternet',
    subtitulo: 'Diseñada para el campo',
    descripcion: 'Sin señal en el rancho, sin problema. La app guarda todo en tu celular y sincroniza automáticamente cuando regresas a zona con internet. Siempre disponible, siempre confiable.',
    gradiente: ['#1A3A2A', '#1E6E4A', '#059669'],
  },
];

export default function OnboardingScreen() {
  const router  = useRouter();
  const [indice, setIndice] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const slide = SLIDES[indice];

  async function terminar() {
    await AsyncStorage.setItem('onboarding_completado', 'true');
    // Pequeño delay para asegurar que AsyncStorage se escribió antes de navegar
    setTimeout(() => {
      router.replace('/login');
    }, 50);
  }

  function siguiente() {
    if (indice < SLIDES.length - 1) {
      const nuevoIndice = indice + 1;
      setIndice(nuevoIndice);
      scrollRef.current?.scrollTo({ x: nuevoIndice * width, animated: true });
    } else {
      terminar();
    }
  }

  function anterior() {
    if (indice > 0) {
      const nuevoIndice = indice - 1;
      setIndice(nuevoIndice);
      scrollRef.current?.scrollTo({ x: nuevoIndice * width, animated: true });
    }
  }

  return (
    <LinearGradient colors={slide.gradiente} style={styles.container}>

      {/* Botón saltar arriba a la derecha */}
      <View style={styles.topBar}>
        {indice > 0 ? (
          <TouchableOpacity onPress={anterior} style={styles.topBtn}>
            <ChevronLeft color="rgba(255,255,255,0.8)" size={22} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <TouchableOpacity onPress={terminar} style={styles.saltarBtn}>
          <Text style={styles.saltarText}>Saltar</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido scrolleable horizontal (solo visual, controlado por estado) */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.id} style={styles.slide}>
            {/* Ícono */}
            <View style={styles.iconContainer}>
              {s.icono}
            </View>

            {/* Subtítulo */}
            <Text style={styles.subtitulo}>{s.subtitulo.toUpperCase()}</Text>

            {/* Título */}
            <Text style={styles.titulo}>{s.titulo}</Text>

            {/* Descripción */}
            <Text style={styles.descripcion}>{s.descripcion}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Puntos indicadores */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => {
              setIndice(i);
              scrollRef.current?.scrollTo({ x: i * width, animated: true });
            }}>
              <View style={[styles.dot, i === indice && styles.dotActivo]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Botón siguiente / comenzar */}
        <TouchableOpacity
          onPress={siguiente}
          style={[styles.btnSiguiente, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1.5 }]}
        >
          <Text style={styles.btnSiguienteText}>
            {indice === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Text>
          <ChevronRight color="white" size={20} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 10,
  },
  topBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saltarBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  saltarText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
  },

  slide: {
    width,
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
    justifyContent: 'center',
  },

  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  subtitulo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },

  titulo: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 20,
  },

  descripcion: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
  },

  footer: {
    paddingHorizontal: 32,
    paddingBottom: 52,
    paddingTop: 24,
    gap: 24,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActivo: {
    width: 28,
    backgroundColor: 'white',
  },

  btnSiguiente: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
  },
  btnSiguienteText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
});
