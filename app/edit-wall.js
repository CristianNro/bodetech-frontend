import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { API, resolveApiUrl } from "../src/api/client";

  function getSlotKey(slot) {
    return slot.slot_id || slot.temp_id;
  }


function mapSlotsToDraft(slots = []) {
  return slots.map((slot) => ({
    slot_id: slot.slot_id || null,
    temp_id: null,
    slot_index: slot.slot_index ?? 0,
    label: slot.label ?? null,
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

function boxesOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function isBBoxInsideImage(bbox, imageWidth, imageHeight) {
  return (
    bbox.x >= 0 &&
    bbox.y >= 0 &&
    bbox.x + bbox.w <= imageWidth &&
    bbox.y + bbox.h <= imageHeight
  );
}

function getInvalidSlotKeys(slots, imageWidth, imageHeight) {
  const invalidKeys = new Set();

  slots.forEach((slot) => {
    if (!isBBoxInsideImage(slot.bbox, imageWidth, imageHeight)) {
      invalidKeys.add(getSlotKey(slot));
    }
  });

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (boxesOverlap(slots[i].bbox, slots[j].bbox)) {
        invalidKeys.add(getSlotKey(slots[i]));
        invalidKeys.add(getSlotKey(slots[j]));
      }
    }
  }

  return invalidKeys;
}

function buildBatchPayload(draftSlots, deletedSlotIds) {
  return {
    slots: draftSlots.map((slot, index) => ({
      ...(slot.slot_id ? { slot_id: slot.slot_id } : { temp_id: slot.temp_id }),
      slot_index: index,
      label: slot.label ?? null,
      bbox: slot.bbox,
      status: slot.status || "empty",
      is_active: slot.is_active ?? true,
      is_user_corrected: true,
    })),
    deleted_slot_ids: deletedSlotIds,
  };
}

function createDefaultSlot(imageWidth, imageHeight, count) {
  const w = Math.max(80, Math.round(imageWidth * 0.16));
  const h = Math.max(140, Math.round(imageHeight * 0.18));
  const x = Math.max(0, Math.round((imageWidth - w) / 2));
  const y = Math.max(0, Math.round((imageHeight - h) / 2));

  return {
    slot_id: null,
    temp_id: `tmp-${Date.now()}-${count}`,
    slot_index: count,
    label: null,
    bbox: { x, y, w, h },
    status: "empty",
    is_active: true,
    is_user_corrected: true,
  };
}

export default function EditWall() {
  const { cellar, imageId } = useLocalSearchParams();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [imageData, setImageData] = useState(null);
  const [draftSlots, setDraftSlots] = useState([]);
  const [deletedSlotIds, setDeletedSlotIds] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const [previewWidth, setPreviewWidth] = useState(0);

  const hasUnsavedChangesRef = useRef(false);

  function markChanged() {
    hasUnsavedChangesRef.current = true;
  }

  function markSaved() {
    hasUnsavedChangesRef.current = false;
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!hasUnsavedChangesRef.current) return;

      e.preventDefault();

      Alert.alert(
        "Cambios sin guardar",
        "Tenés cambios sin guardar. ¿Querés salir de todas formas?",
        [
          { text: "Seguir editando", style: "cancel" },
          {
            text: "Salir sin guardar",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation]);

  const dragRef = useRef({
    slotKey: null,
    startPageX: 0,
    startPageY: 0,
    startBBox: null,
    });
	const resizeRef = useRef({
		slotKey: null,
		corner: null,
		startPageX: 0,
		startPageY: 0,
		startBBox: null,
	});

  useEffect(() => {
    loadImage();
  }, [cellar, imageId]);

  async function loadImage() {
    try {
      setLoading(true);

      const { data } = await API.get(`/vision/wall/${cellar}/images/${imageId}`);

      const nextImage = {
        image_id: data?.image?.image_id,
        image_url: resolveApiUrl(data?.image?.image_url),
        width: data?.image?.width || 1,
        height: data?.image?.height || 1,
        status: data?.image?.status || "unknown",
      };

      const nextDraft = mapSlotsToDraft(data?.slots || []);

      setImageData(nextImage);
      setDraftSlots(nextDraft);
      setDeletedSlotIds([]);
      setSelectedSlotId(nextDraft[0]?.slot_id || nextDraft[0]?.temp_id || null);
      markSaved();
    } catch (error) {
      console.log(
        "Error cargando editor de pared:",
        error?.response?.data || error?.message || error
      );
      Alert.alert("Error", "No se pudo cargar la imagen");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSlot(slot) {
    setSelectedSlotId(getSlotKey(slot));
  }

  function addSlot() {
    if (!imageData) return;

    if (draftSlots.length >= 40) {
      Alert.alert("Límite alcanzado", "No podés tener más de 40 slots");
      return;
    }

    const newSlot = createDefaultSlot(imageData.width, imageData.height, draftSlots.length);

    setDraftSlots((prev) => [...prev, newSlot]);
    setSelectedSlotId(newSlot.temp_id);
    markChanged();
  }

  function deleteSelectedSlot() {
    if (!selectedSlotId) {
      Alert.alert("Seleccioná un slot", "Primero seleccioná un slot para eliminar");
      return;
    }

    const slotToDelete = draftSlots.find((slot) => getSlotKey(slot) === selectedSlotId);
    if (!slotToDelete) return;

    Alert.alert(
      "Eliminar slot",
      "¿Seguro que querés eliminar este slot?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setDraftSlots((prev) =>
              prev.filter((slot) => getSlotKey(slot) !== selectedSlotId)
            );

            if (slotToDelete.slot_id) {
              setDeletedSlotIds((prev) => [...prev, slotToDelete.slot_id]);
            }

            setSelectedSlotId(null);
            markChanged();
          },
        },
      ]
    );
  }

  function startDragging(slot, event) {
		if (resizeRef.current.slotKey) return;
		const slotKey = getSlotKey(slot);

		setSelectedSlotId(slotKey);

		dragRef.current = {
			slotKey,
			startPageX: event.nativeEvent.pageX,
			startPageY: event.nativeEvent.pageY,
			startBBox: { ...slot.bbox },
		};
	}

	function moveDragging(event) {
		if (resizeRef.current.slotKey) return;
		const { slotKey, startPageX, startPageY, startBBox } = dragRef.current;

		if (!slotKey || !startBBox) return;

		const dxPx = event.nativeEvent.pageX - startPageX;
		const dyPx = event.nativeEvent.pageY - startPageY;

		const dx = dxPx / scaleX;
		const dy = dyPx / scaleY;

		markChanged();
		setDraftSlots((prev) =>
			prev.map((slot) => {
				if (getSlotKey(slot) !== slotKey) return slot;

				return {
					...slot,
					bbox: {
						...slot.bbox,
						x: startBBox.x + dx,
						y: startBBox.y + dy,
					},
				};
			})
		);
	}

	function endDragging() {
		dragRef.current = {
			slotKey: null,
			startPageX: 0,
			startPageY: 0,
			startBBox: null,
		};
	}

	function startResizing(slot, corner, event) {
		dragRef.current = {
			slotKey: null,
			startPageX: 0,
			startPageY: 0,
			startBBox: null,
		};

		const slotKey = getSlotKey(slot);

		setSelectedSlotId(slotKey);

		resizeRef.current = {
			slotKey,
			corner,
			startPageX: event.nativeEvent.pageX,
			startPageY: event.nativeEvent.pageY,
			startBBox: { ...slot.bbox },
		};
	}

	function moveResizing(event) {
		const { slotKey, corner, startPageX, startPageY, startBBox } = resizeRef.current;

		if (!slotKey || !corner || !startBBox) return;

		const dxPx = event.nativeEvent.pageX - startPageX;
		const dyPx = event.nativeEvent.pageY - startPageY;

		const dx = dxPx / scaleX;
		const dy = dyPx / scaleY;

		const MIN_W = 30;
		const MIN_H = 30;

		let nextX = startBBox.x;
		let nextY = startBBox.y;
		let nextW = startBBox.w;
		let nextH = startBBox.h;

		if (corner === "tl") {
			nextX = startBBox.x + dx;
			nextY = startBBox.y + dy;
			nextW = startBBox.w - dx;
			nextH = startBBox.h - dy;
		}

		if (corner === "tr") {
			nextY = startBBox.y + dy;
			nextW = startBBox.w + dx;
			nextH = startBBox.h - dy;
		}

		if (corner === "bl") {
			nextX = startBBox.x + dx;
			nextW = startBBox.w - dx;
			nextH = startBBox.h + dy;
		}

		if (corner === "br") {
			nextW = startBBox.w + dx;
			nextH = startBBox.h + dy;
		}

		if (nextW < MIN_W) {
			if (corner === "tl" || corner === "bl") {
				nextX = startBBox.x + (startBBox.w - MIN_W);
			}
			nextW = MIN_W;
		}

		if (nextH < MIN_H) {
			if (corner === "tl" || corner === "tr") {
				nextY = startBBox.y + (startBBox.h - MIN_H);
			}
			nextH = MIN_H;
		}

		markChanged();
		setDraftSlots((prev) =>
			prev.map((slot) => {
				if (getSlotKey(slot) !== slotKey) return slot;

				return {
					...slot,
					bbox: {
						x: nextX,
						y: nextY,
						w: nextW,
						h: nextH,
					},
				};
			})
		);
	}

	function endResizing() {
		resizeRef.current = {
			slotKey: null,
			corner: null,
			startPageX: 0,
			startPageY: 0,
			startBBox: null,
		};
	}


	async function saveChanges() {
		try {
			setSaving(true);

			const payload = buildBatchPayload(draftSlots, deletedSlotIds);

			await API.put(`/vision/wall/${cellar}/images/${imageId}/slots`, payload);

			markSaved();
			Alert.alert("Listo", "Los cambios se guardaron correctamente");
			router.back();
		} catch (error) {
			console.log(
				"Error guardando cambios del editor:",
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

  const originalWidth = imageData?.width || 1;
  const originalHeight = imageData?.height || 1;

  const previewHeight =
    previewWidth > 0 ? (originalHeight / originalWidth) * previewWidth : 220;

  const scaleX = previewWidth > 0 ? previewWidth / originalWidth : 1;
  const scaleY = previewHeight > 0 ? previewHeight / originalHeight : 1;

  const selectedCountLabel = useMemo(() => {
    return selectedSlotId ? "1 seleccionado" : "Sin selección";
  }, [selectedSlotId]);

  const selectedSlot = useMemo(
    () => draftSlots.find((s) => getSlotKey(s) === selectedSlotId) ?? null,
    [draftSlots, selectedSlotId]
  );

  const selectedIndex = useMemo(
    () => draftSlots.findIndex((s) => getSlotKey(s) === selectedSlotId),
    [draftSlots, selectedSlotId]
  );

  const invalidSlotKeys = useMemo(() => {
  if (!imageData) return new Set();

  return getInvalidSlotKeys(
      draftSlots,
      imageData.width,
      imageData.height
  );
  }, [draftSlots, imageData]);
  const hasInvalidSlots = invalidSlotKeys.size > 0;
	const isResizing = resizeRef.current.slotKey !== null;

  if (loading) {
    return (
      <LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color="#C6A969" />
          <Text style={styles.loadingText}>Cargando editor...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#2B0F16", "#4B1E2F"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarButton} onPress={() => router.back()}>
            <Text style={styles.topBarButtonText}>← Volver</Text>
          </TouchableOpacity>

          <Text style={styles.topTitle}>Editor de slots</Text>

          <View style={styles.topBarRight}>
            <Text style={styles.topMeta}>{draftSlots.length} slots</Text>
            <Text style={styles.topMeta}>{selectedCountLabel}</Text>
          </View>
          {hasInvalidSlots && (
            <Text style={styles.invalidWarning}>
                Hay slots inválidos. Corregilos antes de guardar.
            </Text>
            )}
        </View>

        {selectedSlotId && (
          <View style={styles.labelBar}>
            <Text style={styles.labelBarText}>Etiqueta</Text>
            <TextInput
              style={styles.labelInput}
              value={selectedSlot?.label ?? ""}
              onChangeText={(text) => {
                setDraftSlots((prev) =>
                  prev.map((s) =>
                    getSlotKey(s) === selectedSlotId
                      ? { ...s, label: text.slice(0, 20) }
                      : s
                  )
                );
                markChanged();
              }}
              placeholder={selectedIndex >= 0 ? `S${selectedIndex + 1}` : ""}
              placeholderTextColor="#A89F97"
              maxLength={20}
            />
          </View>
        )}

        <View
          style={styles.imageArea}
          onLayout={(e) => {
            setPreviewWidth(e.nativeEvent.layout.width);
          }}
        >
          <View style={[styles.previewContainer, { height: previewHeight || 220 }]}>
            <Image
              source={{ uri: imageData?.image_url }}
              style={styles.previewImage}
              resizeMode="contain"
            />

            {draftSlots.map((slot, index) => {
              const bbox = slot.bbox;
              const slotKey = getSlotKey(slot);
              const isSelected = slotKey === selectedSlotId;

              return (
								<View
									key={slotKey}
									onStartShouldSetResponder={() => !resizeRef.current.slotKey}
									onMoveShouldSetResponder={() => !resizeRef.current.slotKey}
									onResponderGrant={(event) => startDragging(slot, event)}
									onResponderMove={moveDragging}
									onResponderRelease={endDragging}
									onResponderTerminate={endDragging}
									style={[
										styles.slotBox,
										{
											left: bbox.x * scaleX,
											top: bbox.y * scaleY,
											width: bbox.w * scaleX,
											height: bbox.h * scaleY,
										},
										isSelected && styles.slotBoxSelected,
										invalidSlotKeys.has(slotKey) && styles.slotBoxInvalid,
									]}
								>
									<Text
										style={[
											styles.slotLabel,
											isSelected && styles.slotLabelSelected,
											invalidSlotKeys.has(slotKey) && styles.slotLabelInvalid,
										]}
									>
										{slot.label || `S${index + 1}`}
									</Text>

									{isSelected && (
										<>
											<View
												style={[styles.resizeHandle, styles.handleTopLeft]}
												onStartShouldSetResponderCapture={() => true}
												onMoveShouldSetResponderCapture={() => true}
												onResponderGrant={(event) => startResizing(slot, "tl", event)}
												onResponderMove={moveResizing}
												onResponderRelease={endResizing}
												onResponderTerminate={endResizing}
											/>

											<View
												style={[styles.resizeHandle, styles.handleTopRight]}
												onStartShouldSetResponderCapture={() => true}
												onMoveShouldSetResponderCapture={() => true}
												onResponderGrant={(event) => startResizing(slot, "tr", event)}
												onResponderMove={moveResizing}
												onResponderRelease={endResizing}
												onResponderTerminate={endResizing}
											/>

											<View
												style={[styles.resizeHandle, styles.handleBottomLeft]}
												onStartShouldSetResponderCapture={() => true}
												onMoveShouldSetResponderCapture={() => true}
												onResponderGrant={(event) => startResizing(slot, "bl", event)}
												onResponderMove={moveResizing}
												onResponderRelease={endResizing}
												onResponderTerminate={endResizing}
											/>

											<View
												style={[styles.resizeHandle, styles.handleBottomRight]}
												onStartShouldSetResponderCapture={() => true}
												onMoveShouldSetResponderCapture={() => true}
												onResponderGrant={(event) => startResizing(slot, "br", event)}
												onResponderMove={moveResizing}
												onResponderRelease={endResizing}
												onResponderTerminate={endResizing}
											/>
										</>
									)}
								</View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomButtonSecondary, saving && styles.buttonDisabled]}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.bottomButtonSecondaryText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButtonSecondary, saving && styles.buttonDisabled]}
          onPress={deleteSelectedSlot}
          disabled={saving}
        >
          <Text style={styles.bottomButtonSecondaryText}>Eliminar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButtonSecondary, saving && styles.buttonDisabled]}
          onPress={addSlot}
          disabled={saving}
        >
          <Text style={styles.bottomButtonSecondaryText}>Agregar</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[
                styles.bottomButtonPrimary,
                (saving || hasInvalidSlots) && styles.buttonDisabled,
            ]}
            onPress={saveChanges}
            disabled={saving || hasInvalidSlots}
        >
          <Text style={styles.bottomButtonPrimaryText}>
            {saving ? "Guardando..." : "Guardar"}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#C6A969",
    fontSize: 15,
  },

  content: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 14,
    paddingBottom: 110,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },

  topBarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(198,169,105,0.14)",
  },

  topBarButtonText: {
    color: "#F5F1E9",
    fontWeight: "700",
  },

  topTitle: {
    flex: 1,
    color: "#F5F1E9",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  topBarRight: {
    alignItems: "flex-end",
    minWidth: 82,
  },

  topMeta: {
    color: "#C6A969",
    fontSize: 12,
  },

  imageArea: {
    flex: 1,
    justifyContent: "center",
  },

  previewContainer: {
    width: "100%",
    position: "relative",
    backgroundColor: "#120D0F",
    borderRadius: 18,
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
    backgroundColor: "rgba(198,169,105,0.14)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },

  slotBoxSelected: {
		borderColor: "#F5F1E9",
		backgroundColor: "rgba(245,241,233,0.14)",
		borderWidth: 3,
	},
  slotLabel: {
    backgroundColor: "#C6A969",
    color: "#2B0F16",
    fontWeight: "700",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  slotLabelSelected: {
    backgroundColor: "#F5F1E9",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 26,
    backgroundColor: "#161114",
    borderTopWidth: 1,
    borderTopColor: "rgba(198,169,105,0.18)",
  },

  bottomButtonPrimary: {
    flex: 1.15,
    backgroundColor: "#C6A969",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  bottomButtonPrimaryText: {
    color: "#2B0F16",
    fontWeight: "700",
    fontSize: 14,
  },

  bottomButtonSecondary: {
    flex: 1,
    backgroundColor: "#241C20",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.16)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  bottomButtonSecondaryText: {
    color: "#F5F1E9",
    fontWeight: "700",
    fontSize: 13,
  },

  buttonDisabled: {
    opacity: 0.6,
  },
  
  labelBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  labelBarText: {
    color: "#C6A969",
    fontSize: 13,
    fontWeight: "600",
    minWidth: 60,
  },

  labelInput: {
    flex: 1,
    backgroundColor: "#241C20",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#F5F1E9",
    fontSize: 14,
  },

  invalidWarning: {
    color: "#FF8A8A",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  
  slotBoxInvalid: {
    borderColor: "#FF4D4F",
    backgroundColor: "rgba(255, 77, 79, 0.18)",
  },
  
  slotLabelInvalid: {
    backgroundColor: "#FF4D4F",
    color: "#FFF5F5",
  },

	resizeHandle: {
		position: "absolute",
		width: 18,
		height: 18,
		borderRadius: 16,
		backgroundColor: "#F5F1E9",
		borderWidth: 2,
		borderColor: "#2B0F16",
		zIndex: 8,
	},

	handleTopLeft: {
		top: -8,
		left: -8,
	},

	handleTopRight: {
		top: -8,
		right: -8,
	},

	handleBottomLeft: {
		bottom: -8,
		left: -8,
	},

	handleBottomRight: {
		bottom: -8,
		right: -8,
	},
});