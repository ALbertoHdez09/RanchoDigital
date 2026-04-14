import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../constants/Colors";

interface Props {
  titulo: string;
  onPress: () => void;
  color?: string;
}

export const BotonRudo = ({
  titulo,
  onPress,
  color = COLORS.primary,
}: Props) => {
  return (
    <TouchableOpacity
      style={[styles.boton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.texto}>{titulo.toUpperCase()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  boton: {
    width: "100%",
    height: 70,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  texto: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
