import { NetworkProvider, useNetwork } from '@/src/context/NetworkContext';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { localDB as AsyncStorage } from '../src/services/localDB';
import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';
import { supabase } from '../src/services/supabase';
import { sincronizarBuzon } from '../src/services/syncService';


// Banner offline (ya estaba bien, dentro del provider)
function BannerOffline() {
  const { isConnected } = useNetwork();
  if (isConnected) return null;
  return (
    <SafeAreaView style={{ backgroundColor: '#EF4444' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, gap: 8, marginTop: 30 }}>
        <WifiOff color="white" size={20} />
        <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
          Modo Sin Conexión (Datos Locales)
        </Text>
      </View>
    </SafeAreaView>
  );
}

// 🆕 Componente separado para el sync — vive DENTRO del NetworkProvider
function SyncManager() {
  const { isConnected } = useNetwork();
  useEffect(() => {
    if (isConnected) {
      sincronizarBuzon();
    }
  }, [isConnected]);
  return null;
}

// Componente interno que maneja la sesión y navegación
function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [onboardingVisto, setOnboardingVisto] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('onboarding_completado').then(val => {
      setOnboardingVisto(val === 'true');
    });
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!initialized || onboardingVisto === null) return;

    const evaluarNavegacion = async () => {
      const currentSegment = segments[0] as string;
      const pantallasLibres = ['onboarding', 'login', 'registro', 'recuperar-contrasena'];

      let isVisto = onboardingVisto;

      // Mostrar onboarding solo la primera vez — no redirigir si ya está ahí
      if (!isVisto) {
        // Validación asíncrona para evitar regresar al onboarding al darle "saltar" / "comenzar" (race condition)
        const val = await AsyncStorage.getItem('onboarding_completado');
        if (val === 'true') {
          setOnboardingVisto(true);
          isVisto = true;
        }
      }

      if (!isVisto) {
        if (currentSegment !== 'onboarding') {
          router.replace('/onboarding' as any);
        }
        return; // ← importante: no seguir evaluando si onboarding no está visto
      }

      // Con sesión activa en pantalla de login/onboarding → ir al inicio
      if (session && pantallasLibres.includes(currentSegment)) {
        router.replace('/(tabs)' as any);
        return;
      }

      // Sin sesión fuera de pantallas libres → login
      if (!session && !pantallasLibres.includes(currentSegment)) {
        router.replace('/login' as any);
      }
    };
    
    evaluarNavegacion();
  }, [session, initialized, onboardingVisto, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2D5A27" />
      </View>
    );
  }

  return (
    <>
      <BannerOffline />
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="recuperar-contrasena" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="nuevo-animal" options={{ title: 'Nuevo Animal', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

// Root limpio — NetworkProvider envuelve todo correctamente
export default function RootLayout() {
  return (
    <NetworkProvider>
      <ThemeProvider>
        <SyncManager />
        <AppContent />
      </ThemeProvider>
    </NetworkProvider>
  );
}