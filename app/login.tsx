import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signInWithEmail } from '../src/services/authService';

export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const router = useRouter();

  async function handleEmailLogin() {
    if (!email || !password) { setErrorMsg('Por favor llena todos los campos.'); return; }
    setErrorMsg('');
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    if (error) setErrorMsg(error);
    setLoading(false);
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
            <Text style={styles.subtitle}>Gestión Ganadera Profesional</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenido de vuelta</Text>

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
              />
            </View>

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

            <TouchableOpacity style={styles.loginBtn} onPress={handleEmailLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color="white" />
                : <><LogIn color="white" size={20} /><Text style={styles.loginBtnText}>Iniciar Sesión</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/registro')} style={styles.registerLink}>
              <Text style={styles.registerText}>
                ¿No tienes cuenta? <Text style={styles.registerBold}>Regístrate aquí</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/recuperar-contrasena' as any)} style={styles.forgotLink}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
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
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 90, height: 90, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  logoText: { color: 'white', fontSize: 36, fontWeight: '900' },
  title: { fontSize: 30, fontWeight: '900', color: 'white' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 28, padding: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  cardTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 20, textAlign: 'center' },
  errorBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 16, marginBottom: 14, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '600' },
  eyeBtn: { padding: 4 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D5A27', borderRadius: 16, height: 56, gap: 10, marginTop: 4, marginBottom: 20 },
  loginBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  googleBtn: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  googleText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  btnDisabled: { opacity: 0.6 },
  registerLink: { alignItems: 'center', marginBottom: 12 },
  registerText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  registerBold: { color: '#2D5A27', fontWeight: '900' },
  forgotLink: { alignItems: 'center' },
  forgotText: { color: '#9CA3AF', fontSize: 13, fontWeight: '700' },
});
