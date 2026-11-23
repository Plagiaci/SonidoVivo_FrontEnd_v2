import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAxiosError } from "axios";
import { api } from "../api/axiosConfig";
import { productos as catalogoInicial } from "../data/Productos";
import type { Producto } from "../types/Producto";

const CLAVE_PRODUCTOS = "sonidovivo_productos";
const CLAVE_CARRITO = "sonidovivo_carrito";
const CLAVE_USUARIOS = "sonidovivo_usuarios";
const CLAVE_SESION = "sonidovivo_sesion";
const CLAVE_CATEGORIAS = "sonidovivo_categorias";

export type RolUsuario = "cliente" | "vendedor" | "administrador";

export interface ItemCarrito {
  idProducto: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  correo: string;
  password: string;
  direccion: string;
  region: string;
  genero: string;
  intentosFallidos: number;
  bloqueado: boolean;
  rol: RolUsuario;
}

export interface AuthResponse {
  id: number;
  token: string;
  tipo: string;
  nombre: string;
  email: string;
  rol: string;
  apellido: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  region: string | null;
  genero: string | null;
}

interface StoreContextValue {
  productos: Producto[];
  carrito: ItemCarrito[];
  usuarios: Usuario[];
  usuarioActual: Usuario | null;
  categorias: string[];
  agregarAlCarrito: (idProducto: string) => boolean;
  cambiarCantidadCarrito: (idProducto: string, cantidad: number) => boolean;
  eliminarDelCarrito: (idProducto: string) => void;
  vaciarCarrito: () => void;
  finalizarCompra: () => Promise<string | null>;
  establecerSesion: (sesion: AuthResponse) => void;
  cerrarSesion: () => void;
  guardarUsuarios: (usuarios: Usuario[]) => void;
  actualizarStock: (idProducto: string, stock: number) => Promise<boolean>;
  actualizarProducto: (producto: Producto) => Promise<boolean>;
  crearProducto: (producto: Producto) => Promise<boolean>;
  eliminarProducto: (idProducto: string) => Promise<boolean>;
  crearCategoria: (nombre: string) => Promise<boolean>;
  actualizarCategoria: (
    nombreActual: string,
    nombreNuevo: string,
  ) => Promise<boolean>;
  eliminarCategoria: (nombre: string) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function leerLocalStorage<T>(clave: string, valorInicial: T): T {
  const valor = localStorage.getItem(clave);
  if (valor === null) return valorInicial;

  try {
    return JSON.parse(valor) as T;
  } catch {
    localStorage.removeItem(clave);
    return valorInicial;
  }
}

function normalizarProducto(producto: Producto): Producto {
  const categoria = producto.categoria as unknown;
  const nombreCategoria =
    typeof categoria === "string"
      ? categoria
      : categoria && typeof categoria === "object" && "nombre" in categoria
        ? String((categoria as { nombre: unknown }).nombre)
        : "";

  return { ...producto, categoria: nombreCategoria };
}

function cargarProductos(): Producto[] {
  const guardados = leerLocalStorage<Producto[]>(CLAVE_PRODUCTOS, []);

  if (guardados.length > 0) {
    return guardados.map(normalizarProducto);
  }

  localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(catalogoInicial));

  return catalogoInicial;
}
function cargarCategorias(): string[] {
  const guardadas = localStorage.getItem(CLAVE_CATEGORIAS);

  if (guardadas !== null) {
    try {
      const categoriasGuardadas = JSON.parse(guardadas) as unknown[];
      const nombres = categoriasGuardadas.map((categoria) =>
        typeof categoria === "string"
          ? categoria
          : categoria && typeof categoria === "object" && "nombre" in categoria
            ? String((categoria as { nombre: unknown }).nombre)
            : "",
      );
      return [...new Set(nombres.filter(Boolean))];
    } catch {
      localStorage.removeItem(CLAVE_CATEGORIAS);
    }
  }

  const productosGuardados = leerLocalStorage<Producto[]>(
    CLAVE_PRODUCTOS,
    catalogoInicial,
  );

  const categoriasIniciales = [
    ...new Set(productosGuardados.map((producto) => producto.categoria)),
  ];

  localStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(categoriasIniciales));

  return categoriasIniciales;
}

function cargarUsuarios(): Usuario[] {
  const guardados = leerLocalStorage<Partial<Usuario>[]>(CLAVE_USUARIOS, []);
  const normalizados: Usuario[] = guardados.map((usuario) => ({
    id: usuario.id ?? crypto.randomUUID(),
    nombre: usuario.nombre ?? "",
    apellido: usuario.apellido ?? "",
    fechaNacimiento: usuario.fechaNacimiento ?? "",
    correo: usuario.correo ?? "",
    password: "",
    direccion: usuario.direccion ?? "",
    region: usuario.region ?? "",
    genero: usuario.genero ?? "",
    intentosFallidos: usuario.intentosFallidos ?? 0,
    bloqueado: usuario.bloqueado ?? false,
    rol:
      usuario.rol === "administrador" || usuario.rol === "vendedor"
        ? usuario.rol
        : "cliente",
  }));
  const usuariosSinDemo = normalizados.filter(
    (usuario) =>
      ![
        "admin@sonidovivo.cl",
        "vendedor@sonidovivo.cl",
        "cliente@sonidovivo.cl",
      ].includes(usuario.correo.toLowerCase()),
  );
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuariosSinDemo));
  return usuariosSinDemo;
}

function cargarSesion(): Usuario | null {
  const token = sessionStorage.getItem("sonidovivo_token");
  const sesion = sessionStorage.getItem(CLAVE_SESION);
  if (!token || !sesion) {
    sessionStorage.removeItem("sonidovivo_token");
    sessionStorage.removeItem(CLAVE_SESION);
    return null;
  }

  try {
    const partes = token.split(".");
    if (partes.length === 3) {
      const payload = JSON.parse(
        decodeURIComponent(
          atob(partes[1].replace(/-/g, "+").replace(/_/g, "/"))
            .split("")
            .map((caracter) =>
              `%${caracter.charCodeAt(0).toString(16).padStart(2, "0")}`,
            )
            .join(""),
        ),
      ) as { exp?: number };
      if (payload.exp && payload.exp * 1000 <= Date.now()) {
        throw new Error("Token expirado");
      }
    }
    const usuario = JSON.parse(sesion) as Usuario;
    if (
      !usuario.id ||
      !usuario.correo ||
      !["cliente", "vendedor", "administrador"].includes(usuario.rol)
    ) {
      throw new Error("Sesión inválida");
    }
    return { ...usuario, password: "" };
  } catch {
    sessionStorage.removeItem("sonidovivo_token");
    sessionStorage.removeItem(CLAVE_SESION);
    return null;
  }
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [productos, setProductos] = useState<Producto[]>(cargarProductos);
  const [categorias, setCategorias] = useState<string[]>(cargarCategorias);
  const [carrito, setCarrito] = useState<ItemCarrito[]>(() =>
    leerLocalStorage<ItemCarrito[]>(CLAVE_CARRITO, []),
  );
  const [usuarios, setUsuarios] = useState<Usuario[]>(cargarUsuarios);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(
    cargarSesion,
  );

  useEffect(() => {
    const cerrarSesionExpirada = () => setUsuarioActual(null);
    window.addEventListener("sonidovivo:unauthorized", cerrarSesionExpirada);
    return () =>
      window.removeEventListener(
        "sonidovivo:unauthorized",
        cerrarSesionExpirada,
      );
  }, []);

  useEffect(() => {
    let activo = true;

    api
      .get<Producto[]>("/productos")
      .then(({ data }) => {
        if (!activo || !Array.isArray(data)) return;
        const productosNormalizados = data.map(normalizarProducto);
        const categoriasActualizadas = [
          ...new Set(
            productosNormalizados.map((producto) => producto.categoria),
          ),
        ];

        localStorage.setItem(
          CLAVE_PRODUCTOS,
          JSON.stringify(productosNormalizados),
        );
        localStorage.setItem(
          CLAVE_CATEGORIAS,
          JSON.stringify(categoriasActualizadas),
        );
        setProductos(productosNormalizados);
        setCategorias(categoriasActualizadas);
      })
      .catch(() => {
        // El catálogo local sigue disponible cuando el backend no responde.
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    if (usuarioActual) {
      sessionStorage.setItem(
        CLAVE_SESION,
        JSON.stringify({ ...usuarioActual, password: "" }),
      );
    } else {
      sessionStorage.removeItem(CLAVE_SESION);
      sessionStorage.removeItem("sonidovivo_token");
    }
  }, [usuarioActual]);

  const value = useMemo<StoreContextValue>(
    () => ({
      productos,
      categorias,
      carrito,
      usuarios,
      usuarioActual,
      agregarAlCarrito: (idProducto) => {
        if (!usuarioActual) return false;
        const producto = productos.find((item) => item.id === idProducto);
        if (!producto || producto.stock <= 0) return false;

        const existente = carrito.find(
          (item) => item.idProducto === idProducto,
        );
        if (existente && existente.cantidad >= producto.stock) return false;

        setCarrito(
          existente
            ? carrito.map((item) =>
                item.idProducto === idProducto
                  ? { ...item, cantidad: item.cantidad + 1 }
                  : item,
              )
            : [
                ...carrito,
                {
                  idProducto: producto.id,
                  nombre: producto.nombre,
                  precio: producto.precio,
                  cantidad: 1,
                },
              ],
        );
        return true;
      },
      cambiarCantidadCarrito: (idProducto, cantidad) => {
        if (!Number.isInteger(cantidad) || cantidad < 1) return false;
        const producto = productos.find((item) => item.id === idProducto);
        if (!producto || cantidad > producto.stock) return false;
        setCarrito((actual) =>
          actual.map((item) =>
            item.idProducto === idProducto ? { ...item, cantidad } : item,
          ),
        );
        return true;
      },
      eliminarDelCarrito: (idProducto) =>
        setCarrito((actual) =>
          actual.filter((item) => item.idProducto !== idProducto),
        ),
      vaciarCarrito: () => setCarrito([]),
      finalizarCompra: async () => {
        if (!usuarioActual) {
          return "Debes iniciar sesión para realizar una compra.";
        }
        if (carrito.length === 0) return "No existen productos para comprar.";

        try {
          await api.post("/pedidos", {
            items: carrito.map((item) => ({
              productoId: item.idProducto,
              cantidad: item.cantidad,
            })),
          });
        } catch (error) {
          if (isAxiosError<{ error?: string }>(error)) {
            return (
              error.response?.data?.error ??
              "No fue posible completar la compra."
            );
          }
          return "No fue posible completar la compra.";
        }

        const actualizados = productos.map((producto) => {
          const item = carrito.find(
            (actual) => actual.idProducto === producto.id,
          );
          return item
            ? { ...producto, stock: producto.stock - item.cantidad }
            : producto;
        });
        localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(actualizados));
        setProductos(actualizados);
        setCarrito([]);
        return null;
      },
      establecerSesion: (sesion) => {
        const roles: Record<string, RolUsuario> = {
          CLIENTE: "cliente",
          VENDEDOR: "vendedor",
          ADMINISTRADOR: "administrador",
        };
        const rol = roles[sesion.rol.toUpperCase()];
        if (!rol) throw new Error("El backend devolvió un rol desconocido.");

        sessionStorage.setItem("sonidovivo_token", sesion.token);
        setUsuarioActual({
          id: String(sesion.id),
          nombre: sesion.nombre,
          apellido: sesion.apellido ?? "",
          fechaNacimiento: sesion.fechaNacimiento ?? "",
          correo: sesion.email,
          password: "",
          direccion: sesion.direccion ?? "",
          region: sesion.region ?? "",
          genero: sesion.genero ?? "",
          intentosFallidos: 0,
          bloqueado: false,
          rol,
        });
      },
      cerrarSesion: () => {
        setUsuarioActual(null);
        sessionStorage.removeItem(CLAVE_SESION);
        sessionStorage.removeItem("sonidovivo_token");
      },
      guardarUsuarios: (actualizados) => {
        const usuariosSinContrasenas = actualizados.map((usuario) => ({
          ...usuario,
          password: "",
        }));
        localStorage.setItem(
          CLAVE_USUARIOS,
          JSON.stringify(usuariosSinContrasenas),
        );
        setUsuarios(usuariosSinContrasenas);
      },
      actualizarStock: async (idProducto, stock) => {
        if (
          usuarioActual?.rol !== "vendedor" ||
          !Number.isInteger(stock) ||
          stock < 0
        ) {
          return false;
        }
        const producto = productos.find((item) => item.id === idProducto);
        if (!producto) return false;
        try {
          const { data } = await api.patch<Producto>(
            `/productos/${idProducto}/stock`,
            { stock },
          );
          const actualizado = normalizarProducto(data);
          setProductos((actuales) =>
            actuales.map((item) =>
              item.id === idProducto ? actualizado : item,
            ),
          );
          return true;
        } catch {
          return false;
        }
      },

      crearProducto: async (nuevoProducto) => {
        if (usuarioActual?.rol !== "administrador") {
          return false;
        }

        if (
          !nuevoProducto.id.trim() ||
          !nuevoProducto.categoria.trim() ||
          !nuevoProducto.nombre.trim() ||
          !nuevoProducto.marca.trim() ||
          !nuevoProducto.modelo.trim() ||
          !nuevoProducto.descripcion.trim()
        ) {
          return false;
        }

        if (!Number.isInteger(nuevoProducto.stock) || nuevoProducto.stock < 0) {
          return false;
        }

        if (
          !Number.isFinite(nuevoProducto.precio) ||
          nuevoProducto.precio < 0
        ) {
          return false;
        }

        const existe = productos.some(
          (producto) => producto.id === nuevoProducto.id,
        );

        if (existe) {
          return false;
        }

        try {
          const { data } = await api.post<Producto>(
            "/productos",
            nuevoProducto,
          );
          const creado = normalizarProducto(data);
          setProductos((actuales) => [...actuales, creado]);
          return true;
        } catch {
          return false;
        }
      },
      eliminarProducto: async (idProducto) => {
        if (usuarioActual?.rol !== "administrador") {
          return false;
        }

        const existe = productos.some((producto) => producto.id === idProducto);

        if (!existe) {
          return false;
        }

        try {
          await api.delete(`/productos/${idProducto}`);
          setProductos((actuales) =>
            actuales.filter((producto) => producto.id !== idProducto),
          );
          setCarrito((actual) =>
            actual.filter((item) => item.idProducto !== idProducto),
          );
          return true;
        } catch {
          return false;
        }
      },
      crearCategoria: async (nombre) => {
        if (usuarioActual?.rol !== "administrador") {
          return false;
        }

        const nuevaCategoria = nombre.trim();

        if (!nuevaCategoria) {
          return false;
        }

        const existe = categorias.some(
          (categoria) =>
            categoria.toLowerCase() === nuevaCategoria.toLowerCase(),
        );

        if (existe) {
          return false;
        }

        try {
          await api.post("/categorias", { nombre: nuevaCategoria });
          setCategorias((actuales) => [...actuales, nuevaCategoria]);
          return true;
        } catch {
          return false;
        }
      },
      actualizarCategoria: async (nombreActual, nombreNuevo) => {
        if (usuarioActual?.rol !== "administrador") {
          return false;
        }

        const nuevoNombre = nombreNuevo.trim();

        if (!nuevoNombre) {
          return false;
        }

        const existe = categorias.some(
          (categoria) =>
            categoria.toLowerCase() === nuevoNombre.toLowerCase() &&
            categoria !== nombreActual,
        );

        if (existe) {
          return false;
        }

        try {
          const { data: existentes } =
            await api.get<{ id: number; nombre: string }[]>("/categorias");
          const categoria = existentes.find(
            (item) => item.nombre === nombreActual,
          );
          if (!categoria) return false;

          await api.put(`/categorias/${categoria.id}`, {
            nombre: nuevoNombre,
          });
          setCategorias((actuales) =>
            actuales.map((item) =>
              item === nombreActual ? nuevoNombre : item,
            ),
          );
          setProductos((actuales) =>
            actuales.map((producto) =>
              producto.categoria === nombreActual
                ? { ...producto, categoria: nuevoNombre }
                : producto,
            ),
          );
          return true;
        } catch {
          return false;
        }
      },
      eliminarCategoria: async (nombre) => {
        if (usuarioActual?.rol !== "administrador") {
          return false;
        }

        const tieneProductos = productos.some(
          (producto) => producto.categoria === nombre,
        );

        if (tieneProductos) {
          return false;
        }

        try {
          const { data: existentes } =
            await api.get<{ id: number; nombre: string }[]>("/categorias");
          const categoria = existentes.find((item) => item.nombre === nombre);
          if (!categoria) return false;
          await api.delete(`/categorias/${categoria.id}`);
          setCategorias((actuales) =>
            actuales.filter((item) => item !== nombre),
          );
          return true;
        } catch {
          return false;
        }
      },

      actualizarProducto: async (actualizado) => {
        if (
          usuarioActual?.rol !== "administrador" ||
          !Number.isInteger(actualizado.stock) ||
          actualizado.stock < 0 ||
          !Number.isFinite(actualizado.precio) ||
          actualizado.precio < 0 ||
          !actualizado.categoria.trim() ||
          !actualizado.nombre.trim() ||
          !actualizado.marca.trim() ||
          !actualizado.modelo.trim() ||
          !actualizado.descripcion.trim()
        ) {
          return false;
        }
        try {
          const { data } = await api.put<Producto>(
            `/productos/${actualizado.id}`,
            actualizado,
          );
          const normalizado = normalizarProducto(data);
          setProductos((actuales) =>
            actuales.map((producto) =>
              producto.id === actualizado.id ? normalizado : producto,
            ),
          );
          return true;
        } catch {
          return false;
        }
      },
    }),
    [productos, categorias, carrito, usuarios, usuarioActual],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context)
    throw new Error("useStore debe usarse dentro de StoreProvider.");
  return context;
}
