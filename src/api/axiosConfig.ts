import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

export interface AuthResponse {
  token: string;
  refreshToken: string;
  tipo: string;
  nombre: string;
  email: string;
  rol: string;
}

type ReintentableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const TOKEN = "sonidovivo_token";
const REFRESH_TOKEN = "sonidovivo_refresh_token";

const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/+$/, "");

const AUTH_URL = (
  import.meta.env.VITE_AUTH_URL ||
  "http://localhost:8080/api/auth"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const authApi = axios.create({
  baseURL: AUTH_URL,
  timeout: 10000,
});

let tokenAcceso: string | null =
  sessionStorage.getItem(TOKEN);

let refreshEnCurso: Promise<AuthResponse> | null = null;

export function configurarTokenAcceso(
  token: string | null,
) {
  tokenAcceso = token;

  if (token) {
    sessionStorage.setItem(TOKEN, token);
  } else {
    sessionStorage.removeItem(TOKEN);
  }
}

export function guardarRefreshToken(
  token: string | null,
) {
  if (token) {
    sessionStorage.setItem(
      REFRESH_TOKEN,
      token,
    );
  } else {
    sessionStorage.removeItem(
      REFRESH_TOKEN,
    );
  }
}

export function obtenerRefreshToken():
  string | null {
  return sessionStorage.getItem(
    REFRESH_TOKEN,
  );
}

export function renovarSesion():
  Promise<AuthResponse> {

  const refreshToken =
    obtenerRefreshToken();

  if (!refreshToken) {
    return Promise.reject(
      new Error(
        "No existe refresh token",
      ),
    );
  }

  if (!refreshEnCurso) {
    refreshEnCurso = authApi
      .post<AuthResponse>(
        "/refresh",
        {
          refreshToken,
        },
      )
      .then(({ data }) => {

        configurarTokenAcceso(
          data.token,
        );

        guardarRefreshToken(
          data.refreshToken,
        );

        window.dispatchEvent(
          new CustomEvent<AuthResponse>(
            "sonidovivo:session-refreshed",
            {
              detail: data,
            },
          ),
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
  guardarRefreshToken(null);

  sessionStorage.removeItem(
    "sonidovivo_sesion",
  );

  window.dispatchEvent(
    new Event(
      "sonidovivo:unauthorized",
    ),
  );
}

api.interceptors.request.use(
  (config) => {

    if (tokenAcceso) {
      config.headers.Authorization =
        `Bearer ${tokenAcceso}`;
    }

    return config;
  },
);

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {

    const request =
      error.config as
        ReintentableRequest | undefined;

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry
    ) {
      return Promise.reject(error);
    }

    request._retry = true;

    try {
      const sesion =
        await renovarSesion();

      if (!request.headers) {
        request.headers =
          new AxiosHeaders();
      }

      request.headers.Authorization =
        `Bearer ${sesion.token}`;

      return api(request);

    } catch (refreshError) {

      invalidarSesionLocal();

      return Promise.reject(
        refreshError,
      );
    }
  },
);