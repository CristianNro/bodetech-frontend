import { useCallback, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { API } from "../src/api/client";

export default function Wines() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    winery: "",
    varietal: "",
    vintage: "",
    region: "",
    notes: "",
    quantity: "0",
  });

  const [scannedPhotos, setScannedPhotos] = useState([]);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [selectedWine, setSelectedWine] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      setLoading(true);
      const { data } = await API.get("/wines");
      setWines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Error cargando vinos:", error?.response?.data || error?.message);
      setWines([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setForm({ winery: "", varietal: "", vintage: "", region: "", notes: "", quantity: "0" });
    setCreateError("");
    setScannedPhotos([]);
    setCreateModalVisible(true);
  }

  async function addPhoto(fromCamera) {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permiso requerido", "Necesito acceso a la cámara");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ["images"] });
        if (!result.canceled) setScannedPhotos((prev) => [...prev, result.assets[0]]);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permiso requerido", "Necesito acceso a la galería");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ["images"] });
        if (!result.canceled) setScannedPhotos((prev) => [...prev, result.assets[0]]);
      }
    } catch (error) {
      console.log("Error seleccionando foto:", error?.message);
    }
  }

  async function analyzePhotos() {
    if (scannedPhotos.length === 0) return;
    try {
      setAnalyzingPhoto(true);

      const formData = new FormData();
      const isWeb = typeof document !== "undefined";

      for (const asset of scannedPhotos) {
        if (isWeb) {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          formData.append("files", new File([blob], "wine.jpg", { type: asset.mimeType || "image/jpeg" }));
        } else {
          formData.append("files", {
            uri: asset.uri,
            type: asset.mimeType || "image/jpeg",
            name: "wine.jpg",
          });
        }
      }

      const { data } = await API.post("/wines/analyze-photo", formData);

      setForm((prev) => ({
        ...prev,
        winery:   data.winery   ?? prev.winery,
        varietal: data.varietal ?? prev.varietal,
        vintage:  data.vintage != null ? String(data.vintage) : prev.vintage,
        region:   data.region   ?? prev.region,
      }));
    } catch (error) {
      console.log("Error analizando fotos:", error?.response?.data || error?.message);
      Alert.alert("Error", "No se pudo analizar las imágenes");
    } finally {
      setAnalyzingPhoto(false);
    }
  }

  function closeCreateModal() {
    setCreateModalVisible(false);
    setCreateError("");
  }

  async function createWine() {
    if (!form.winery.trim()) {
      setCreateError("La bodega/winery es obligatoria");
      return;
    }
    if (!form.varietal.trim()) {
      setCreateError("La cepa/varietal es obligatoria");
      return;
    }

    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty < 0) {
      setCreateError("La cantidad debe ser un número positivo");
      return;
    }

    const vintage = form.vintage.trim() ? parseInt(form.vintage, 10) : null;
    if (form.vintage.trim() && isNaN(vintage)) {
      setCreateError("El año debe ser un número");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");
      await API.post("/wines", {
        winery: form.winery.trim(),
        varietal: form.varietal.trim(),
        vintage,
        region: form.region.trim() || null,
        notes: form.notes.trim() || null,
        quantity: qty,
      });
      closeCreateModal();
      await load();
    } catch (error) {
      console.log("Error creando vino:", error?.response?.data || error?.message);
      setCreateError("No se pudo crear el vino");
    } finally {
      setCreating(false);
    }
  }

  function openActionsModal(wine) {
    setSelectedWine(wine);
    setConfirmingDelete(false);
    setActionsModalVisible(true);
  }

  function closeActionsModal() {
    setSelectedWine(null);
    setConfirmingDelete(false);
    setActionsModalVisible(false);
  }

  async function deleteWine() {
    if (!selectedWine) return;
    try {
      setDeleting(true);
      await API.delete(`/wines/${selectedWine.wine_id}`);
      closeActionsModal();
      await load();
    } catch (error) {
      console.log("Error eliminando vino:", error?.response?.data || error?.message);
      Alert.alert("Error", "No se pudo eliminar el vino");
    } finally {
      setDeleting(false);
    }
  }

  function vintageLabel(wine) {
    return wine.vintage ? ` · ${wine.vintage}` : "";
  }

  return (
    <LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={styles.container}>
      <View style={styles.contentCard}>
        <View style={styles.topBar}>
          <Text style={styles.sectionTitle}>Mis vinos</Text>
          <TouchableOpacity style={styles.smallCreateButton} onPress={openCreateModal}>
            <Text style={styles.smallCreateText}>＋ Nuevo</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#C6A969" />
            <Text style={styles.stateText}>Cargando vinos...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {wines.length > 0 ? (
              wines.map((wine) => (
                <View key={wine.wine_id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    <View style={styles.iconWrap}>
                      <Text style={styles.iconLetter}>
                        {wine.winery?.charAt(0)?.toUpperCase() || "V"}
                      </Text>
                    </View>
                    <View style={styles.cardTextWrap}>
                      <Text style={styles.cardTitle}>{wine.winery}</Text>
                      <Text style={styles.cardSubtitle}>
                        {wine.varietal}{vintageLabel(wine)}
                        {wine.region ? ` · ${wine.region}` : ""}
                      </Text>
                      <Text style={styles.cardQuantity}>
                        {wine.quantity} {wine.quantity === 1 ? "botella" : "botellas"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => openActionsModal(wine)}
                  >
                    <Text style={styles.menuButtonText}>⋮</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Todavía no tenés vinos</Text>
                <Text style={styles.emptyText}>
                  Agregá vinos a tu catálogo para luego asignarlos a los slots de tus bodegas.
                </Text>
                <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
                  <Text style={styles.createText}>Agregar primer vino</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Modal: Crear vino */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nuevo vino</Text>

              {/* Fotos escaneadas */}
              {scannedPhotos.length > 0 && (
                <View style={styles.photoRow}>
                  {scannedPhotos.map((photo, i) => (
                    <View key={i} style={styles.photoThumbWrap}>
                      <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => setScannedPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Text style={styles.photoRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={() => addPhoto(true)}
                  disabled={analyzingPhoto}
                >
                  <Text style={styles.addPhotoText}>📷 Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={() => addPhoto(false)}
                  disabled={analyzingPhoto}
                >
                  <Text style={styles.addPhotoText}>🖼 Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.analyzeButton,
                    (scannedPhotos.length === 0 || analyzingPhoto) && styles.buttonDisabled,
                  ]}
                  onPress={analyzePhotos}
                  disabled={scannedPhotos.length === 0 || analyzingPhoto}
                >
                  {analyzingPhoto ? (
                    <ActivityIndicator color="#2B0F16" size="small" />
                  ) : (
                    <Text style={styles.analyzeButtonText}>✨ Analizar</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Bodega / Winery *</Text>
              <TextInput
                style={styles.input}
                value={form.winery}
                onChangeText={(t) => setForm((p) => ({ ...p, winery: t }))}
                placeholder="Ej: Zuccardi"
                placeholderTextColor="#A89F97"
              />

              <Text style={styles.fieldLabel}>Cepa / Varietal *</Text>
              <TextInput
                style={styles.input}
                value={form.varietal}
                onChangeText={(t) => setForm((p) => ({ ...p, varietal: t }))}
                placeholder="Ej: Malbec"
                placeholderTextColor="#A89F97"
              />

              <Text style={styles.fieldLabel}>Año / Vintage</Text>
              <TextInput
                style={styles.input}
                value={form.vintage}
                onChangeText={(t) => setForm((p) => ({ ...p, vintage: t }))}
                placeholder="Ej: 2020"
                placeholderTextColor="#A89F97"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Región</Text>
              <TextInput
                style={styles.input}
                value={form.region}
                onChangeText={(t) => setForm((p) => ({ ...p, region: t }))}
                placeholder="Ej: Mendoza"
                placeholderTextColor="#A89F97"
              />

              <Text style={styles.fieldLabel}>Cantidad de botellas</Text>
              <TextInput
                style={styles.input}
                value={form.quantity}
                onChangeText={(t) => setForm((p) => ({ ...p, quantity: t }))}
                placeholder="0"
                placeholderTextColor="#A89F97"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Notas</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.notes}
                onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
                placeholder="Comentarios, maridaje, etc."
                placeholderTextColor="#A89F97"
                multiline
                numberOfLines={3}
              />

              {createError ? <Text style={styles.error}>{createError}</Text> : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButtonNew}
                  onPress={closeCreateModal}
                  disabled={creating}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, creating && styles.buttonDisabled]}
                  onPress={createWine}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#2B0F16" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Crear</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Acciones sobre un vino */}
      <Modal
        visible={actionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeActionsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {confirmingDelete ? (
              <>
                <Text style={styles.modalTitle}>¿Eliminar vino?</Text>
                <Text style={styles.modalSubtitle}>
                  "{selectedWine?.winery} {selectedWine?.varietal}" será eliminado permanentemente.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={deleteWine}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#F5F1E9" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Sí, eliminar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  {selectedWine?.winery}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedWine?.varietal}{selectedWine?.vintage ? ` · ${selectedWine.vintage}` : ""}
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => setConfirmingDelete(true)}
                >
                  <Text style={styles.deleteButtonText}>Eliminar vino</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeActionsModal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  contentCard: {
    flex: 1,
    backgroundColor: "#1f1a1d46",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.25)",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sectionTitle: {
    color: "#F5F1E9",
    fontSize: 18,
    fontWeight: "700",
  },
  smallCreateButton: {
    backgroundColor: "#C6A969",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  smallCreateText: {
    color: "#2B0F16",
    fontWeight: "700",
    fontSize: 14,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stateText: {
    color: "#D7D0C7",
    marginTop: 12,
    fontSize: 15,
  },
  card: {
    backgroundColor: "#2A2226",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(198,169,105,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconLetter: {
    color: "#C6A969",
    fontWeight: "bold",
    fontSize: 18,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    color: "#F5F1E9",
    fontWeight: "700",
  },
  cardSubtitle: {
    marginTop: 2,
    color: "#D7D0C7",
    fontSize: 13,
  },
  cardQuantity: {
    marginTop: 4,
    color: "#C6A969",
    fontSize: 12,
    fontWeight: "600",
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(198,169,105,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonText: {
    color: "#C6A969",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 18,
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#F5F1E9",
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: {
    color: "#D7D0C7",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 290,
    marginBottom: 22,
  },
  createButton: {
    backgroundColor: "#C6A969",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  createText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#2B0F16",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "#1F1A1D",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F5F1E9",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    color: "#C6A969",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  fieldLabel: {
    color: "#C6A969",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#2A2226",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
    color: "#F5F1E9",
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  error: {
    color: "#FF6B6B",
    marginTop: 12,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelButtonNew: {
    flex: 1,
    backgroundColor: "#2A2226",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.2)",
  },
  cancelButton: {
    backgroundColor: "#2A2226",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.2)",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#F5F1E9",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#C6A969",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#2B0F16",
    fontWeight: "bold",
  },
  buttonDisabled: { opacity: 0.6 },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  photoThumbWrap: {
    position: "relative",
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#8B1E2D",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  photoActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  addPhotoButton: {
    flex: 1,
    backgroundColor: "#2A2226",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
  },
  addPhotoText: {
    color: "#C6A969",
    fontWeight: "600",
    fontSize: 13,
  },
  analyzeButton: {
    flex: 1,
    backgroundColor: "#C6A969",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeButtonText: {
    color: "#2B0F16",
    fontWeight: "700",
    fontSize: 13,
  },
  actionButton: {
    backgroundColor: "#2A2226",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.2)",
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: "#8B1E2D",
    borderColor: "rgba(255,255,255,0.08)",
  },
  deleteButtonText: {
    color: "#F5F1E9",
    fontWeight: "bold",
  },
});
