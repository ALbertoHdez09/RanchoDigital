import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';

// Necesario para que el browser se cierre solo al regresar a la app
WebBrowser.maybeCompleteAuthSession();

/**
 * Inicia el flujo OAuth con Google usando Supabase.
 * Retorna { error } si algo falla, o null si todo bien.
 *
 * REQUISITO: En tu proyecto de Supabase → Authentication → Providers → Google,
 * debes tener configurado el Client ID y Secret de Google Cloud Console.
 * El Redirect URI que debes poner en Google Cloud es:
 *   https://<tu-proyecto>.supabase.co/auth/v1/callback
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    // El redirect URI que Supabase espera de vuelta
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'ranchodigital' });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // Nosotros manejamos el browser
      },
    });

    if (error) return { error: error.message };
    if (!data.url) return { error: 'No se obtuvo URL de autenticación' };

    // Abrimos el browser de Google
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type !== 'success') {
      // El usuario cerró el browser sin completar
      return { error: null }; // No es un error real, solo canceló
    }

    // Extraemos los tokens de la URL de retorno
    const url = result.url;
    const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) return { error: 'No se recibió token de acceso' };

    // Establecemos la sesión en Supabase
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    });

    if (sessionError) return { error: sessionError.message };

    return { error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido con Google';
    return { error: msg };
  }
}

/** Login con email y contraseña */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

/** Registro con email, contraseña y nombre de rancho */
export async function signUpWithEmail(
  email: string,
  password: string,
  nombreRancho: string
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre_rancho: nombreRancho },
    },
  });

  if (error) return { error: error.message, needsConfirmation: false };

  if (data.user && data.user.identities?.length === 0) {
    return { error: 'Este correo ya está registrado.', needsConfirmation: false };
  }

  // Crear perfil en la tabla perfiles con el nombre del rancho
  if (data.user) {
    await supabase.from('perfiles').upsert({
      id: data.user.id,
      nombre_rancho: nombreRancho,
      color_preferido: '#2D5A27',
      notificaciones_on: true,
    });
  }

  const needsConfirmation = !data.session;
  return { error: null, needsConfirmation };
}
