import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const API_BASE_URL = "http://192.168.56.1:8000";
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