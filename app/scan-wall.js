import * as ImagePicker from "expo-image-picker";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { API } from "../src/api/client";
import CellarWallImagesGallery from "../components/CellarWallImagesGallery";
import ScanWallUploadCard from "../components/ScanWallUploadCard";

export default function ScanWall() {
  const { cellar } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingSelectedImage, setLoadingSelectedImage] = useState(false);

  const [images, setImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [currentWallData, setCurrentWallData] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftSlots, setDraftSlots] = useState([]);
  const [deletedSlotIds, setDeletedSlotIds] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  const hasImages = images.length > 0;
  const selectedSlots = currentWallData?.slots_detected || 0;
  const selectedStatus = currentWallData?.status || "unknown";
  const displayedSlotsCount = isEditing ? draftSlots.length : selectedSlots;

  useFocusEffect(
    useCallback(() => {
      refreshWallData();
    }, [cellar])
  );

  async function deleteSelectedImage() {
    if (!cellar || !selectedImageId) return;

    Alert.alert(
      "Eliminar imagen",
      "¿Seguro que querés eliminar esta imagen de la bodega?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              await API.delete(`/vision/wall/${cellar}/images/${selectedImageId}`);

              const remainingImages = images.filter(
                (img) => img.image_id !== selectedImageId
              );

              if (remainingImages.length === 0) {
                setImages([]);
                setSelectedImageId(null);
                setCurrentWallData(null);
              } else {
                const nextImageId = remainingImages[0].image_id;
                await refreshWallData(nextImageId);
              }
            } catch (error) {
              console.log(
                "Error eliminando imagen:",
                error?.response?.data || error?.message || error
              );
              Alert.alert(
                "Error",
                error?.response?.data?.detail || "No se pudo eliminar la imagen"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  function mapSlotsToDraft(slots = []) {
    return slots.map((slot) => ({
      slot_id: slot.slot_id || null,
      temp_id: null,
      slot_index: slot.slot_index ?? 0,
      bbox: {
        x: slot?.bbox?.x ?? 0,
        y: slot?.bbox?.y ?? 0,
        w: slot?.bbox?.w ?? 0,
        h: slot?.bbox?.h ?? 0,
      },
      status: slot.status || "empty",
      is_active: slot.is_active ?? true,
      is_user_corrected: true,
    }));
  }

  function resetEditorStateFromImage(slots = []) {
    setDraftSlots(mapSlotsToDraft(slots));
    setDeletedSlotIds([]);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  }

  function buildBatchPayload() {
    return {
      slots: draftSlots.map((slot, index) => ({
        ...(slot.slot_id ? { slot_id: slot.slot_id } : { temp_id: slot.temp_id }),
        slot_index: index,
        bbox: slot.bbox,
        status: slot.status || "empty",
        is_active: slot.is_active ?? true,
        is_user_corrected: true,
      })),
      deleted_slot_ids: deletedSlotIds,
    };
  }

  async function refreshWallData(preferredImageId = null) {
    try {
      if (!cellar) {
        setImages([]);
        setSelectedImageId(null);
        setCurrentWallData(null);
        setUploadModalVisible(false);
        return;
      }

      setLoadingImages(true);

      const { data } = await API.get(`/vision/wall/${cellar}/images`);
      const items = Array.isArray(data?.items) ? data.items : [];

      setImages(items);

      if (items.length === 0) {
        setSelectedImageId(null);
        setCurrentWallData(null);
        setUploadModalVisible(false);
        return;
      }

      const targetImageId =
        preferredImageId && items.some((img) => img.image_id === preferredImageId)
          ? preferredImageId
          : items[0].image_id;

      await loadImageAnalysis(targetImageId);
    } catch (error) {
      console.log(
        "Error cargando imágenes de la bodega:",
        error?.response?.data || error?.message || error
      );
      setImages([]);
      setSelectedImageId(null);
      setCurrentWallData(null);
    } finally {
      setLoadingImages(false);
    }
  }

  async function loadImageAnalysis(imageId) {
    try {
      if (!cellar || !imageId) return;

      setLoadingSelectedImage(true);

      const { data } = await API.get(`/vision/wall/${cellar}/images/${imageId}`);

      const nextWallData = {
        image_id: data?.image?.image_id || imageId,
        width: data?.image?.width || 1,
        height: data?.image?.height || 1,
        status: data?.image?.status || "unknown",
        slots_detected: data?.slots?.length || 0,
        slots: data?.slots || [],
      };

      setSelectedImageId(imageId);
      setCurrentWallData(nextWallData);
      resetEditorStateFromImage(nextWallData.slots);
    } catch (error) {
      console.log(
        "Error cargando análisis de imagen:",
        error?.response?.data || error?.message || error
      );
      Alert.alert("Error", "No se pudo cargar la imagen seleccionada");
    } finally {
      setLoadingSelectedImage(false);
    }
  }

  async function uploadAsset(asset) {
    try {
      if (!cellar) {
        Alert.alert("Error", "No se encontró el ID de la bodega");
        return;
      }

      setLoading(true);

      const form = new FormData();
      form.append("cellar_id", String(cellar));

      if (Platform.OS === "web") {
        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();

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

      const { data } = await API.post("/vision/wall/analyze", form);

      await refreshWallData(data?.image_id || null);
      setUploadModalVisible(false);

      Alert.alert("Listo", "La imagen fue analizada correctamente");
    } catch (error) {
      console.log(
        "Error subiendo imagen de pared:",
        error?.response?.data || error?.message || error
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

      await uploadAsset(result.assets[0]);
    } catch (error) {
      console.log(
        "Error escaneando pared con cámara:",
        error?.response?.data || error?.message || error
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

      await uploadAsset(result.assets[0]);
    } catch (error) {
      console.log(
        "Error seleccionando imagen de galería:",
        error?.response?.data || error?.message || error
      );
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  }

  function startEditing() {
    if (!currentWallData) return;

    setDraftSlots(mapSlotsToDraft(currentWallData.slots || []));
    setDeletedSlotIds([]);
    setHasUnsavedChanges(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    resetEditorStateFromImage(currentWallData?.slots || []);
  }

  async function saveBatchChanges() {
    try {
      if (!cellar || !selectedImageId) {
        Alert.alert("Error", "No hay una imagen seleccionada");
        return;
      }

      setSaving(true);

      const payload = buildBatchPayload();

      const { data } = await API.put(
        `/vision/wall/${cellar}/images/${selectedImageId}/slots`,
        payload
      );

      const updatedWallData = {
        ...currentWallData,
        slots: data?.slots || [],
        slots_detected: data?.slots?.length || 0,
      };

      setCurrentWallData(updatedWallData);
      resetEditorStateFromImage(updatedWallData.slots);

      Alert.alert("Listo", "Los cambios se guardaron correctamente");
    } catch (error) {
      console.log(
        "Error guardando slots batch:",
        error?.response?.data || error?.message || error
      );
      Alert.alert(
        "Error",
        error?.response?.data?.detail || "No se pudieron guardar los cambios"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
          {loadingImages ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#C6A969" />
              <Text style={styles.loadingText}>Cargando imágenes...</Text>
            </View>
          ) : (
            <>
              {hasImages ? (
                <>
                  <CellarWallImagesGallery
                    images={images}
                    selectedImageId={selectedImageId}
                    onSelectImage={loadImageAnalysis}
                    onAddNewPhoto={() => setUploadModalVisible(true)}
                    onDeleteSelectedImage={deleteSelectedImage}
                    loading={loading || loadingSelectedImage}
                  />

                  <View style={styles.editorActions}>
                    {!isEditing ? (
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        onPress={() =>
                          router.push({
                            pathname: "/edit-wall",
                            params: {
                              cellar,
                              imageId: selectedImageId,
                            },
                          })
                        }
                        disabled={loadingSelectedImage || loading || !selectedImageId}
                      >
                        <Text style={styles.primaryActionButtonText}>Editar slots</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.secondaryActionButton, saving && styles.buttonDisabled]}
                          onPress={cancelEditing}
                          disabled={saving}
                        >
                          <Text style={styles.secondaryActionButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.primaryActionButton, saving && styles.buttonDisabled]}
                          onPress={saveBatchChanges}
                          disabled={saving}
                        >
                          <Text style={styles.primaryActionButtonText}>
                            {saving ? "Guardando..." : "Guardar cambios"}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              ) : (
                <ScanWallUploadCard
                  loading={loading}
                  disabled={loadingImages || loadingSelectedImage}
                  onScanWithCamera={scanWithCamera}
                  onPickFromGallery={pickFromGallery}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar nueva imagen</Text>

              <TouchableOpacity
                onPress={() => setUploadModalVisible(false)}
                disabled={loading}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScanWallUploadCard
              loading={loading}
              disabled={loadingImages || loadingSelectedImage}
              onScanWithCamera={scanWithCamera}
              onPickFromGallery={pickFromGallery}
            />
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
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
    backgroundColor: "#161114",
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.24)",
  },

  loadingBox: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },

  loadingText: {
    marginTop: 8,
    color: "#C6A969",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 5, 8, 0.72)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    backgroundColor: "#161114",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.22)",
    padding: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  modalTitle: {
    color: "#F5F1E9",
    fontSize: 18,
    fontWeight: "700",
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#241C20",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: "#C6A969",
    fontSize: 16,
    fontWeight: "700",
  },
  editorActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  primaryActionButton: {
    flex: 1,
    backgroundColor: "#C6A969",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryActionButtonText: {
    color: "#2B0F16",
    fontSize: 14,
    fontWeight: "700",
  },

  secondaryActionButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#C6A969",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  secondaryActionButtonText: {
    color: "#C6A969",
    fontSize: 14,
    fontWeight: "700",
  },
});