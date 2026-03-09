import * as ImagePicker from "expo-image-picker";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { API } from "../src/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";

export default function ScanWall() {
  const { cellar } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  async function scan() {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

      if (!cameraPermission.granted) {
        Alert.alert("Permiso requerido", "Necesito permiso para usar la cámara");
        return;
      }

      if (!cellar) {
        Alert.alert("Error", "No se encontró el ID de la bodega");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      const form = new FormData();
      form.append("cellar_id", String(cellar));
      form.append("file", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || "wall.jpg",
      });

      const token = await AsyncStorage.getItem("access_token");

      setLoading(true);

      const response = await API.post("/vision/wall/analyze", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Wall analysis:", response.data);
      Alert.alert("Listo", "La imagen fue analizada correctamente");
    } catch (error) {
      console.log(
        "Error escaneando pared:",
        error?.response?.data || error.message || error
      );
      Alert.alert("Error", "No se pudo tomar o subir la foto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan Wall</Text>
        <Text style={styles.subtitle}>
          Tomá una foto de la pared de tu bodega para detectar espacios de
          almacenamiento.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>SW</Text>
        </View>

        <Text style={styles.cardTitle}>Análisis de pared</Text>

        <Text style={styles.cardText}>
          Asegurate de que la pared esté completa dentro del encuadre, con buena
          luz y sin objetos tapando los espacios.
        </Text>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Recomendaciones</Text>
          <Text style={styles.tipText}>• Sacá la foto de frente</Text>
          <Text style={styles.tipText}>• Evitá sombras fuertes</Text>
          <Text style={styles.tipText}>• Mostrá toda la zona de guardado</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={scan}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#2B0F16" />
          ) : (
            <Text style={styles.buttonText}>Tomar foto</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helperText}>
          Después de capturar la imagen, BodeTech intentará detectar los espacios
          disponibles automáticamente.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#F5F1E9",
    marginBottom: 8,
  },

  subtitle: {
    color: "#C6A969",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 330,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#1F1A1D",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
  },

  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(198,169,105,0.12)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },

  iconText: {
    color: "#C6A969",
    fontWeight: "bold",
    fontSize: 18,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F5F1E9",
    textAlign: "center",
    marginBottom: 10,
  },

  cardText: {
    color: "#D7D0C7",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 18,
  },

  tipBox: {
    backgroundColor: "#2A2226",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.18)",
  },

  tipTitle: {
    color: "#F5F1E9",
    fontWeight: "700",
    marginBottom: 8,
  },

  tipText: {
    color: "#D7D0C7",
    lineHeight: 20,
    marginBottom: 4,
  },

  button: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#C6A969",
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#2B0F16",
    fontWeight: "bold",
    fontSize: 16,
  },

  helperText: {
    marginTop: 14,
    color: "#C6A969",
    textAlign: "center",
    lineHeight: 20,
    fontSize: 13,
  },
});