import { useCallback, useState } from "react";
import {
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { API } from "../src/api/client";
import { LinearGradient } from "expo-linear-gradient";

export default function Cellars() {
  const [cellars, setCellars] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newCellarName, setNewCellarName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [selectedCellar, setSelectedCellar] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      setLoading(true);

      const { data } = await API.get("/cellars");
      setCellars(Array.isArray(data) ? data : data.cellars || []);
    } catch (error) {
      console.log(
        "Error loading cellars:",
        error?.response?.data || error?.message || error
      );
      setCellars([]);
    } finally {
      setLoading(false);
    }
  }

  async function createCellar() {
    if (!newCellarName.trim()) {
      setCreateError("Debes ingresar un nombre para la bodega");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      await API.post("/cellars", {
        name: newCellarName.trim(),
      });

      setModalVisible(false);
      setNewCellarName("");
      await load();
    } catch (error) {
      console.log(
        "Error creating cellar:",
        error?.response?.data || error?.message || error
      );
      setCreateError("No se pudo crear la bodega");
    } finally {
      setCreating(false);
    }
  }

  function closeModal() {
    setModalVisible(false);
    setNewCellarName("");
    setCreateError("");
  }

  function openActionsModal(cellar) {
    setSelectedCellar(cellar);
    setActionsModalVisible(true);
  }

  function closeActionsModal() {
    setSelectedCellar(null);
    setActionsModalVisible(false);
    setConfirmingDelete(false);
  }

  function confirmDeleteCellar() {
    if (!selectedCellar?.cellar_id) return;
    setConfirmingDelete(true);
  }

  async function deleteSelectedCellar(cellar) {
    if (!cellar?.cellar_id) return;

    try {
      setDeleting(true);

      await API.delete(`/cellars/${cellar.cellar_id}`);

      closeActionsModal();
      await load();
    } catch (error) {
      console.log(
        "Error deleting cellar:",
        error?.response?.data || error?.message || error
      );
      Alert.alert("Error", "No se pudo eliminar la bodega");
    } finally {
      setDeleting(false);
    }
  }


  return (
    <LinearGradient
      colors={["#2B0F16", "#4B1E2F"]}
      style={styles.container}
    >

      <View style={styles.contentCard}>
        <View style={styles.topBar}>
          <Text style={styles.sectionTitle}>Tus bodegas</Text>

          <View style={styles.topBarActions}>
            <Pressable
              style={styles.smallSecondaryButton}
              onPress={() => router.push("/wines")}
            >
              <Text style={styles.smallSecondaryText}>🍷 Vinos</Text>
            </Pressable>

            <Pressable
              style={styles.smallCreateButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.smallCreateText}>＋ Nueva</Text>
            </Pressable>
          </View>
        </View>


        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#C6A969" />
            <Text style={styles.stateText}>Cargando bodegas...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {cellars.length > 0 ? (
              cellars.map((c, index) => (
                <Pressable
                  key={c.cellar_id}
                  style={styles.card}
                  onPress={() => router.push(`/scan-wall?cellar=${c.cellar_id}`)}
                >
                  <View style={styles.cardLeft}>
                    <View style={styles.iconWrap}>
                      <Text style={styles.iconLetter}>
                        {c.name?.charAt(0)?.toUpperCase() || "C"}
                      </Text>
                    </View>

                    <View style={styles.cardTextWrap}>
                      <Text style={styles.cardTitle}>{c.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        Bodega #{index + 1}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardRight}>

                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => openActionsModal(c)}
                    >
                      <Text style={styles.menuButtonText}>⋮</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Todavía no tenés bodegas</Text>
                <Text style={styles.emptyText}>
                  Creá tu primera bodega para empezar a cargar espacios, detectar
                  paredes y organizar tu inventario.
                </Text>

                <Pressable
                  style={styles.createButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.createText}>Crear primera bodega</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva bodega</Text>
            <Text style={styles.modalSubtitle}>
              Ingresá un nombre para crear una nueva bodega.
            </Text>

            <TextInput
              placeholder="Ej: Bodega principal"
              placeholderTextColor="#A89F97"
              style={styles.input}
              value={newCellarName}
              onChangeText={(text) => {
                setNewCellarName(text);
                setCreateError("");
              }}
              onSubmitEditing={createCellar}
              returnKeyType="done"
            />

            {createError ? (
              <Text style={styles.error}>{createError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButtonNew}
                onPress={closeModal}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, creating && styles.buttonDisabled]}
                onPress={createCellar}
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
        </View>
      </Modal>

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
                <Text style={styles.modalTitle}>¿Eliminar bodega?</Text>
                <Text style={styles.modalSubtitle}>
                  "{selectedCellar?.name}" será eliminada permanentemente. Esta acción no se puede deshacer.
                </Text>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteSelectedCellar(selectedCellar)}
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
                <Text style={styles.modalTitle}>{selectedCellar?.name || "Bodega"}</Text>
                <Text style={styles.modalSubtitle}>
                  Seleccioná una acción
                </Text>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    const id = selectedCellar?.cellar_id;
                    closeActionsModal();
                    if (id) {
                      router.push(`/scan-wall?cellar=${id}`);
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>Abrir bodega</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={confirmDeleteCellar}
                >
                  <Text style={styles.deleteButtonText}>Eliminar bodega</Text>
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
    paddingTop: 60
  },

  header: {
    marginTop: 20,
    marginBottom: 22,
    alignItems: "center",
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#F5F1E9",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#C6A969",
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 22,
  },

  contentCard: {
    flex: 1,
    width: "100%",
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

  topBarActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  smallSecondaryButton: {
    backgroundColor: "rgba(198,169,105,0.14)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
  },

  smallSecondaryText: {
    color: "#C6A969",
    fontWeight: "600",
    fontSize: 13,
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

  scroll: {
    flex: 1,
    width: "100%",
  },

  scrollContent: {
    paddingBottom: 12,
  },

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

  cardTextWrap: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 17,
    color: "#F5F1E9",
    fontWeight: "700",
  },

  cardSubtitle: {
    marginTop: 4,
    color: "#D7D0C7",
    fontSize: 13,
  },

  cardAction: {
    color: "#C6A969",
    fontWeight: "700",
    marginLeft: 12,
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
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1F1A1D",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F5F1E9",
    textAlign: "center",
    marginBottom: 8,
  },

  modalSubtitle: {
    color: "#C6A969",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },

  input: {
    backgroundColor: "#2A2226",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
    color: "#F5F1E9",
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

  cancelButton: {
    backgroundColor: "#2A2226",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.2)",
    marginTop: 10,
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

  cancelButtonText: {
    color: "#F5F1E9",
    fontWeight: "600",
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

  buttonDisabled: {
    opacity: 0.6,
  },

  cardRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 12,
  },

  menuButton: {
    marginTop: 8,
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

  actionButton: {
    backgroundColor: "#2A2226",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.2)",
    marginTop: 10,
  },

  actionButtonText: {
    color: "#F5F1E9",
    fontWeight: "600",
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