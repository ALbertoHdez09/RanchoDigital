import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({
  color: '#2D5A27',
  updateColor: (newColor: string) => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [color, setColor] = useState('#2D5A27');

  useEffect(() => {
    // 1. Primero intentamos cargar el color local (es súper rápido y no ocupa internet)
    const loadLocalColor = async () => {
      const localColor = await AsyncStorage.getItem('color_preferido');
      if (localColor) setColor(localColor);
    };
    
    loadLocalColor();
    loadUserConfig(); // 2. Luego intentamos sincronizar con la nube silenciosamente
  }, []);

  async function loadUserConfig() {
    try {
      // 🛡️ CAMBIO 1: Usamos getSession en lugar de getUser para no forzar la red
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        const { data } = await supabase
          .from('perfiles')
          .select('color_preferido')
          .eq('id', userId)
          .single();
        
        if (data?.color_preferido) {
          setColor(data.color_preferido);
          // Actualizamos la bodega local por si cambió en otro dispositivo
          await AsyncStorage.setItem('color_preferido', data.color_preferido);
        }
      }
    } catch (error) {
      // Si falla por falta de internet, no pasa nada, ya cargamos el localColor arriba
      console.log("Modo offline: Usando color de caché local.");
    }
  }

  const updateColor = async (newColor: string) => {
    // Actualizamos el estado visual de inmediato
    setColor(newColor);
    
    // Guardamos en la bodega local (para la próxima vez que abra la app)
    await AsyncStorage.setItem('color_preferido', newColor);

    try {
      // 🛡️ CAMBIO 2: Usamos getSession aquí también
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (userId) {
        await supabase.from('perfiles').update({ color_preferido: newColor }).eq('id', userId);
      }
    } catch (error) {
      console.log("Modo offline: No se pudo subir el color a la nube, se queda local.");
    }
  };

  return (
    <ThemeContext.Provider value={{ color, updateColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);