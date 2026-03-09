import { router } from "expo-router";
import { useContext, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../src/auth/AuthContext";

export default function Register() {
  const { register } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateEmail(mail) {
    return /\S+@\S+\.\S+/.test(mail);
  }

  async function handleRegister() {
    if (!validateEmail(email)) {
      setError("Email inválido");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await register(email, password);
      router.replace("/cellars");
    } catch (e) {
      console.log("Error real register:", e?.response?.data || e?.message || e);
      setError("Error creando la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#2B0F16", "#4B1E2F"]}
      style={styles.container}
    >

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crear cuenta</Text>
        <Text style={styles.cardSubtitle}>
          Registrate para empezar a gestionar tu bodega.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="tu@email.com"
          placeholderTextColor="#A89F97"
          style={styles.input}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError("");
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          placeholder="********"
          placeholderTextColor="#A89F97"
          style={styles.input}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError("");
          }}
          secureTextEntry={!showPassword}
        />

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput
          placeholder="********"
          placeholderTextColor="#A89F97"
          style={styles.input}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setError("");
          }}
          secureTextEntry={!showPassword}
          onSubmitEditing={handleRegister}
          returnKeyType="go"
        />

        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.showPassword}>
            {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.loginText}>
          ¿Ya tenés cuenta?{" "}
          <Text style={styles.loginLink} onPress={() => router.push("/login")}>
            Iniciar sesión
          </Text>
        </Text>
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

  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F5F1E9",
    textAlign: "center",
    marginBottom: 6,
  },

  cardSubtitle: {
    textAlign: "center",
    color: "#C6A969",
    marginBottom: 20,
  },

  label: {
    color: "#F5F1E9",
    marginTop: 10,
  },

  input: {
    backgroundColor: "#2A2226",
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(198,169,105,0.3)",
    color: "#F5F1E9",
  },

  showPassword: {
    marginTop: 12,
    color: "#C6A969",
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

  loginText: {
    marginTop: 15,
    textAlign: "center",
    color: "#F5F1E9",
  },

  loginLink: {
    color: "#C6A969",
    fontWeight: "600",
  },

  error: {
    color: "#FF6B6B",
    marginTop: 10,
    textAlign: "center",
  },
});