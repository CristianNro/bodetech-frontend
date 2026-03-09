import { useState, useContext } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../src/auth/AuthContext";
import { colors } from "../src/theme/colors";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError("Debes ingresar email y contraseña");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(email, password);
      router.push("/cellars");
    } catch (e) {
      setError("No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      style={styles.container}
    >

      <View style={styles.card}>
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

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="********"
          placeholderTextColor="#A89F97"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError("");
          }}
          onSubmitEditing={handleLogin}
          returnKeyType="go"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.register}>
          No tenés cuenta?{" "}
          <Text style={styles.registerLink} onPress={() => router.push("/register")}>
            Crear cuenta
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
    color: colors.textPrimary,
  },
  tagline: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.card,
    padding: 25,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textPrimary,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.input,
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  button: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.buttonPrimary,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.buttonText,
    fontWeight: "bold",
    fontSize: 16,
  },
  register: {
    marginTop: 15,
    textAlign: "center",
    color: colors.textPrimary,
  },
  registerLink: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  error: {
    color: colors.error,
    marginTop: 10,
    textAlign: "center",
  },
});