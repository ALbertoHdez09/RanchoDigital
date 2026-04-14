import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus, Mail, Lock, Eye, EyeOff, Home, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail } from '../src/services/authService';

export default function RegistroScreen() {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombreRancho, setNombreRancho]     = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');
  const [confirmacionEnviada, setConfirmacionEnviada] = useState(false);
  const router = useRouter();

  function validar(): string | null {
    if (!email || !password || !confirmPassword || !nombreRancho) return 'Llena todos los campos.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El correo no es válido.';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(password)) return 'La contraseña debe tener al menos una mayúscula.';
    if (!/[a-z]/.test(password)) return 'La contraseña debe tener al menos una minúscula.';
    if (!/[0-9]/.test(password)) return 'La contraseña debe tener al menos un número.';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  async function handleSignUp() {
    const err = validar();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    setLoading(true);
    const { error, needsConfirmation } = await signUpWithEmail(email, password, nombreRancho);
    if (error) {
      setErrorMsg(error);
    } else if (needsConfirmation) {
      setConfirmacionEnviada(true);
    } else {
      // Sesión activa de inmediato (sin confirmación de email)
      router.replace('/(tabs)' as any);
    }
    setLoading(false);
  }

  // Pantalla de confirmación enviada
  if (confirmacionEnviada) {
    return (
      <LinearGradient colors={['#1A3A14', '#2D5A27', '#4A7C59']} style={styles.gradient}>
        <View style={styles.confirmContainer}>
          <View style={styles.confirmIconBox}>
            <CheckCircle2 color="#10B981" size={64} />
          </View>
          <Text style={styles.confirmTitle}>¡Revisa tu correo!</Text>
          <Text style={styles.confirmMsg}>
            Te enviamos un enlace de confirmación a{'\n'}
            <Text style={styles.confirmEmail}>{email}</Text>
          </Text>
          <Text style={styles.confirmSub}>
            Una vez que confirmes tu cuenta, podrás iniciar sesión.
          </Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.confirmBtnText}>Ir al Login</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A3A14', '#2D5A27', '#4A7C59']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>RD</Text>
            </View>
            <Text style={styles.title}>Rancho Digital</Text>
            <Text style={styles.subtitle}>Crea tu cuenta ganadera</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nuevo Registro</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Nombre del rancho */}
            <View style={styles.inputWrapper}>
              <Home color="#9CA3AF" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de tu rancho"
                value={nombreRancho}
                onChangeText={setNombreRancho}
                autoCapitalize="words"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Email */}
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
              />
            </View>

            {/* Contraseña */}
            <View style={styles.inputWrapper}>
              <Lock color="#9CA3AF" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
              </TouchableOpacity>
            </View>

            {/* Indicadores de requisitos */}
            {password.length > 0 && (
              <View style={styles.requisitosBox}>
                {[
                  { ok: password.length >= 8,    texto: 'Mínimo 8 caracteres' },
                  { ok: /[A-Z]/.test(password),  texto: 'Una mayúscula' },
                  { ok: /[a-z]/.test(password),  texto: 'Una minúscula' },
                  { ok: /[0-9]/.test(password),  texto: 'Un número' },
                ].map(({ ok, texto }) => (
                  <View key={texto} style={styles.requisitoRow}>
                    <View style={[styles.requisitoDot, { backgroundColor: ok ? '#10B981' : '#D1D5DB' }]} />
                    <Text style={[styles.requisitoText, { color: ok ? '#10B981' : '#9CA3AF' }]}>{texto}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Confirmar contraseña */}
            <View style={[
              styles.inputWrapper,
              confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
            ]}>
              <Lock color="#9CA3AF" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                {showConfirm ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.matchError}>Las contraseñas no coinciden</Text>
            )}

            <TouchableOpacity
              style={[styles.registerBtn, loading && styles.btnDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <><UserPlus color="white" size={20} /><Text style={styles.registerBtnText}>Crear Cuenta</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginLink}>
              <Text style={styles.loginText}>
                ¿Ya tienes cuenta? <Text style={styles.loginBold}>Inicia sesión</Text>
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

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 90, height: 90, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  logoText: { color: 'white', fontSize: 36, fontWeight: '900' },
  title: { fontSize: 30, fontWeight: '900', color: 'white' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },

  // Card
  card: { backgroundColor: 'white', borderRadius: 28, padding: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  cardTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 20, textAlign: 'center' },

  // Error
  errorBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  matchError: { color: '#DC2626', fontSize: 12, fontWeight: '700', marginTop: -10, marginBottom: 10, marginLeft: 4 },

  // Inputs
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 16, marginBottom: 14, height: 56 },
  inputError: { borderColor: '#EF4444' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '600' },
  eyeBtn: { padding: 4 },

  // Botones
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D5A27', borderRadius: 16, height: 56, gap: 10, marginTop: 4, marginBottom: 20 },
  registerBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  btnDisabled: { opacity: 0.6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  googleBtn: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  googleText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  loginLink: { alignItems: 'center' },
  loginText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  loginBold: { color: '#2D5A27', fontWeight: '900' },
  requisitosBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -8, marginBottom: 12, paddingHorizontal: 4 },
  requisitoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  requisitoDot: { width: 7, height: 7, borderRadius: 4 },
  requisitoText: { fontSize: 11, fontWeight: '700' },

  // Pantalla de confirmación
  confirmContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmIconBox: { backgroundColor: 'rgba(255,255,255,0.15)', width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  confirmTitle: { fontSize: 28, fontWeight: '900', color: 'white', marginBottom: 12 },
  confirmMsg: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  confirmEmail: { fontWeight: '900', color: 'white' },
  confirmSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32 },
  confirmBtn: { backgroundColor: 'white', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16 },
  confirmBtnText: { color: '#2D5A27', fontSize: 16, fontWeight: '900' },
});
