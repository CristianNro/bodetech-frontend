import axios from "axios";

export const API = axios.create({
  baseURL: "https://86b3-181-1-226-110.ngrok-free.app",
  timeout: 30000,
});