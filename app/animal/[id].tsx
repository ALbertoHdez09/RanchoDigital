import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { ChevronLeft, Scale, Info, Syringe, CheckCircle2, Search, ScanLine, Calendar } from 'lucide-react-native';
import { useNetwork } from '../../src/context/NetworkContext';
import { guardarCacheLocal, obtenerCacheLocal } from '../../src/services/offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TabGeneral from '../../src/components/PerfilAnimal/TabGeneral';
import TabPesos from '../../src/components/PerfilAnimal/TabPesos';
import TabSalud from '../../src/components/PerfilAnimal/TabSalud';
import ModalAlerta from '../../src/components/ModalAlerta';
import DatePickerModal from '../../src/components/DatePickerModal';

export default function DetalleAnimal() {
  const { id } = useLocalSearchParams();
  const { color } = useTheme();
  const router = useRouter();
  const { isConnected } = useNetwork(); // Invocamos el radar
  const [activeTab, setActiveTab] = useState<'general' | 'pesos' | 'salud'>('general');
  const [loading, setLoading] = useState(true);
  const [animal, setAnimal] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);
  const [historialSalud, setHistorialSalud] = useState<any[]>([]);
  const [historialPesos, setHistorialPesos] = useState<any[]>([]);
  const [pesoActual, setPesoActual] = useState(0); 
  const [gananciaUltima, setGananciaUltima] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoPeso, setNuevoPeso] = useState('');
  const [guardandoPeso, setGuardandoPeso] = useState(false);
  // NUEVA ALERTA PREMIUM
  const [alerta, setAlerta] = useState({ visible: false, titulo: '', mensaje: '', tipo: 'info' as 'exito' | 'error' | 'info' });
  const [modalPadres, setModalPadres] = useState({ visible: false, tipo: 'padre' as 'padre' | 'madre' });
  const [busquedaArete, setBusquedaArete] = useState('');
  const [buscandoPadre, setBuscandoPadre] = useState(false);
  const [modalOpcionesPariente, setModalOpcionesPariente] = useState<{ visible: boolean; tipo: 'padre' | 'madre' }>({ visible: false, tipo: 'padre' });
  const [animalesLista, setAnimalesLista] = useState<any[]>([]);
  const eraConectado = useRef(isConnected);
  useEffect(() => {
  const reconectando = !eraConectado.current && isConnected;
    eraConectado.current = isConnected;
    if (reconectando && id) {
      // Espera a que el buzón termine de sincronizar antes de recargar
      const timer = setTimeout(() => fetchPerfilCompleto(), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);
  const [modalEditarAnimal, setModalEditarAnimal] = useState(false);
  const [modalEditarFecha, setModalEditarFecha] = useState(false);
  const [modalOpcionesAnimal, setModalOpcionesAnimal] = useState(false);
  const [formEditar, setFormEditar] = useState({ nombre: '', raza: '', estado: '', fin_productivo: '', fecha_nacimiento: '' });
  const [fechaTemp, setFechaTemp] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (id) fetchPerfilCompleto();
    }, [id]) // Solo recarga al enfocar o cambiar id, no en cada cambio de red
  );

  async function fetchPerfilCompleto() {
  try {
    setLoading(true);
    // 🔴 MODO OFFLINE
    if (!isConnected) {
      console.log("Perfil Offline: Cargando desde caché...");
      const cache = await obtenerCacheLocal('animales_cache') || [];
      const ani = cache.find((a: any) => String(a.id) === String(id));
        if (ani) {
          const animalConFamilia = { ...ani };
          if (ani.id_padre) {
            const padre = cache.find((a: any) => String(a.id) === String(ani.id_padre));
            if (padre) animalConFamilia.padre = { id: padre.id, arete_siniiga: padre.arete_siniiga };
          }
          if (ani.id_madre) {
            const madre = cache.find((a: any) => String(a.id) === String(ani.id_madre));
            if (madre) animalConFamilia.madre = { id: madre.id, arete_siniiga: madre.arete_siniiga };
          }
          setAnimal(animalConFamilia);
        } else {
          setAlerta({ visible: true, titulo: 'No encontrado', mensaje: 'Este animal no está en la memoria local.', tipo: 'error' });
        }
      const cacheHistorial = await obtenerCacheLocal(`historial_salud_${id}`) || [];
      setHistorialSalud(cacheHistorial);
      const cachePesos = await obtenerCacheLocal(`pesajes_${id}`) || [];
        setHistorialPesos(cachePesos);
        const pesoIn = parseFloat(ani?.peso_inicial) || 0;
        if (cachePesos.length > 0) {
          setPesoActual(cachePesos[0].peso);
          setGananciaUltima(cachePesos.length > 1
            ? cachePesos[0].peso - cachePesos[1].peso
            : cachePesos[0].peso - pesoIn);
        } else {
          setPesoActual(pesoIn);
          setGananciaUltima(0);
        }
      setLoading(false);
      return;
    }
    // 🟢 MODO ONLINE
    const { data: animalData } = await supabase.from('animales').select('*').eq('id', id).single();
    setAnimal(animalData);
    if (animalData?.id_padre) {
      const { data: padreData } = await supabase.from('animales').select('id, arete_siniiga').eq('id', animalData.id_padre).single();
      if (padreData) animalData.padre = padreData;
    }
    if (animalData?.id_madre) {
      const { data: madreData } = await supabase.from('animales').select('id, arete_siniiga').eq('id', animalData.id_madre).single();
      if (madreData) animalData.madre = madreData;
    }
    setAnimal(animalData);
    const { data: hijosData } = await supabase.from('animales').select('id, arete_siniiga').or(`id_madre.eq.${id},id_padre.eq.${id}`);
    setHijos(hijosData || []);
    const { data: saludData } = await supabase
      .from('dosis_medicas')
      .select(`*, planes_medicos!inner(nombre_plan, animal_id)`)
      .eq('planes_medicos.animal_id', id)
      .order('fecha_programada', { ascending: false });
    setHistorialSalud(saludData || []);
    // 💾 Guardamos para offline
    await guardarCacheLocal(`historial_salud_${id}`, saludData || []);
    const { data: pesosData } = await supabase
      .from('pesajes')
      .select('*')
      .eq('animal_id', id)
      .order('fecha_pesaje', { ascending: false });
    const historial = pesosData || [];
    setHistorialPesos(historial);
    await guardarCacheLocal(`pesajes_${id}`, historial);
    const pesoIn = parseFloat(animalData?.peso_inicial) || 0;
    if (historial.length > 0) {
      setPesoActual(historial[0].peso);
      setGananciaUltima(historial.length > 1 
        ? historial[0].peso - historial[1].peso 
        : historial[0].peso - pesoIn);
    } else {
      setPesoActual(pesoIn);
      setGananciaUltima(0);
    }
  } catch (e) {
    console.log("Error cargando perfil:", e);
  } finally {
    setLoading(false);
  }
}

  const abrirModalPadres = async (tipo: 'padre' | 'madre') => {
    setBusquedaArete('');
    setModalPadres({ visible: true, tipo });
    if (!isConnected) {
      const cache = await obtenerCacheLocal('animales_cache') || [];
      setAnimalesLista(cache.filter((a: any) => String(a.id) !== String(id)));
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const { data } = await supabase
        .from('animales')
        .select('id, arete_siniiga, genero, fecha_nacimiento')
        .eq('user_id', session?.user?.id)
        .neq('id', id);
      setAnimalesLista(data || []);
    }
  };

  const { areteFamiliarEscaneado, tipoFamiliar } = useLocalSearchParams();

  useEffect(() => {
    if (areteFamiliarEscaneado && tipoFamiliar) {
      setBusquedaArete(areteFamiliarEscaneado as string);
      setModalPadres({ visible: true, tipo: tipoFamiliar as 'padre' | 'madre' });
    }
  }, [areteFamiliarEscaneado, tipoFamiliar]);

  async function vincularAnimal(animalData: { id: any; arete_siniiga: string; fecha_nacimiento?: string; genero?: string }) {
    const campoActualizar = modalPadres.tipo === 'padre' ? 'id_padre' : 'id_madre';
    const campoOpuesto = modalPadres.tipo === 'padre' ? 'id_madre' : 'id_padre';

    // Validar: no puede ser el mismo animal
    if (String(animalData.id) === String(id)) {
      setAlerta({ visible: true, titulo: 'No válido', mensaje: 'Un animal no puede ser su propio padre o madre.', tipo: 'error' });
      return;
    }
    // Validar edad: el padre/madre debe ser mayor que el animal
    if (animal?.fecha_nacimiento && animalData.fecha_nacimiento) {
      const nacimientoPadre = new Date(animalData.fecha_nacimiento);
      const nacimientoHijo = new Date(animal.fecha_nacimiento);
      if (nacimientoPadre >= nacimientoHijo) {
        setAlerta({ visible: true, titulo: 'Edad inválida', mensaje: `El ${modalPadres.tipo} debe haber nacido antes que este animal.`, tipo: 'error' });
        return;
      }
      const diferenciaAnios = (nacimientoHijo.getTime() - nacimientoPadre.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (diferenciaAnios < 1) {
        setAlerta({ visible: true, titulo: 'Edad inválida', mensaje: `Debe haber al menos 1 año de diferencia entre el ${modalPadres.tipo} y el animal.`, tipo: 'error' });
        return;
      }
    }
    // Validar: no puede estar ya como el otro pariente
    if (animal && String(animal[campoOpuesto]) === String(animalData.id)) {
      setAlerta({ visible: true, titulo: 'No válido', mensaje: 'Este animal ya está enlazado como el otro pariente.', tipo: 'error' });
      return;
    }

    try {
      if (!isConnected) {
        const cache = await obtenerCacheLocal('animales_cache') || [];
        const idx = cache.findIndex((a: any) => String(a.id) === String(id));
        if (idx !== -1) {
          cache[idx][campoActualizar] = animalData.id;
          await guardarCacheLocal('animales_cache', cache);
        }
        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'animales', datos: { id, [campoActualizar]: animalData.id }, operacion: 'UPDATE' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      } else {
        const { error: updateErr } = await supabase.from('animales').update({ [campoActualizar]: animalData.id }).eq('id', id);
        if (updateErr) throw updateErr;
      }
      setModalPadres({ ...modalPadres, visible: false });
      setAlerta({ visible: true, titulo: '¡Enlazado!', mensaje: `Se agregó a ${animalData.arete_siniiga} correctamente.`, tipo: 'exito' });
      fetchPerfilCompleto();
    } catch (e) {
      setAlerta({ visible: true, titulo: 'Error', mensaje: 'Hubo un problema al enlazar el familiar.', tipo: 'error' });
    }
  }

async function buscarYVincularPadre() {
  if (!busquedaArete) return;
  setBuscandoPadre(true);
  try {
    let data = null;
    if (!isConnected) {
      const cache = await obtenerCacheLocal('animales_cache') || [];
      data = cache.find((a: any) =>
        a.arete_siniiga?.toLowerCase() === busquedaArete.trim().toLowerCase()
      );
    } else {
      const res = await supabase.from('animales').select('id, arete_siniiga')
        .eq('arete_siniiga', busquedaArete.trim()).single();
      data = res.error ? null : res.data;
    }
    if (!data) {
      setAlerta({
        visible: true,
        titulo: 'No encontrado',
        mensaje: 'No tenemos registro de este arete en el corral.',
        tipo: 'error',
      });
      return;
    }
    await vincularAnimal(data);
  } catch (e) {
    setAlerta({ visible: true, titulo: 'Error', mensaje: 'Hubo un problema al enlazar el familiar.', tipo: 'error' });
  } finally {
    setBuscandoPadre(false);
  }
}

  async function desenlazarPadre(tipo: 'padre' | 'madre') {
    const campo = tipo === 'padre' ? 'id_padre' : 'id_madre';
    try {
      if (!isConnected) {
        const cache = await obtenerCacheLocal('animales_cache') || [];
        const idx = cache.findIndex((a: any) => String(a.id) === String(id));
        if (idx !== -1) { cache[idx][campo] = null; await guardarCacheLocal('animales_cache', cache); }
        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'animales', datos: { id, [campo]: null }, operacion: 'UPDATE' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      } else {
        await supabase.from('animales').update({ [campo]: null }).eq('id', id);
      }
      setAlerta({ visible: true, titulo: 'Desenlazado', mensaje: `El ${tipo} fue removido correctamente.`, tipo: 'exito' });
      fetchPerfilCompleto();
    } catch (e) {
      setAlerta({ visible: true, titulo: 'Error', mensaje: 'No se pudo desenlazar.', tipo: 'error' });
    }
  }

  function abrirEditorAnimal() {
  setFormEditar({
    nombre: animal?.nombre || '',
    raza: animal?.raza || '',
    estado: animal?.estado || '',
    fin_productivo: animal?.fin_productivo || '',
    fecha_nacimiento: animal?.fecha_nacimiento || '',
  });
  setModalOpcionesAnimal(false);
  setModalEditarAnimal(true);
}

async function guardarEdicionAnimal() {
  setGuardandoEdicion(true);
  try {
    const cambios = {
      nombre: formEditar.nombre,
      raza: formEditar.raza,
      estado: formEditar.estado,
      fin_productivo: formEditar.fin_productivo,
      fecha_nacimiento: formEditar.fecha_nacimiento || null,
    };
    if (!isConnected) {
      const cache = await obtenerCacheLocal('animales_cache') || [];
      const idx = cache.findIndex((a: any) => String(a.id) === String(id));
      if (idx !== -1) { Object.assign(cache[idx], cambios); await guardarCacheLocal('animales_cache', cache); }
      const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
      queue.push({ tabla: 'animales', datos: { id, ...cambios }, operacion: 'UPDATE' });
      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
    } else {
      const { error } = await supabase.from('animales').update(cambios).eq('id', id);
      if (error) throw error;
    }
    setModalEditarAnimal(false);
    setAlerta({ visible: true, titulo: '¡Actualizado!', mensaje: 'Los datos del animal fueron guardados.', tipo: 'exito' });
    fetchPerfilCompleto();
  } catch (e: any) {
    setAlerta({ visible: true, titulo: 'Error', mensaje: e.message || 'No se pudo guardar.', tipo: 'error' });
  } finally {
    setGuardandoEdicion(false);
  }
}

async function borrarAnimal() {
  setModalOpcionesAnimal(false);
  setConfirmarBorrado(true);
}

async function ejecutarBorradoAnimal() {
  setConfirmarBorrado(false);
  try {
    if (!isConnected) {
      const cache = await obtenerCacheLocal<any[]>('animales_cache', true) ?? [];
      await guardarCacheLocal('animales_cache', cache.filter((a) => String(a.id) !== String(id)));
      // Limpiar caché relacionado
      await AsyncStorage.multiRemove([`pesajes_${id}`, `historial_salud_${id}`]);
      const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
      queue.push({ tabla: 'animales', datos: { id }, operacion: 'DELETE' });
      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
    } else {
      await supabase.from('animales').delete().eq('id', id);
    }
    router.replace('/(tabs)/inventario');
  } catch (e) {
    setAlerta({ visible: true, titulo: 'Error', mensaje: 'No se pudo eliminar el animal.', tipo: 'error' });
  }
}

  async function guardarFecha() {
    await persistirFecha({ fecha_nacimiento: fechaTemp || null });
  }

  async function guardarFechaDirecta(fecha: string) {
    await persistirFecha({ fecha_nacimiento: fecha || null });
  }

  async function persistirFecha(cambios: { fecha_nacimiento: string | null }) {
    try {      if (!isConnected) {
        const cache = await obtenerCacheLocal('animales_cache') || [];
        const idx = cache.findIndex((a: any) => String(a.id) === String(id));
        if (idx !== -1) { Object.assign(cache[idx], cambios); await guardarCacheLocal('animales_cache', cache); }
        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'animales', datos: { id, ...cambios }, operacion: 'UPDATE' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      } else {
        await supabase.from('animales').update(cambios).eq('id', id);
      }
      setModalEditarFecha(false);
      setAlerta({ visible: true, titulo: '¡Guardado!', mensaje: 'Fecha de nacimiento actualizada.', tipo: 'exito' });
      fetchPerfilCompleto();
    } catch (e) {
      setAlerta({ visible: true, titulo: 'Error', mensaje: 'No se pudo guardar la fecha.', tipo: 'error' });
    }
  }
  
  async function cambiarEstadoDosis(dosis_id: string, nuevoEstado: string) {
    try {
      if (!isConnected) {
        const cacheH = await obtenerCacheLocal(`historial_salud_${id}`) || [];
        const updated = cacheH.map((d: any) => String(d.id) === String(dosis_id) ? { ...d, estado: nuevoEstado } : d);
        await guardarCacheLocal(`historial_salud_${id}`, updated);
        setHistorialSalud(updated);
        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'dosis_medicas', datos: { id: dosis_id, estado: nuevoEstado }, operacion: 'UPDATE' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      } else {
        await supabase.from('dosis_medicas').update({ estado: nuevoEstado }).eq('id', dosis_id);
        fetchPerfilCompleto();
      }
      setAlerta({ visible: true, titulo: '¡Actualizado!', mensaje: 'Estado del tratamiento cambiado.', tipo: 'exito' });
    } catch (e) {
      setAlerta({ visible: true, titulo: 'Error', mensaje: 'No se pudo actualizar el estado.', tipo: 'error' });
    }
  }

  async function borrarDosis(dosis_id: string) {
    try {
      if (!isConnected) {
        const cacheH = await obtenerCacheLocal(`historial_salud_${id}`) || [];
        const updated = cacheH.filter((d: any) => String(d.id) !== String(dosis_id));
        await guardarCacheLocal(`historial_salud_${id}`, updated);
        setHistorialSalud(updated);
        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'dosis_medicas', datos: { id: dosis_id }, operacion: 'DELETE' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      } else {
        await supabase.from('dosis_medicas').delete().eq('id', dosis_id);
        fetchPerfilCompleto();
      }
      setAlerta({ visible: true, titulo: 'Eliminado', mensaje: 'Tratamiento eliminado correctamente.', tipo: 'exito' });
    } catch (e) {
      setAlerta({ visible: true, titulo: 'Error', mensaje: 'No se pudo eliminar el tratamiento.', tipo: 'error' });
    }
  }

  async function guardarPesoDB() {
    if (!nuevoPeso || isNaN(Number(nuevoPeso))) {
      setAlerta({ visible: true, titulo: 'Dato Inválido', mensaje: 'Por favor, ingresa un peso numérico válido.', tipo: 'error' });
      return;
    }
    try {
      setGuardandoPeso(true);
      const { data: { session } } = await supabase.auth.getSession();
      const nuevoPesaje = {
        animal_id: id,
        user_id: session?.user?.id,
        peso: parseFloat(nuevoPeso),
        fecha_pesaje: new Date().toISOString(),
      };

      if (!isConnected) {
        // Guardar en cache local
        const cachePesos = await obtenerCacheLocal(`pesajes_${id}`) || [];
        cachePesos.unshift({ ...nuevoPesaje, id: `temp_${Date.now()}` });
        await guardarCacheLocal(`pesajes_${id}`, cachePesos);
        // Agregar al buzón de sincronización
        const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
        queue.push({ tabla: 'pesajes', datos: nuevoPesaje, operacion: 'INSERT' });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));

        setNuevoPeso('');
        setModalVisible(false);
        setAlerta({ visible: true, titulo: '¡Guardado Offline!', mensaje: 'El peso se guardó localmente y se sincronizará al recuperar conexión.', tipo: 'exito' });
        fetchPerfilCompleto();
        return;
      }

      const { error } = await supabase.from('pesajes').insert([nuevoPesaje]);
      if (error) throw error;
      setNuevoPeso('');
      setModalVisible(false);
      setAlerta({ visible: true, titulo: '¡Peso Guardado!', mensaje: 'El registro se añadió al historial con éxito.', tipo: 'exito' });
      fetchPerfilCompleto();
    } catch (e: any) {
      setAlerta({ visible: true, titulo: 'Error', mensaje: e.message || 'No se pudo guardar el peso', tipo: 'error' });
    } finally {
      setGuardandoPeso(false);
    }
  }



  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={color} /></View>;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Vaca: {animal?.arete_siniiga}</Text>
          <Text style={styles.headerSub}>{animal?.raza} • {animal?.genero}</Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'general' && { borderBottomColor: color, borderBottomWidth: 3 }]} onPress={() => setActiveTab('general')}>
          <Info color={activeTab === 'general' ? color : '#9CA3AF'} size={20} />
          <Text style={[styles.tabText, activeTab === 'general' && { color: color, fontWeight: '900' }]}>General</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'pesos' && { borderBottomColor: color, borderBottomWidth: 3 }]} onPress={() => setActiveTab('pesos')}>
          <Scale color={activeTab === 'pesos' ? color : '#9CA3AF'} size={20} />
          <Text style={[styles.tabText, activeTab === 'pesos' && { color: color, fontWeight: '900' }]}>Pesos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'salud' && { borderBottomColor: color, borderBottomWidth: 3 }]} onPress={() => setActiveTab('salud')}>
          <Syringe color={activeTab === 'salud' ? color : '#9CA3AF'} size={20} />
          <Text style={[styles.tabText, activeTab === 'salud' && { color: color, fontWeight: '900' }]}>Salud</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'general' && (
          <TabGeneral
            animal={animal}
            hijos={hijos}
            abrirModalPadres={abrirModalPadres}
            onOpcionesPariente={(tipo: 'padre' | 'madre') => setModalOpcionesPariente({ visible: true, tipo })}
            onOpcionesAnimal={() => setModalOpcionesAnimal(true)}
            onEditarFecha={() => {
              setFechaTemp(animal?.fecha_nacimiento || '');
              setModalEditarFecha(true);
            }}
            onActualizarEtapa={async (nuevaEtapa) => {
              try {
                const cambios = { estado: nuevaEtapa };
                if (!isConnected) {
                  const cache = await obtenerCacheLocal('animales_cache') || [];
                  const idx = cache.findIndex((a: any) => String(a.id) === String(id));
                  if (idx !== -1) { Object.assign(cache[idx], cambios); await guardarCacheLocal('animales_cache', cache); }
                  const queue = JSON.parse(await AsyncStorage.getItem('sync_queue') || '[]');
                  queue.push({ tabla: 'animales', datos: { id, ...cambios }, operacion: 'UPDATE' });
                  await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
                } else {
                  await supabase.from('animales').update(cambios).eq('id', id);
                }
                setAlerta({ visible: true, titulo: '¡Etapa actualizada!', mensaje: `El animal ahora está en etapa: ${nuevaEtapa}`, tipo: 'exito' });
                fetchPerfilCompleto();
              } catch (e) {
                setAlerta({ visible: true, titulo: 'Error', mensaje: 'No se pudo actualizar la etapa.', tipo: 'error' });
              }
            }}
          />
        )}
        {activeTab === 'pesos' && <TabPesos pesoActual={pesoActual} gananciaUltima={gananciaUltima} historialPesos={historialPesos} animal={animal} color={color} setModalVisible={setModalVisible} />}
        {activeTab === 'salud' && (
      <TabSalud
          historialSalud={historialSalud}
          color={color}
          onCambiarEstado={cambiarEstadoDosis}
          onBorrar={borrarDosis}
        />
      )}
      </ScrollView>

      {/* MODALES DEL DIRECTOR DE ORQUESTA */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalVisible(false)} />
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Nuevo Pesaje</Text>
              <Text style={styles.sheetSubtitle}>Ingresa el peso en kilogramos</Text>
              
              <View style={[styles.inputWrapperPesos, { borderColor: color }]}>
                <TextInput style={styles.sheetInput} placeholder="000" keyboardType="numeric" value={nuevoPeso} onChangeText={setNuevoPeso} autoFocus={true} maxLength={5} />
                <Text style={styles.kgText}>KG</Text>
              </View>

              <TouchableOpacity style={[styles.saveModalBtn, { backgroundColor: color, opacity: (!nuevoPeso || guardandoPeso) ? 0.7 : 1 }]} onPress={guardarPesoDB} disabled={guardandoPeso || !nuevoPeso}>
                {guardandoPeso ? <ActivityIndicator color="white" /> : <><CheckCircle2 color="white" size={24} /><Text style={styles.saveModalBtnText}>Guardar Peso</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent visible={modalPadres.visible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalPadres({ ...modalPadres, visible: false })} />
            <View style={[styles.bottomSheet, { maxHeight: '75%' }]}>
              <View style={styles.sheetHandle} />
              <Text style={[styles.sheetTitle, { textAlign: 'left', width: '100%', fontSize: 22 }]}>
                Enlazar {modalPadres.tipo === 'padre' ? 'Toro (Padre)' : 'Vaca (Madre)'}
              </Text>

              <View style={[styles.inputWrapperSearch, { borderColor: color }]}>
                <Search size={22} color={color} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 17, color: '#111827', fontWeight: '700' }}
                  placeholder="Filtrar por arete..."
                  value={busquedaArete}
                  onChangeText={setBusquedaArete}
                  autoCapitalize="characters"
                />
                <TouchableOpacity onPress={() => {
                  setModalPadres({ ...modalPadres, visible: false });
                  router.push({ pathname: '/escaner', params: { origin: modalPadres.tipo, returnPath: '/animal/[id]', animalId: id } });
                }}>
                  <ScanLine color="#4B5563" size={22} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ width: '100%' }} keyboardShouldPersistTaps="handled">
                {animalesLista
                  .filter((a: any) => !busquedaArete || a.arete_siniiga?.toLowerCase().includes(busquedaArete.toLowerCase()))
                  .map((a: any) => (
                    <TouchableOpacity key={a.id} style={styles.animalListItem} onPress={() => vincularAnimal(a)}>
                      <Text style={styles.animalListArete}>{a.arete_siniiga}</Text>
                      {a.genero && <Text style={styles.animalListGenero}>{a.genero}</Text>}
                    </TouchableOpacity>
                  ))
                }
                {animalesLista.filter((a: any) =>
                  !busquedaArete || a.arete_siniiga?.toLowerCase().includes(busquedaArete.toLowerCase())
                ).length === 0 && (
                  <Text style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 20, fontWeight: '600' }}>
                    Sin resultados
                  </Text>
                )}
              </ScrollView>

              {busquedaArete.length > 0 && (
                <TouchableOpacity
                  style={[styles.saveModalBtn, { backgroundColor: color, marginTop: 10 }]}
                  onPress={buscarYVincularPadre}
                  disabled={buscandoPadre}
                >
                  {buscandoPadre
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.saveModalBtnText}>Enlazar "{busquedaArete}"</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL OPCIONES PARIENTE */}
      <Modal animationType="slide" transparent visible={modalOpcionesPariente.visible}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalOpcionesPariente({ ...modalOpcionesPariente, visible: false })} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { fontSize: 20, textAlign: 'left', width: '100%', marginBottom: 4 }]}>
              {modalOpcionesPariente.tipo === 'padre' ? '🐂 Toro (Padre)' : '🐄 Vaca (Madre)'}
            </Text>
            <Text style={{ color: '#6B7280', fontSize: 15, fontWeight: '700', width: '100%', marginBottom: 24 }}>
              {modalOpcionesPariente.tipo === 'padre' ? animal?.padre?.arete_siniiga : animal?.madre?.arete_siniiga}
            </Text>

            <TouchableOpacity
              style={[styles.accionBtn, { borderColor: color }]}
              onPress={() => {
                setModalOpcionesPariente({ ...modalOpcionesPariente, visible: false });
                abrirModalPadres(modalOpcionesPariente.tipo);
              }}
            >
              <Text style={[styles.accionBtnText, { color: color }]}>Cambiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.accionBtn, { borderColor: '#EF4444', marginTop: 10 }]}
              onPress={() => {
                setModalOpcionesPariente({ ...modalOpcionesPariente, visible: false });
                desenlazarPadre(modalOpcionesPariente.tipo);
              }}
            >
              <Text style={[styles.accionBtnText, { color: '#EF4444' }]}>Desenlazar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalOpcionesPariente({ ...modalOpcionesPariente, visible: false })} style={{ marginTop: 15 }}>
              <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* MODAL OPCIONES ANIMAL */}
      <Modal animationType="slide" transparent visible={modalOpcionesAnimal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalOpcionesAnimal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { textAlign: 'left', width: '100%', fontSize: 20, marginBottom: 4 }]}>
              Animal: {animal?.arete_siniiga}
            </Text>
            <Text style={{ color: '#6B7280', fontWeight: '600', width: '100%', marginBottom: 24 }}>{animal?.raza} • {animal?.genero}</Text>

            <TouchableOpacity style={[styles.accionBtn, { borderColor: color }]} onPress={abrirEditorAnimal}>
              <Text style={[styles.accionBtnText, { color: color }]}>Editar Información</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.accionBtn, { borderColor: '#EF4444', marginTop: 10 }]} onPress={borrarAnimal}>
              <Text style={[styles.accionBtnText, { color: '#EF4444' }]}>Eliminar Animal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalOpcionesAnimal(false)} style={{ marginTop: 15 }}>
              <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR ANIMAL */}
      <Modal animationType="slide" transparent visible={modalEditarAnimal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalEditarAnimal(false)} />
            <View style={[styles.bottomSheet, { maxHeight: '80%' }]}>
              <View style={styles.sheetHandle} />
              <Text style={[styles.sheetTitle, { textAlign: 'left', width: '100%', marginBottom: 16 }]}>Editar Animal</Text>
              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Nombre', key: 'nombre', placeholder: 'Nombre del animal' },
                  { label: 'Raza', key: 'raza', placeholder: 'Ej: Brahman, Angus...' },
                  { label: 'Estado', key: 'estado', placeholder: 'Ej: Vientre / Producción' },
                  { label: 'Propósito', key: 'fin_productivo', placeholder: 'Ej: Doble Propósito' },
                  { label: 'Fecha Nac. (AAAA-MM-DD)', key: 'fecha_nacimiento', placeholder: '2022-03-15' },
                ].map(({ label, key, placeholder }) => (
                  <View key={key} style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7280', marginBottom: 6 }}>{label}</Text>
                    <TextInput
                      style={{ borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827', fontWeight: '600', backgroundColor: '#F9FAFB' }}
                      value={(formEditar as any)[key]}
                      onChangeText={(val) => setFormEditar({ ...formEditar, [key]: val })}
                      placeholder={placeholder}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.saveModalBtn, { backgroundColor: color, marginTop: 8, marginBottom: 10 }]}
                  onPress={guardarEdicionAnimal}
                  disabled={guardandoEdicion}
                >
                  {guardandoEdicion ? <ActivityIndicator color="white" /> : <Text style={styles.saveModalBtnText}>Guardar Cambios</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DATE PICKER MODAL — Fecha de nacimiento */}
      <DatePickerModal
        visible={modalEditarFecha}
        valorInicial={fechaTemp}
        color={color}
        onConfirm={(fecha) => { setFechaTemp(fecha); guardarFechaDirecta(fecha); }}
        onClose={() => setModalEditarFecha(false)}
      />

      {/* CONFIRMACIÓN BORRADO */}
      <ModalAlerta
        visible={confirmarBorrado}
        titulo={`Eliminar ${animal?.arete_siniiga}`}
        mensaje="¿Seguro que quieres borrar este animal? Esta acción no se puede deshacer."
        tipo="error"
        colorTema={color}
        onClose={ejecutarBorradoAnimal}
      />

      {/* COMPONENTE DE ALERTA PREMIUM */}
      <ModalAlerta 
        visible={alerta.visible}
        titulo={alerta.titulo}
        mensaje={alerta.mensaje}
        tipo={alerta.tipo}
        colorTema={color}
        onClose={() => setAlerta({ ...alerta, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 8 },
  tabText: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  content: { padding: 20, paddingBottom: 50 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.7)' },
  modalDismissArea: { flex: 1 },
  bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, alignItems: 'center', elevation: 20 },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#D1D5DB', borderRadius: 10, marginBottom: 20 },
  sheetTitle: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 8 },
  sheetSubtitle: { fontSize: 16, color: '#4B5563', fontWeight: '600', marginBottom: 25 },
  inputWrapperPesos: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 2, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#F9FAFB', marginBottom: 25 },
  inputWrapperSearch: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 2, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB', marginBottom: 15, minHeight: 60 },
  sheetInput: { flex: 1, fontSize: 44, fontWeight: '900', color: '#111827', textAlign: 'center' },
  kgText: { fontSize: 20, fontWeight: '900', color: '#9CA3AF', marginLeft: 10 },
  saveModalBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, gap: 10 },
  saveModalBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  scanModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', width: '100%', padding: 16, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  scanModalText: { fontSize: 16, fontWeight: '800', color: '#4B5563' },
  animalListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  animalListArete: { fontSize: 16, fontWeight: '800', color: '#111827' },
  animalListGenero: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  accionBtn: { width: '100%', padding: 18, borderRadius: 16, borderWidth: 2, alignItems: 'center' },
  accionBtnText: { fontSize: 17, fontWeight: '900' },
});