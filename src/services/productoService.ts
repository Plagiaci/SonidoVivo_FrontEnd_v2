import { api } from "../api/axiosConfig";
import type { Producto } from "../types/Producto";

export const productoService = {
  async obtenerTodos(): Promise<Producto[]> {
    const respuesta = await api.get<Producto[]>("/productos");

    return respuesta.data;
  },
};