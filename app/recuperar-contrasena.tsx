import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/services/supabase';

export default function RecuperarContrasenaScreen() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  async function handleEnviar() {
    if (!email.trim()) { setErrorMsg('Ingresa tu correo electrónico.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMsg('El correo no es válido.'); return; }

    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'ranchodigital://reset-password',
      });
      if (error) throw error;
      setEnviado(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'No se pudo enviar el correo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // Pantalla de confirmación
  if (enviado) {
    return (
      <LinearGradient colors={['#1A3A14', '#2D5A27', '#4A7C59']} style={styles.gradient}>
        <View style={styles.confirmContainer}>
          <View style={styles.confirmIconBox}>
            <CheckCircle2 color="#10B981" size={64} />
          </View>
          <Text style={styles.confirmTitle}>¡Correo enviado!</Text>
          <Text style={styles.confirmMsg}>
            Revisa tu bandeja de entrada en{'\n'}
            <Text style={styles.confirmEmail}>{email}</Text>
          </Text>
          <Text style={styles.confirmSub}>
            Toca el enlace del correo para crear una nueva contraseña. Si no lo ves, revisa tu carpeta de spam.
          </Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.confirmBtnText}>Volver al Login</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A3A14', '#2D5A27', '#4A7C59']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>RD</Text>
            </View>
            <Text style={styles.title}>Recuperar Contraseña</Text>
            <Text style={styles.subtitle}>Te enviaremos un enlace a tu correo</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.cardDesc}>
              Ingresa el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrapper}>
              <Mail color="#9CA3AF" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.sendBtn, loading && styles.btnDisabled]}
              onPress={handleEnviar}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.sendBtnText}>Enviar enlace</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
              <Text style={styles.backLinkText}>
                ¿Recordaste tu contraseña? <Text style={styles.backLinkBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
  backBtn: { position: 'absolute', top: 60, left: 24, padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  logoSection: { alignItems: 'center', marginBottom: 32, marginTop: 40 },
  logoBox: { width: 80, height: 80, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  logoText: { color: 'white', fontSize: 30, fontWeight: '900' },
  title: { fontSize: 26, fontWeight: '900', color: 'white' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 28, padding: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#6B7280', fontWeight: '600', lineHeight: 20, marginBottom: 20 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 16, marginBottom: 20, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '600' },
  sendBtn: { backgroundColor: '#2D5A27', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  sendBtnText: { color: 'white', fontSize: 17, fontWeight: '900' },
  btnDisabled: { opacity: 0.6 },
  backLink: { alignItems: 'center' },
  backLinkText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  backLinkBold: { color: '#2D5A27', fontWeight: '900' },
  // Confirmación
  confirmContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmIconBox: { backgroundColor: 'rgba(255,255,255,0.15)', width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  confirmTitle: { fontSize: 28, fontWeight: '900', color: 'white', marginBottom: 12 },
  confirmMsg: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  confirmEmail: { fontWeight: '900', color: 'white' },
  confirmSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  confirmBtn: { backgroundColor: 'white', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16 },
  confirmBtnText: { color: '#2D5A27', fontSize: 16, fontWeight: '900' },
});
