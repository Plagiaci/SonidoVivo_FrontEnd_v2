import { authApi, type AuthResponse } from "../api/axiosConfig";

export interface RegistroRequest {
  nombre: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export const authService = {
  async registrar(datos: RegistroRequest): Promise<void> {
    await authApi.post("/register", datos);
  },

  async login(datos: LoginRequest): Promise<AuthResponse> {
    const respuesta = await authApi.post<AuthResponse>(
      "/login",
      datos,
    );

    return respuesta.data;
  },
};