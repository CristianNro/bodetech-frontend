import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

// ⚠ Cambiar a la IP LAN de tu máquina de desarrollo.
// No hay sistema de env vars para Expo bare en esta etapa del proyecto.
// Para URLs de imágenes usar siempre resolveApiUrl() — nunca concatenar strings directamente con esta constante.
const API_BASE_URL = "https://04f6-181-97-191-213.ngrok-free.app";

// Guard para evitar redirect loops en 401 — nunca resetear dentro de un request handler.
// isRedirecting nunca vuelve a false porque la app se reinicia tras el redirect.
let isRedirecting = false;

export const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("access_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;

      try {
        await AsyncStorage.removeItem("token");
      } catch {}

      router.replace("/login");
    }

    return Promise.reject(error);
  }
);

export function resolveApiUrl(path) {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}/${path}`;
}