import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function Home() {
  return (
    <LinearGradient
      colors={["#2B0F16", "#4B1E2F"]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>BodeTech</Text>
        <Text style={styles.tagline}>Tu bodega, bajo control.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.welcome}>Bienvenido</Text>
        <Text style={styles.description}>
          Gestioná tu bodega, escaneá espacios y mantené el inventario bajo control.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  header: {
    alignItems: "center",
    marginBottom: 40,
  },

  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F5F1E9",
  },

  tagline: {
    color: "#C6A969",
    marginTop: 6,
    fontSize: 16,
  },

  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1F1A1D",
    padding: 25,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
  },

  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F5F1E9",
    textAlign: "center",
    marginBottom: 10,
  },

  description: {
    color: "#D7D0C7",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
  },

  button: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#C6A969",
    alignItems: "center",
    marginBottom: 12,
  },

  buttonText: {
    color: "#2B0F16",
    fontWeight: "bold",
    fontSize: 16,
  },

  secondaryButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.35)",
    alignItems: "center",
    backgroundColor: "#2A2226",
  },

  secondaryButtonText: {
    color: "#F5F1E9",
    fontWeight: "600",
    fontSize: 16,
  },
});