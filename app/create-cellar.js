import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { API } from "../src/api/client";

export default function CreateCellar() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function create() {
    if (!name.trim()) {
      setError("Debes ingresar un nombre para la bodega");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await AsyncStorage.getItem("access_token");

      await API.post(
        "/cellars",
        { name: name.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      router.push("/cellars");
    } catch (error) {
      console.log(
        "Error creando bodega:",
        error?.response?.data || error.message || error
      );
      setError("No se pudo crear la bodega");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#2B0F16", "#4B1E2F"]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🍷 New Cellar</Text>
        <Text style={styles.subtitle}>
          Creá una nueva bodega para empezar a organizar tus vinos.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Nombre de la bodega</Text>
        <TextInput
          placeholder="Ej: Bodega principal"
          placeholderTextColor="#A89F97"
          style={styles.input}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError("");
          }}
          onSubmitEditing={create}
          returnKeyType="done"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={create}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#2B0F16" />
          ) : (
            <Text style={styles.buttonText}>Crear bodega</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
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
    maxWidth: 320,
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

  label: {
    color: "#F5F1E9",
    marginBottom: 8,
    fontSize: 15,
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

  button: {
    marginTop: 20,
    padding: 14,
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
});