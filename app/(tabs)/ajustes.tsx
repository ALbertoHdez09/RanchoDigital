import { localDB as AsyncStorage } from '../../src/services/localDB';
import { useRouter } from 'expo-router';
import {
    Bell,
    Check,
    ChevronRight,
    Home,
    Image as ImageIcon,
    LogOut,
    Mail,
    MessageCircle,
    Package,
    Plus,
    Save,
    Scale,
    Settings as SettingsIcon,
    Trash2,
    WifiOff,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
    ActivityIndicator,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ModalAlerta from '../../src/components/ModalAlerta';
import { useNetwork } from '../../src/context/NetworkContext';
import { useTheme } from '../../src/context/ThemeContext';
import { guardarCacheLocal, obtenerCacheLocal } from '../../src/services/offlineService';
import { supabase } from '../../src/services/supabase';

// ─── Paleta de colores predefinidos ──────────────────────────────────────────
const OPCIONES_COLORES = [
  '#2D5A27', '#1A365D', '#742A2A',
  '#2D3748', '#B7791F', '#553C9A',
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TipoAlerta = 'exito' | 'error' | 'info';
interface EstadoAlerta { visible: boolean; titulo: string; mensaje: string; tipo: TipoAlerta; }
const alertaInicial: EstadoAlerta = { visible: false, titulo: '', mensaje: '', tipo: 'info' };

// ─── Color Picker personalizado ───────────────────────────────────────────────
function ColorPickerModal({
  visible, colorActual, onConfirm, onClose,
}: { visible: boolean; colorActual: string; onConfirm: (c: string) => void; onClose: () => void }) {
  const [hue, setHue]         = useState(120);   // 0-360
  const [sat, setSat]         = useState(60);    // 0-100
  const [val, setVal]         = useState(35);    // 0-100 (value/brightness)
  const [hexInput, setHexInput] = useState(colorActual);

  // Convertir HSV a HEX
  function hsvToHex(h: number, s: number, v: number): string {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60)       { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  const colorPreview = hsvToHex(hue, sat, val);

  // Sincronizar hexInput cuando cambian los sliders
  React.useEffect(() => {
    setHexInput(colorPreview);
  }, [hue, sat, val]);

  // Barra de tonos (hue)
  const hueStops = Array.from({ length: 12 }, (_, i) => hsvToHex(i * 30, 80, 70));

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={cpStyles.overlay}>
        <TouchableOpacity style={cpStyles.dismiss} onPress={onClose} />
        <View style={cpStyles.sheet}>
          <View style={cpStyles.handle} />
          <Text style={cpStyles.titulo}>Color personalizado</Text>

          {/* Preview */}
          <View style={[cpStyles.preview, { backgroundColor: colorPreview }]} />

          {/* Barra de Hue */}
          <Text style={cpStyles.label}>Tono</Text>
          <View style={cpStyles.hueBar}>
            {hueStops.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[cpStyles.hueStop, { backgroundColor: c }, Math.round(hue / 30) === i && cpStyles.hueStopSelected]}
                onPress={() => setHue(i * 30)}
              />
            ))}
          </View>

          {/* Saturación */}
          <Text style={cpStyles.label}>Saturación: {sat}%</Text>
          <View style={cpStyles.sliderRow}>
            {[0, 20, 40, 60, 80, 100].map(v => (
              <TouchableOpacity
                key={v}
                style={[cpStyles.sliderStop, { backgroundColor: hsvToHex(hue, v, val) }, sat === v && cpStyles.sliderStopSelected]}
                onPress={() => setSat(v)}
              />
            ))}
          </View>

          {/* Brillo */}
          <Text style={cpStyles.label}>Brillo: {val}%</Text>
          <View style={cpStyles.sliderRow}>
            {[10, 25, 40, 55, 70, 85].map(v => (
              <TouchableOpacity
                key={v}
                style={[cpStyles.sliderStop, { backgroundColor: hsvToHex(hue, sat, v) }, val === v && cpStyles.sliderStopSelected]}
                onPress={() => setVal(v)}
              />
            ))}
          </View>

          {/* Input HEX manual */}
          <Text style={cpStyles.label}>HEX manual</Text>
          <TextInput
            style={cpStyles.hexInput}
            value={hexInput}
            onChangeText={setHexInput}
            placeholder="#2D5A27"
            autoCapitalize="characters"
            maxLength={7}
          />

          <TouchableOpacity
            style={[cpStyles.confirmBtn, { backgroundColor: colorPreview }]}
            onPress={() => {
              const final = hexInput.startsWith('#') && hexInput.length === 7 ? hexInput : colorPreview;
              onConfirm(final);
            }}
          >
            <Text style={cpStyles.confirmText}>Aplicar Color</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const cpStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.65)' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 36 },
  handle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  titulo: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 16 },
  preview: { width: '100%', height: 60, borderRadius: 16, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 8, letterSpacing: 1 },
  hueBar: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  hueStop: { flex: 1, height: 32, borderRadius: 8 },
  hueStopSelected: { borderWidth: 3, borderColor: '#111827' },
  sliderRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  sliderStop: { flex: 1, height: 28, borderRadius: 8 },
  sliderStopSelected: { borderWidth: 3, borderColor: '#111827' },
  hexInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  confirmBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  confirmText: { color: 'white', fontSize: 16, fontWeight: '900' },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AjustesScreen() {
  const { color, updateColor } = useTheme();
  const router = useRouter();
  const { isConnected } = useNetwork();

  const [emailUsuario, setEmailUsuario]   = useState('');
  const [nombreRancho, setNombreRancho]   = useState('');
  const [logoUrl, setLogoUrl]             = useState<string | null>(null);
  const [subiendoLogo, setSubiendoLogo]   = useState(false);
  const [notisActivas, setNotisActivas]   = useState(true);
  const [usarLibras, setUsarLibras]       = useState(false);
  const [limiteInventario, setLimiteInventario] = useState('10');
  const [guardando, setGuardando]         = useState(false);
  const [alerta, setAlerta]               = useState<EstadoAlerta>(alertaInicial);
  const [confirmacion, setConfirmacion]   = useState<EstadoAlerta & { onConfirm?: () => void }>(alertaInicial);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  const mostrar = (titulo: string, mensaje: string, tipo: TipoAlerta = 'info') =>
    setAlerta({ visible: true, titulo, mensaje, tipo });

  useEffect(() => {
    fetchPerfil();
    cargarPreferenciasLocales();
  }, [isConnected]);

  async function cargarPreferenciasLocales() {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const libras  = await AsyncStorage.getItem('usar_libras');
    const limite  = await AsyncStorage.getItem('limite_inventario');
    const rancho  = userId ? await AsyncStorage.getItem(`nombre_rancho_${userId}`) : await AsyncStorage.getItem('nombre_rancho');
    const logo    = userId ? await AsyncStorage.getItem(`logo_url_${userId}`) : await AsyncStorage.getItem('logo_url');
    if (libras !== null) setUsarLibras(libras === 'true');
    if (limite !== null) setLimiteInventario(limite);
    if (rancho !== null) setNombreRancho(rancho);
    if (logo   !== null) setLogoUrl(logo);
  }

  async function fetchPerfil() {
    if (!isConnected) {
      const emailCache = await obtenerCacheLocal<string>('perfil_email', true);
      if (emailCache) setEmailUsuario(emailCache);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setEmailUsuario(user.email || '');
        await guardarCacheLocal('perfil_email', user.email || '');
        const { data } = await supabase
          .from('perfiles')
          .select('nombre_rancho, notificaciones_on, logo_url')
          .eq('id', user.id)
          .single();
        if (data) {
          setNombreRancho(data.nombre_rancho || '');
          await AsyncStorage.setItem(`nombre_rancho_${user.id}`, data.nombre_rancho || '');
          setNotisActivas(data.notificaciones_on ?? true);
          if (data.logo_url) {
            setLogoUrl(data.logo_url);
            await AsyncStorage.setItem(`logo_url_${user.id}`, data.logo_url);
          }
        }
      }
    } catch (error) {
      console.log('Error al cargar perfil', error);
    }
  }

  async function guardarCambios() {
    if (!isConnected) {
      mostrar('Modo Offline', 'Necesitas conexión para actualizar los datos del rancho.', 'info');
      return;
    }
    setGuardando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('perfiles')
          .update({ nombre_rancho: nombreRancho, notificaciones_on: notisActivas })
          .eq('id', session.user.id);
        await AsyncStorage.setItem(`nombre_rancho_${session.user.id}`, nombreRancho);
        mostrar('¡Listo, patrón!', 'Los datos del rancho se actualizaron.', 'exito');
      }
    } catch {
      mostrar('Error', 'No se pudieron guardar los cambios.', 'error');
    }
    setGuardando(false);
  }

  async function toggleLibras(val: boolean) {
    setUsarLibras(val);
    await AsyncStorage.setItem('usar_libras', val ? 'true' : 'false');
  }

  async function toggleNotis(val: boolean) {
    setNotisActivas(val);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isConnected) {
        await supabase.from('perfiles').update({ notificaciones_on: val }).eq('id', session.user.id);
      }
    } catch (e) { console.log(e); }
  }

  async function guardarLimiteInventario(val: string) {
    setLimiteInventario(val);
    await AsyncStorage.setItem('limite_inventario', val);
  }

  async function seleccionarLogo() {
    // Import dinámico para evitar crash si el módulo nativo no está listo
    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      mostrar('Permiso denegado', 'Necesitas permitir acceso a la galería.', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setSubiendoLogo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Sin sesión');

      const uri = result.assets[0].uri;
      const fileName = `logo_${userId}.jpg`;
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/logos/${fileName}`;

      const uploadResult = await (await import('expo-file-system/legacy')).uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: (await import('expo-file-system/legacy')).FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Upload HTTP ${uploadResult.status}`);
      }

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`; // cache bust

      setLogoUrl(publicUrl);
      await AsyncStorage.setItem(`logo_url_${userId}`, publicUrl);

      // Guardar en perfil
      await supabase.from('perfiles').update({ logo_url: publicUrl }).eq('id', userId);
      mostrar('¡Logo actualizado!', 'El logo del rancho se guardó correctamente.', 'exito');
    } catch (e: any) {
      mostrar('Error', e.message || 'No se pudo subir el logo.', 'error');
    } finally {
      setSubiendoLogo(false);
    }
  }

  function abrirSoporte() {
    const asunto = encodeURIComponent('Soporte RanchoDigital');
    const cuerpo = encodeURIComponent(`Hola, necesito ayuda con RanchoDigital.\n\nDescribe tu problema aquí:\n\n---\nCorreo de cuenta: ${emailUsuario}`);
    Linking.openURL(`mailto:ranchodigital.desarrollo@gmail.com?subject=${asunto}&body=${cuerpo}`);
  }

  function limpiarCache() {
    setConfirmacion({
      visible: true,
      titulo: 'Limpiar Caché',
      mensaje: 'Esto borrará los datos guardados localmente. Se descargarán de nuevo cuando tengas internet. ¿Continuar?',
      tipo: 'info',
      onConfirm: async () => {
        await AsyncStorage.multiRemove(['animales_cache', 'tareas_cache', 'perfil_email', 'sync_queue']);
        setConfirmacion(alertaInicial);
        mostrar('Caché limpio', 'Los datos locales fueron eliminados.', 'exito');
      },
    });
  }

  function handleLogout() {
    setConfirmacion({
      visible: true,
      titulo: 'Cerrar Sesión',
      mensaje: '¿Estás seguro de que quieres salir?',
      tipo: 'info',
      onConfirm: async () => {
        setConfirmacion(alertaInicial);
        await supabase.auth.signOut();
        router.replace('/login');
      },
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        <View style={[styles.header, { backgroundColor: color }]}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Configuración</Text>
            <SettingsIcon color="white" size={32} />
          </View>
        </View>

        <View style={styles.content}>

          {!isConnected && (
            <View style={styles.offlineBanner}>
              <WifiOff color="#D97706" size={16} />
              <Text style={styles.offlineBannerText}>
                Modo sin conexión — algunos cambios no se guardarán en la nube
              </Text>
            </View>
          )}

          {/* ── MI GANADERÍA ── */}
          <View style={[styles.floatingCard, !isConnected && { marginTop: 16 }]}>
            <Text style={styles.sectionLabel}>MI GANADERÍA</Text>
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Home size={20} color={color} />
              </View>
              <TextInput
                style={styles.input}
                value={nombreRancho}
                onChangeText={setNombreRancho}
                placeholder="Nombre de tu rancho..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={guardarCambios} style={[styles.saveBtn, { backgroundColor: color }]}>
                {guardando
                  ? <ActivityIndicator size="small" color="white" />
                  : <Save size={20} color="white" />}
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
                <Mail size={20} color="#666" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Cuenta vinculada</Text>
                <Text style={styles.infoText}>{emailUsuario || 'Cargando...'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            {/* Logo del rancho */}
            <TouchableOpacity style={styles.logoRow} onPress={seleccionarLogo} disabled={subiendoLogo} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <ImageIcon size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingText}>Logo del Rancho</Text>
                <Text style={styles.settingSubtext}>Aparece en el inicio de la app</Text>
              </View>
              {subiendoLogo
                ? <ActivityIndicator size="small" color={color} />
                : logoUrl
                  ? <Image source={{ uri: logoUrl }} style={styles.logoPreview} cachePolicy="disk" />
                  : <View style={[styles.logoPreview, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
                      <Plus color="#9CA3AF" size={18} />
                    </View>
              }
            </TouchableOpacity>
          </View>

          {/* ── APARIENCIA ── */}
          <Text style={styles.sectionLabelOut}>APARIENCIA DE LA APP</Text>
          <View style={styles.card}>
            <View style={styles.colorPicker}>
              {OPCIONES_COLORES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && { borderWidth: 3, borderColor: '#000', transform: [{ scale: 1.1 }] },
                  ]}
                  onPress={() => updateColor(c)}
                  activeOpacity={0.8}
                >
                  {color === c && <Check size={18} color="white" strokeWidth={3} />}
                </TouchableOpacity>
              ))}
              {/* Botón color personalizado */}
              <TouchableOpacity
                style={[styles.colorCircle, { backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed' }]}
                onPress={() => setColorPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Plus color="#6B7280" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── PREFERENCIAS ── */}
          <Text style={styles.sectionLabelOut}>PREFERENCIAS</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                  <Bell size={20} color={color} />
                </View>
                <Text style={styles.settingText}>Notificaciones de Salud</Text>
              </View>
              <Switch
                value={notisActivas}
                onValueChange={toggleNotis}
                trackColor={{ false: '#E5E7EB', true: color }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Scale size={20} color="#D97706" />
                </View>
                <Text style={styles.settingText}>Peso en Libras (LBS)</Text>
              </View>
              <Switch
                value={usarLibras}
                onValueChange={toggleLibras}
                trackColor={{ false: '#E5E7EB', true: '#D97706' }}
              />
            </View>
          </View>

          {/* ── INVENTARIO ── */}
          <Text style={styles.sectionLabelOut}>INVENTARIO DE MEDICAMENTOS</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Package size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingText}>Límite mínimo de alerta</Text>
                  <Text style={styles.settingSubtext}>Unidades antes de marcar como bajo</Text>
                </View>
              </View>
              <TextInput
                style={[styles.limiteInput, { borderColor: color }]}
                value={limiteInventario}
                onChangeText={guardarLimiteInventario}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>

          {/* ── DATOS ── */}
          <Text style={styles.sectionLabelOut}>DATOS Y ALMACENAMIENTO</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRowBtn} onPress={limpiarCache}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={20} color="#EF4444" />
                </View>
                <View>
                  <Text style={styles.settingText}>Limpiar Caché Local</Text>
                  <Text style={styles.settingSubtext}>Libera espacio y reinicia datos locales</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#CCC" />
            </TouchableOpacity>
          </View>

          {/* ── CUENTA ── */}
          <Text style={styles.sectionLabelOut}>CUENTA Y AYUDA</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRowBtn} onPress={abrirSoporte}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                  <MessageCircle size={20} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.settingText}>Contactar a Soporte</Text>
                  <Text style={styles.settingSubtext}>ranchodigital.desarrollo@gmail.com</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#CCC" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRowBtn} onPress={handleLogout}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <LogOut size={20} color="#EF4444" />
                </View>
                <Text style={[styles.settingText, { color: '#EF4444', fontWeight: '800' }]}>
                  Cerrar Sesión
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>RanchoDigital v1.0.0 • Build Premium</Text>
        </View>
      </ScrollView>

      {/* Color picker personalizado */}
      <ColorPickerModal
        visible={colorPickerVisible}
        colorActual={color}
        onConfirm={(c) => { updateColor(c); setColorPickerVisible(false); }}
        onClose={() => setColorPickerVisible(false)}
      />

      <ModalAlerta
        visible={alerta.visible}
        titulo={alerta.titulo}
        mensaje={alerta.mensaje}
        tipo={alerta.tipo}
        colorTema={color}
        onClose={() => setAlerta(alertaInicial)}
      />

      <ModalAlerta
        visible={confirmacion.visible}
        titulo={confirmacion.titulo}
        mensaje={confirmacion.mensaje}
        tipo={confirmacion.tipo}
        colorTema={color}
        onClose={() => {
          if (confirmacion.onConfirm) confirmacion.onConfirm();
          else setConfirmacion(alertaInicial);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { height: 180, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 60, paddingHorizontal: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, marginTop: 16, marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A' },
  offlineBannerText: { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '700' },
  floatingCard: { backgroundColor: 'white', padding: 20, borderRadius: 25, marginTop: -40, marginBottom: 25, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, borderWidth: 1, borderColor: '#F0F0F0' },
  card: { backgroundColor: 'white', borderRadius: 25, padding: 10, marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: '#F0F0F0' },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#888', marginBottom: 15, letterSpacing: 1 },
  sectionLabelOut: { fontSize: 12, fontWeight: '900', color: '#888', marginBottom: 10, marginLeft: 15, letterSpacing: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 5, marginLeft: 55 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 5 },
  input: { flex: 1, fontSize: 18, fontWeight: '800', color: '#000', paddingVertical: 10 },
  saveBtn: { padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 5, paddingVertical: 5 },
  infoLabel: { fontSize: 12, color: '#888', fontWeight: '700' },
  infoText: { fontSize: 15, color: '#000', fontWeight: '600', marginTop: 2 },
  colorPicker: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, flexWrap: 'wrap', gap: 8 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  settingRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
  settingText: { fontSize: 16, fontWeight: '700', color: '#333' },
  settingSubtext: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  limiteInput: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18, fontWeight: '900', color: '#111827', width: 70, textAlign: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 5, paddingVertical: 8 },
  logoPreview: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  version: { textAlign: 'center', color: '#BBB', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 35 },
});
