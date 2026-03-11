import * as ImagePicker from "expo-image-picker";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { API } from "../src/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";


export default function ScanWall() {
  const { cellar } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  const [selectedImage, setSelectedImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  var token = null;

  useEffect(() => {
    loadExistingWall();
  }, [cellar]);

  async function loadExistingWall() {
    try {
      if (!cellar) return;

      setLoadingExisting(true);

      token = await AsyncStorage.getItem("access_token");

      const response = await API.get(`/vision/wall/${cellar}/latest`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;

      if (!data?.image) {
        setExistingImageUrl(null);
        setAnalysis(null);
        return;
      }

      if (!data?.image?.image_url) {
        setExistingImageUrl(null);
        setAnalysis(null);
        return;
      }

      const resolvedImageUrl = resolveImageUrl(data.image.image_url);

      console.log("Resolved image URL:", resolvedImageUrl);

      setSelectedImage(null);
      setExistingImageUrl(resolvedImageUrl);

      setAnalysis({
        image_id: data.image.image_id,
        width: data.image.width,
        height: data.image.height,
        status: data.image.status,
        slots_detected: data.slots?.length || 0,
        slots: data.slots || [],
      });
    } catch (error) {
      console.log(
        "Error cargando imagen existente:",
        error?.response?.data || error.message || error
      );
    } finally {
      setLoadingExisting(false);
    }
  }

  function resolveImageUrl(path) {
    if (!path) return null;

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const baseURL = API?.defaults?.baseURL || "";

    if (!baseURL) return path;

    if (path.startsWith("/")) {
      return `${baseURL}${path}`;
    }

    return `${baseURL}/${path}`;
  }

  async function uploadAsset(asset) {
    try {
      if (!cellar) {
        Alert.alert("Error", "No se encontró el ID de la bodega");
        return;
      }

      setSelectedImage(asset);
      setExistingImageUrl(null);
      setAnalysis(null);

      const form = new FormData();
      form.append("cellar_id", String(cellar));

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const file = new File(
          [blob],
          asset.fileName || `wall-${Date.now()}.jpg`,
          { type: asset.mimeType || "image/jpeg" }
        );

        form.append("file", file);
      } else {
        form.append("file", {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: asset.fileName || `wall-${Date.now()}.jpg`,
        });
      }

      const token = await AsyncStorage.getItem("access_token");

      setLoading(true);

      const response = await API.post("/vision/wall/analyze", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("UPLOAD ERROR STATUS:", error?.response?.status);

      console.log(
        "UPLOAD ERROR FULL:",
        JSON.stringify(error?.response?.data, null, 2)
      );

      setAnalysis(response.data);
      Alert.alert("Listo", "La imagen fue analizada correctamente");
    } catch (error) {
      console.log(
        "Error subiendo imagen de pared:",
        error?.response?.data || error.message || error
      );
      Alert.alert("Error", "No se pudo subir la imagen");
    } finally {
      setLoading(false);
    }
  }

  async function scanWithCamera() {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

      if (!cameraPermission.granted) {
        Alert.alert("Permiso requerido", "Necesito permiso para usar la cámara");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ["images"],
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      await uploadAsset(asset);
    } catch (error) {
      console.log(
        "Error escaneando pared con cámara:",
        error?.response?.data || error.message || error
      );
      Alert.alert("Error", "No se pudo tomar la foto");
    }
  }

  async function pickFromGallery() {
    try {
      const mediaPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!mediaPermission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesito permiso para acceder a la galería"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ["images"],
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      await uploadAsset(asset);
    } catch (error) {
      console.log(
        "Error seleccionando imagen de galería:",
        error?.response?.data || error.message || error
      );
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  }

  const previewUri = useMemo(() => {
    return selectedImage?.uri || existingImageUrl || null;
  }, [selectedImage, existingImageUrl]);

  const originalWidth = analysis?.width || selectedImage?.width || 1;
  const originalHeight = analysis?.height || selectedImage?.height || 1;

  const previewHeight =
    previewWidth > 0 ? (originalHeight / originalWidth) * previewWidth : 220;

  const scaleX = previewWidth > 0 ? previewWidth / originalWidth : 1;
  const scaleY = previewHeight > 0 ? previewHeight / originalHeight : 1;

  return (
    <LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Wall</Text>
          <Text style={styles.subtitle}>
            Tomá una foto de la pared de tu bodega o elegí una desde la galería
            para detectar espacios de almacenamiento.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>SW</Text>
          </View>

          <Text style={styles.cardTitle}>Análisis de pared</Text>

          <Text style={styles.cardText}>
            Asegurate de que la pared esté completa dentro del encuadre, con
            buena luz y sin objetos tapando los espacios.
          </Text>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Recomendaciones</Text>
            <Text style={styles.tipText}>• Sacá la foto de frente</Text>
            <Text style={styles.tipText}>• Evitá sombras fuertes</Text>
            <Text style={styles.tipText}>• Mostrá toda la zona de guardado</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || loadingExisting) && styles.buttonDisabled]}
            onPress={scanWithCamera}
            disabled={loading || loadingExisting}
          >
            {loading ? (
              <ActivityIndicator color="#2B0F16" />
            ) : (
              <Text style={styles.buttonText}>Tomar foto</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (loading || loadingExisting) && styles.buttonDisabled,
            ]}
            onPress={pickFromGallery}
            disabled={loading || loadingExisting}
          >
            <Text style={styles.secondaryButtonText}>Elegir de galería</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Después de cargar la imagen, BodeTech intentará detectar los espacios
            disponibles automáticamente.
          </Text>

          {loadingExisting && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#C6A969" />
              <Text style={styles.loadingText}>Cargando imagen existente...</Text>
            </View>
          )}

          {previewUri && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>Vista previa</Text>

              <View
                style={styles.previewWrapper}
                onLayout={(e) => {
                  setPreviewWidth(e.nativeEvent.layout.width);
                }}
              >
                <View
                  style={[
                    styles.previewContainer,
                    { height: previewHeight || 220 },
                  ]}
                >
                  <Image
                    source={{
                      uri: previewUri,
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                    }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />

                  {analysis?.slots?.map((slot) => {
                    const bbox = slot.bbox;
                    if (!bbox) return null;

                    return (
                      <View
                        key={slot.slot_id}
                        style={[
                          styles.slotBox,
                          {
                            left: bbox.x * scaleX,
                            top: bbox.y * scaleY,
                            width: bbox.w * scaleX,
                            height: bbox.h * scaleY,
                          },
                        ]}
                      >
                        <Text style={styles.slotLabel}>
                          {slot.label || `S${slot.slot_index}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {analysis && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Slots detectados: {analysis.slots_detected}
                  </Text>
                  <Text style={styles.infoText}>
                    Estado: {analysis.status}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginTop: 20,
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
    marginBottom: 12,
  },

  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#C6A969",
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

  secondaryButtonText: {
    color: "#C6A969",
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

  loadingBox: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 8,
    color: "#C6A969",
  },

  resultSection: {
    marginTop: 20,
  },

  resultTitle: {
    color: "#F5F1E9",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  previewWrapper: {
    width: "100%",
  },

  previewContainer: {
    width: "100%",
    position: "relative",
    backgroundColor: "#120D0F",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.25)",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },

  slotBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#C6A969",
    backgroundColor: "rgba(198,169,105,0.15)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },

  slotLabel: {
    backgroundColor: "#C6A969",
    color: "#2B0F16",
    fontWeight: "bold",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  infoBox: {
    marginTop: 12,
    backgroundColor: "#2A2226",
    borderRadius: 10,
    padding: 12,
  },

  infoText: {
    color: "#F5F1E9",
    marginBottom: 4,
  },
});