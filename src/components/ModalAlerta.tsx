// src/components/ModalAlerta.tsx
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';

interface ModalAlertaProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error' | 'info';
  colorTema: string;
  onClose: () => void;
}

export default function ModalAlerta({ visible, titulo, mensaje, tipo, colorTema, onClose }: ModalAlertaProps) {
  
  // Dependiendo del tipo, elegimos el ícono y el color
  const getIcon = () => {
    switch (tipo) {
      case 'exito': return <CheckCircle2 color="#10B981" size={50} />; // Verde chido
      case 'error': return <AlertTriangle color="#EF4444" size={50} />; // Rojo peligro
      default: return <Info color={colorTema} size={50} />;
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          
          <Text style={styles.title}>{titulo}</Text>
          <Text style={styles.message}>{mensaje}</Text>
          
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: tipo === 'error' ? '#EF4444' : colorTema }]} 
            onPress={onClose}
          >
            <Text style={styles.btnText}>Entendido</Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)', // Fondo oscurecido
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  }
});