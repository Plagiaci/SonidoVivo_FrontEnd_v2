import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

export interface AuthResponse {
  id: number;
  token: string;
  tipo: string;
  refreshToken: string;
  nombre: string;
  email: string;
  rol: string;
  apellido: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  region: string | null;
  genero: string | null;
}

type ReintentableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const TOKEN = "sonidovivo_token";
const REFRESH_TOKEN = "sonidovivo_refresh_token";
const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

let tokenAcceso: string | null =
  localStorage.getItem(TOKEN) ?? sessionStorage.getItem(TOKEN);
let refreshEnCurso: Promise<AuthResponse> | null = null;

export function configurarTokenAcceso(token: string | null) {
  tokenAcceso = token;
  if (token) {
    localStorage.setItem(TOKEN, token);
    sessionStorage.removeItem(TOKEN);
  } else {
    localStorage.removeItem(TOKEN);
    sessionStorage.removeItem(TOKEN);
  }
}

export function renovarSesion(): Promise<AuthResponse> {
  if (!refreshEnCurso) {
    const refreshToken =
      localStorage.getItem(REFRESH_TOKEN) ??
      sessionStorage.getItem(REFRESH_TOKEN);
    if (!refreshToken) {
      return Promise.reject(new Error("No hay un token de renovación."));
    }

    refreshEnCurso = axios
      .post<AuthResponse>(`${BASE_URL}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        localStorage.setItem(REFRESH_TOKEN, data.refreshToken);
        sessionStorage.removeItem(REFRESH_TOKEN);
        configurarTokenAcceso(data.token);
        window.dispatchEvent(
          new CustomEvent<AuthResponse>("sonidovivo:session-refreshed", {
            detail: data,
          }),
        );
        return data;
      })
      .finally(() => {
        refreshEnCurso = null;
      });
  }
  return refreshEnCurso;
}

function invalidarSesionLocal() {
  configurarTokenAcceso(null);
  localStorage.removeItem(REFRESH_TOKEN);
  localStorage.removeItem("sonidovivo_sesion");
  sessionStorage.removeItem(REFRESH_TOKEN);
  sessionStorage.removeItem("sonidovivo_sesion");
  window.dispatchEvent(new Event("sonidovivo:unauthorized"));
}

api.interceptors.request.use((config) => {
  const esRutaPublicaAuth =
    /\/auth\/(login|register|refresh|logout)(\?|$)/.test(config.url ?? "");
  if (tokenAcceso && !esRutaPublicaAuth) {
    config.headers.Authorization = `Bearer ${tokenAcceso}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as ReintentableRequest | undefined;
    const esRutaPublicaAuth =
      /\/auth\/(login|register|refresh|logout)(\?|$)/.test(request?.url ?? "");
    if (!error.response && request && tokenAcceso && !esRutaPublicaAuth) {
      invalidarSesionLocal();
      return Promise.reject(error);
    }
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      esRutaPublicaAuth
    ) {
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      const session = await renovarSesion();
      if (!request.headers) request.headers = new AxiosHeaders();
      request.headers.Authorization = `Bearer ${session.token}`;
      return api(request);
    } catch (refreshError) {
      invalidarSesionLocal();
      return Promise.reject(refreshError);
    }
  },
);
