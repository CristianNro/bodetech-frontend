import axios from "axios";

export const API = axios.create({
  baseURL: "http://192.168.56.1:8000",
  timeout: 30000,
});