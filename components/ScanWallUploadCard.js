import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

export default function ScanWallUploadCard({
  loading = false,
  disabled = false,
  onScanWithCamera,
  onPickFromGallery,
}) {
  const isDisabled = loading || disabled;

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>SW</Text>
      </View>

      <Text style={styles.cardTitle}>Análisis de pared</Text>

      <Text style={styles.cardText}>
        Tomá una foto de la pared completa de la bodega para detectar espacios
        de almacenamiento automáticamente.
      </Text>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Recomendaciones</Text>
        <Text style={styles.tipText}>• Sacá la foto de frente</Text>
        <Text style={styles.tipText}>• Evitá sombras fuertes</Text>
        <Text style={styles.tipText}>• Mostrá toda la zona de guardado</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={onScanWithCamera}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color="#2B0F16" />
        ) : (
          <Text style={styles.buttonText}>Tomar foto</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, isDisabled && styles.buttonDisabled]}
        onPress={onPickFromGallery}
        disabled={isDisabled}
      >
        <Text style={styles.secondaryButtonText}>Elegir de galería</Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>
        Después de cargar la imagen, BodeTech intentará detectar los espacios
        disponibles automáticamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#1A1417",
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.22)",
    marginTop: 18,
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
    backgroundColor: "#241D21",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.14)",
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
    borderRadius: 12,
    backgroundColor: "#C6A969",
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
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
});