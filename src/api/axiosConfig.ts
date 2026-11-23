import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1",
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("sonidovivo_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("sonidovivo_token");
      sessionStorage.removeItem("sonidovivo_sesion");
      window.dispatchEvent(new Event("sonidovivo:unauthorized"));
    }

    return Promise.reject(error);
  },
);
