import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { resolveApiUrl } from "../src/api/client";

function formatDate(value) {
  if (!value) return "Sin fecha";

  try {
    return new Date(value).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function CellarWallImagesGallery({
  images = [],
  selectedImageId,
  onSelectImage,
  onAddNewPhoto,
  onDeleteSelectedImage,
  loading = false,
}) {
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [containerWidth, setContainerWidth] = useState(0);
  const [trackWidth, setTrackWidth] = useState(1);
  const [hasAutoCentered, setHasAutoCentered] = useState(false);

  const selectedIndex = useMemo(() => {
    const idx = images.findIndex((img) => img.image_id === selectedImageId);
    return idx >= 0 ? idx : 0;
  }, [images, selectedImageId]);
  const lastCenteredIndexRef = useRef(selectedIndex);

  const safeContainerWidth = containerWidth || 320;
  const CARD_WIDTH = Math.min(safeContainerWidth * 0.88, 360);
  const CARD_SPACING = 10;
  const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;
  const SIDE_PADDING = Math.max((safeContainerWidth - CARD_WIDTH) / 2, 0);

  useEffect(() => {
    if (!images.length) return;
    setHasAutoCentered(false);
  }, [images, containerWidth]);

  useEffect(() => {
    lastCenteredIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    if (!images.length || hasAutoCentered || containerWidth === 0) return;

    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: selectedIndex * SNAP_INTERVAL,
        animated: false,
      });
      setHasAutoCentered(true);
    }, 60);

    return () => clearTimeout(timeout);
  }, [images, selectedIndex, SNAP_INTERVAL, hasAutoCentered, containerWidth]);

  function getIndexFromOffset(offsetX) {
    const index = Math.round(offsetX / SNAP_INTERVAL);
    return Math.max(0, Math.min(index, images.length - 1));
  }

  function getIndexFromDrag(offsetX) {
    // Snap at 25% of card width (vs default 50%) for more responsive feel
    const fraction = offsetX / SNAP_INTERVAL;
    const current = lastCenteredIndexRef.current;
    if (fraction >= current + 0.15) return Math.min(images.length - 1, current + 1);
    if (fraction <= current - 0.15) return Math.max(0, current - 1);
    return current;
  }

  function handleMomentumEnd(event) {
    // snapToInterval already corrected the position — only sync state
    const safeIndex = getIndexFromOffset(event.nativeEvent.contentOffset.x);
    const centeredImage = images[safeIndex];
    if (centeredImage && centeredImage.image_id !== selectedImageId) {
      onSelectImage?.(centeredImage.image_id);
    }
  }

  function handleScrollEndDrag(event) {
    // Slow drag with no momentum: snapToInterval won't fire, snap manually
    const safeIndex = getIndexFromDrag(event.nativeEvent.contentOffset.x);
    flatListRef.current?.scrollToOffset({
      offset: safeIndex * SNAP_INTERVAL,
      animated: true,
    });
    const centeredImage = images[safeIndex];
    if (centeredImage && centeredImage.image_id !== selectedImageId) {
      onSelectImage?.(centeredImage.image_id);
    }
  }

  function updateCenteredImageFromOffset(offsetX) {
    const index = Math.round(offsetX / SNAP_INTERVAL);
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));

    if (lastCenteredIndexRef.current !== safeIndex) {
      lastCenteredIndexRef.current = safeIndex;
      const centeredImage = images[safeIndex];

      if (centeredImage && centeredImage.image_id !== selectedImageId) {
        onSelectImage?.(centeredImage.image_id);
      }
    }
  }

  function scrollToIndex(index) {
    flatListRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });

    const image = images[index];
    if (image && image.image_id !== selectedImageId) {
      onSelectImage?.(image.image_id);
    }
  }

  const visibleTrackWidth = Math.max(trackWidth, 1);
  const thumbWidth =
    images.length > 0
      ? Math.max(visibleTrackWidth / images.length, 36)
      : visibleTrackWidth;

  const maxScrollOffset = Math.max((images.length - 1) * SNAP_INTERVAL, 1);
  const maxThumbTranslate = Math.max(visibleTrackWidth - thumbWidth, 0);

  const thumbTranslateX = scrollX.interpolate({
    inputRange: [0, maxScrollOffset],
    outputRange: [0, maxThumbTranslate],
    extrapolate: "clamp",
  });

  function renderItem({ item, index }) {
    const isSelected = item.image_id === selectedImageId;
    const thumbnailUri = resolveApiUrl(item.image_url);

    return (
      <TouchableOpacity
        activeOpacity={0.94}
        onPress={() => scrollToIndex(index)}
        disabled={loading}
        style={[
          styles.card,
          {
            width: CARD_WIDTH,
            marginRight: CARD_SPACING,
            transform: [{ scale: isSelected ? 1 : 0.9 }],
            opacity: isSelected ? 1 : 0.58,
          },
          isSelected && styles.cardSelected,
        ]}
      >
        <View style={[styles.thumbWrapper, isSelected && styles.thumbWrapperSelected]}>
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={styles.thumbPlaceholderText}>Sin imagen</Text>
            </View>
          )}

          <View style={styles.overlay} />

          {isSelected && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Seleccionada</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        if (width && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextBox}>
          <Text style={styles.title}>Fotos de la bodega</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.buttonDisabled]}
            onPress={onDeleteSelectedImage}
            disabled={loading || !selectedImageId}
          >
            <Text style={styles.deleteButtonText}>Eliminar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, loading && styles.buttonDisabled]}
            onPress={onAddNewPhoto}
            disabled={loading}
          >
            <Text style={styles.addButtonText}>+ Nueva</Text>
          </TouchableOpacity>
        </View>
      </View>

      {containerWidth > 0 && (
        <>
          <Animated.FlatList
            ref={flatListRef}
            data={images}
            keyExtractor={(item) => item.image_id}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            disableIntervalMomentum={true}
            bounces={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumEnd}
            onScrollEndDrag={handleScrollEndDrag}
            onScroll={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              scrollX.setValue(offsetX);
              updateCenteredImageFromOffset(offsetX);
            }}
            contentContainerStyle={{
              paddingLeft: SIDE_PADDING,
              paddingRight: SIDE_PADDING - CARD_SPACING,
              paddingTop: 6,
              paddingBottom: 10,
            }}
            getItemLayout={(_, index) => ({
              length: SNAP_INTERVAL,
              offset: SNAP_INTERVAL * index,
              index,
            })}
          />

          {images.length > 1 && (
            <View style={styles.scrollbarWrapper}>
              <View
                style={styles.scrollbarTrack}
                onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              >
                <Animated.View
                  style={[
                    styles.scrollbarThumb,
                    {
                      width: thumbWidth,
                      transform: [{ translateX: thumbTranslateX }],
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },

  headerTextBox: {
    flex: 1,
  },

  title: {
    color: "#F5F1E9",
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 4,
  },

  subtitle: {
    color: "#C6A969",
    fontSize: 13,
    lineHeight: 18,
  },

  addButton: {
    backgroundColor: "#C6A969",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#C6A969",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  addButtonText: {
    color: "#2B0F16",
    fontWeight: "700",
    fontSize: 14,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  card: {
    backgroundColor: "#171215",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.14)",
  },

  cardSelected: {
    borderColor: "#C6A969",
    backgroundColor: "#21181C",
    shadowColor: "#C6A969",
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },

  thumbWrapper: {
    width: "100%",
    height: 340,
    backgroundColor: "#120D0F",
    position: "relative",
  },

  thumbWrapperSelected: {
    height: 380,
  },

  thumb: {
    width: "100%",
    height: "100%",
  },

  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#241D21",
  },

  thumbPlaceholderText: {
    color: "#C6A969",
    fontWeight: "600",
    fontSize: 12,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 12, 18, 0.18)",
  },

  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#C6A969",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },

  badgeText: {
    color: "#2B0F16",
    fontSize: 11,
    fontWeight: "700",
  },

  info: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  cardTitle: {
    color: "#F5F1E9",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 8,
  },

  cardTitleSelected: {
    color: "#FFF8EE",
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  cardMeta: {
    color: "#D7D0C7",
    fontSize: 12,
    flexShrink: 1,
  },

  cardMetaSelected: {
    color: "#F5F1E9",
  },

  statusPill: {
    backgroundColor: "rgba(198,169,105,0.10)",
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  statusPillSelected: {
    backgroundColor: "#C6A969",
    borderColor: "#C6A969",
  },

  statusPillText: {
    color: "#C6A969",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  statusPillTextSelected: {
    color: "#2B0F16",
  },

  scrollbarWrapper: {
    marginTop: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },

  scrollbarTrack: {
    width: "72%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(198,169,105,0.16)",
    overflow: "hidden",
  },

  scrollbarThumb: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#C6A969",
  },
  
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },

  deleteButton: {
    backgroundColor: "rgba(255, 77, 79, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 79, 0.35)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },

  deleteButtonText: {
    color: "#FF8A8A",
    fontWeight: "700",
    fontSize: 14,
  },
});