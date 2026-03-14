import React, { createContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../api/client";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  async function bootstrapAuth() {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      if (!accessToken) {
        setUser(null);
        return;
      }

      // Por ahora solo marcamos que hay sesión almacenada.
      // Más adelante, si agregás /auth/me, acá podés recuperar el usuario real.
      setUser({ logged: true });
    } catch (error) {
      console.log("Error bootstrapping auth:", error?.message || error);
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }

  async function login(email, password) {
    const { data } = await API.post("/auth/login", { email, password });

    await AsyncStorage.setItem("access_token", data.access_token);
    await AsyncStorage.setItem("refresh_token", data.refresh_token);

    setUser(data.user || { logged: true });
  }

  async function register(email, password, fullName = "") {
    const payload = {
      email,
      password,
      full_name: fullName || "",
    };

    const { data } = await API.post("/auth/register", payload);

    await AsyncStorage.setItem("access_token", data.access_token);
    await AsyncStorage.setItem("refresh_token", data.refresh_token);

    setUser(data.user || { logged: true });
  }

  async function logout() {
    await AsyncStorage.multiRemove(["access_token", "refresh_token", "token"]);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}