import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Creamos el contexto (El vigilante)
const NetworkContext = createContext({ isConnected: true });

export function NetworkProvider({ children }: any) {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Aquí prendemos el radar. NetInfo nos avisa cada que el internet se va o regresa.
    const unsubscribe = NetInfo.addEventListener(state => {
      // Si state.isConnected es null, asumimos que sí hay red por si las dudas
      setIsConnected(state.isConnected ?? true);
    });

    // Apagamos el radar si la app se cierra
    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

// Esta es la herramienta que usaremos en otras pantallas para preguntar: "¿Hay internet?"
export const useNetwork = () => useContext(NetworkContext);