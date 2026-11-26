import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAxiosError } from "axios";
import {
  api,
  configurarTokenAcceso,
  renovarSesion,
  type AuthResponse,
} from "../api/axiosConfig";
import type { Producto } from "../types/Producto";

export type { AuthResponse } from "../api/axiosConfig";

const CLAVE_CARRITO = "sonidovivo_carrito";
const CLAVE_SESION = "sonidovivo_sesion";

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

interface UsuarioApi {
  id: number;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  email: string;
  direccion: string;
  region: string;
  genero: string;
  rol: string;
}

interface StoreContextValue {
  productos: Producto[];
  carrito: ItemCarrito[];
  usuarios: Usuario[];
  usuarioActual: Usuario | null;
  categorias: string[];
  catalogoCargando: boolean;
  catalogoError: string;
  usuariosCargando: boolean;
  usuariosError: string;
  agregarAlCarrito: (idProducto: string) => boolean;
  cambiarCantidadCarrito: (idProducto: string, cantidad: number) => boolean;
  eliminarDelCarrito: (idProducto: string) => void;
  vaciarCarrito: () => void;
  finalizarCompra: () => Promise<string | null>;
  establecerSesion: (sesion: AuthResponse) => void;
  cerrarSesion: () => Promise<string | null>;
  actualizarPerfil: (usuario: Usuario) => Promise<string | null>;
  guardarUsuarios: (usuarios: Usuario[]) => Promise<string | null>;
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

function convertirUsuarioApi(usuario: UsuarioApi): Usuario {
  const roles: Record<string, RolUsuario> = {
    CLIENTE: "cliente",
    VENDEDOR: "vendedor",
    ADMINISTRADOR: "administrador",
  };
  const rol = roles[usuario.rol.toUpperCase()];
  if (!rol) throw new Error("El backend devolvió un rol desconocido.");
  return {
    id: String(usuario.id),
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    fechaNacimiento: usuario.fechaNacimiento,
    correo: usuario.email,
    password: "",
    direccion: usuario.direccion,
    region: usuario.region,
    genero: usuario.genero,
    intentosFallidos: 0,
    bloqueado: false,
    rol,
  };
}

function usuarioDesdeAuth(sesion: AuthResponse): Usuario {
  const usuario: UsuarioApi = {
    id: sesion.id,
    nombre: sesion.nombre,
    apellido: sesion.apellido ?? "",
    fechaNacimiento: sesion.fechaNacimiento ?? "",
    email: sesion.email,
    direccion: sesion.direccion ?? "",
    region: sesion.region ?? "",
    genero: sesion.genero ?? "",
    rol: sesion.rol,
  };
  return convertirUsuarioApi(usuario);
}

function payloadUsuario(usuario: Usuario) {
  return {
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    fechaNacimiento: usuario.fechaNacimiento,
    email: usuario.correo,
    ...(usuario.password ? { password: usuario.password } : {}),
    direccion: usuario.direccion,
    region: usuario.region,
    genero: usuario.genero,
    rol: usuario.rol.toUpperCase(),
  };
}

function errorDeApi(error: unknown, fallback: string): string {
  return isAxiosError<{ error?: string }>(error)
    ? (error.response?.data?.error ?? fallback)
    : fallback;
}

function cargarSesion(): Usuario | null {
  configurarTokenAcceso(null);
  const sesion =
    localStorage.getItem(CLAVE_SESION) ??
    sessionStorage.getItem(CLAVE_SESION);
  const refreshToken =
    localStorage.getItem("sonidovivo_refresh_token") ??
    sessionStorage.getItem("sonidovivo_refresh_token");
  if (!sesion || !refreshToken) {
    localStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem("sonidovivo_refresh_token");
    sessionStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem("sonidovivo_refresh_token");
    return null;
  }

  try {
    const usuario = JSON.parse(sesion) as Usuario;
    if (
      !usuario.id ||
      !usuario.correo ||
      !["cliente", "vendedor", "administrador"].includes(usuario.rol)
    ) {
      throw new Error("Sesión inválida");
    }
    localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    localStorage.setItem("sonidovivo_refresh_token", refreshToken);
    sessionStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem("sonidovivo_refresh_token");
    return { ...usuario, password: "" };
  } catch {
    localStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem("sonidovivo_refresh_token");
    sessionStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem("sonidovivo_refresh_token");
    return null;
  }
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [catalogoCargando, setCatalogoCargando] = useState(true);
  const [catalogoError, setCatalogoError] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>(() =>
    leerLocalStorage<ItemCarrito[]>(CLAVE_CARRITO, []),
  );
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosCargando, setUsuariosCargando] = useState(false);
  const [usuariosError, setUsuariosError] = useState("");
  const [usuariosCargados, setUsuariosCargados] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(
    cargarSesion,
  );

  useEffect(() => {
    const cerrarSesionExpirada = () => {
      configurarTokenAcceso(null);
      localStorage.removeItem("sonidovivo_refresh_token");
      sessionStorage.removeItem("sonidovivo_refresh_token");
      setUsuarioActual(null);
      setCarrito([]);
    };
    const actualizarSesionRenovada = (evento: Event) => {
      const sesion = (evento as CustomEvent<AuthResponse>).detail;
      if (sesion) setUsuarioActual(usuarioDesdeAuth(sesion));
    };
    window.addEventListener("sonidovivo:unauthorized", cerrarSesionExpirada);
    window.addEventListener(
      "sonidovivo:session-refreshed",
      actualizarSesionRenovada,
    );
    return () => {
      window.removeEventListener(
        "sonidovivo:unauthorized",
        cerrarSesionExpirada,
      );
      window.removeEventListener(
        "sonidovivo:session-refreshed",
        actualizarSesionRenovada,
      );
    };
  }, []);

  useEffect(() => {
    if (!usuarioActual) return;
    let activo = true;

    renovarSesion()
      .then((sesion) => {
        if (activo) setUsuarioActual(usuarioDesdeAuth(sesion));
      })
      .catch(() => {
        if (activo) {
          configurarTokenAcceso(null);
          localStorage.removeItem("sonidovivo_refresh_token");
          sessionStorage.removeItem("sonidovivo_refresh_token");
          sessionStorage.removeItem(CLAVE_SESION);
          localStorage.removeItem(CLAVE_SESION);
          setUsuarioActual(null);
          setCarrito([]);
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    api
      .get<Producto[]>("/productos")
      .then(({ data }) => {
        if (!activo) return;
        if (!Array.isArray(data)) {
          throw new Error("La respuesta del catálogo no es válida.");
        }
        const productosNormalizados = data.map(normalizarProducto);
        const categoriasActualizadas = [
          ...new Set(
            productosNormalizados.map((producto) => producto.categoria),
          ),
        ];

        setProductos(productosNormalizados);
        setCategorias(categoriasActualizadas);
        setCatalogoError("");
      })
      .catch(() => {
        if (activo) {
          setCatalogoError(
            "No fue posible cargar el catálogo. Comprueba que el backend esté disponible.",
          );
        }
      })
      .finally(() => {
        if (activo) setCatalogoCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    if (usuarioActual?.rol !== "administrador") {
      setUsuarios([]);
      setUsuariosError("");
      setUsuariosCargando(false);
      setUsuariosCargados(false);
      return () => {
        activo = false;
      };
    }

    setUsuariosCargando(true);
    api
      .get<UsuarioApi[]>("/admin/usuarios")
      .then(({ data }) => {
        if (activo) {
          setUsuarios(data.map(convertirUsuarioApi));
          setUsuariosError("");
          setUsuariosCargados(true);
        }
      })
      .catch((error) => {
        if (activo) {
          setUsuariosError(
            errorDeApi(error, "No fue posible cargar los usuarios."),
          );
          setUsuariosCargados(false);
        }
      })
      .finally(() => {
        if (activo) setUsuariosCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [usuarioActual?.rol]);

  useEffect(() => {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    if (usuarioActual) {
      localStorage.setItem(
        CLAVE_SESION,
        JSON.stringify({ ...usuarioActual, password: "" }),
      );
    } else {
      localStorage.removeItem(CLAVE_SESION);
      sessionStorage.removeItem(CLAVE_SESION);
    }
  }, [usuarioActual]);

  const value = useMemo<StoreContextValue>(
    () => ({
      productos,
      categorias,
      catalogoCargando,
      catalogoError,
      usuariosCargando,
      usuariosError,
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
        setProductos(actualizados);
        setCarrito([]);
        return null;
      },
      establecerSesion: (sesion) => {
        localStorage.setItem("sonidovivo_refresh_token", sesion.refreshToken);
        configurarTokenAcceso(sesion.token);
        setUsuarioActual(usuarioDesdeAuth(sesion));
      },
      cerrarSesion: async () => {
        const refreshToken =
          localStorage.getItem("sonidovivo_refresh_token") ??
          sessionStorage.getItem("sonidovivo_refresh_token");
        configurarTokenAcceso(null);
        let errorCierre: string | null = null;
        if (refreshToken) {
          try {
            await api.post("/auth/logout", { refreshToken });
          } catch (error) {
            errorCierre = errorDeApi(
              error,
              "La sesión local se cerró, pero no se pudo invalidar la sesión del servidor.",
            );
          }
        }
        setUsuarioActual(null);
        setCarrito([]);
        localStorage.removeItem(CLAVE_SESION);
        localStorage.removeItem("sonidovivo_refresh_token");
        sessionStorage.removeItem(CLAVE_SESION);
        sessionStorage.removeItem("sonidovivo_refresh_token");
        return errorCierre;
      },
      actualizarPerfil: async (usuario) => {
        try {
          const { data } = await api.put<AuthResponse>("/auth/profile", {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            fechaNacimiento: usuario.fechaNacimiento,
            correo: usuario.correo,
            direccion: usuario.direccion,
            region: usuario.region,
            genero: usuario.genero,
          });
          localStorage.setItem("sonidovivo_refresh_token", data.refreshToken);
          configurarTokenAcceso(data.token);
          const actualizado = usuarioDesdeAuth(data);
          setUsuarioActual(actualizado);
          return null;
        } catch (error) {
          return errorDeApi(error, "No fue posible actualizar el perfil.");
        }
      },
      guardarUsuarios: async (actualizados) => {
        if (
          !usuarioActual ||
          !["administrador", "vendedor"].includes(usuarioActual.rol)
        ) {
          return "No tienes permisos para gestionar usuarios.";
        }
        if (usuarioActual.rol === "administrador" && !usuariosCargados) {
          return "La lista de usuarios aún no está disponible.";
        }

        const usuariosGuardados: Usuario[] = [];
        const idsActualizados = new Set(
          actualizados.map((usuario) => usuario.id),
        );
        const camposEditables: (keyof Usuario)[] = [
          "nombre",
          "apellido",
          "fechaNacimiento",
          "correo",
          "direccion",
          "region",
          "genero",
          "rol",
          "bloqueado",
        ];

        try {
          for (const usuario of actualizados) {
            const anterior = usuarios.find((item) => item.id === usuario.id);
            if (!anterior) {
              const { data } = await api.post<UsuarioApi>(
                "/admin/usuarios",
                payloadUsuario(usuario),
              );
              usuariosGuardados.push(convertirUsuarioApi(data));
              continue;
            }

            const cambio = camposEditables.some(
              (campo) => anterior[campo] !== usuario[campo],
            );
            const passwordCambiada =
              Boolean(usuario.password) &&
              usuario.password !== anterior.password;
            if (!cambio && !passwordCambiada) {
              usuariosGuardados.push(anterior);
              continue;
            }

            const { data } = await api.put<UsuarioApi>(
              `/admin/usuarios/${encodeURIComponent(usuario.id)}`,
              payloadUsuario(usuario),
            );
            usuariosGuardados.push(convertirUsuarioApi(data));
          }

          for (const anterior of usuarios) {
            if (!idsActualizados.has(anterior.id)) {
              await api.delete(
                `/admin/usuarios/${encodeURIComponent(anterior.id)}`,
              );
            }
          }

          if (usuarioActual.rol === "administrador") {
            const { data } = await api.get<UsuarioApi[]>("/admin/usuarios");
            setUsuarios(data.map(convertirUsuarioApi));
          } else {
            setUsuarios((actuales) => [...actuales, ...usuariosGuardados]);
          }
          return null;
        } catch (error) {
          return errorDeApi(
            error,
            "No fue posible guardar los cambios de usuario.",
          );
        }
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
    [
      productos,
      categorias,
      catalogoCargando,
      catalogoError,
      usuariosCargando,
      usuariosError,
      usuariosCargados,
      carrito,
      usuarios,
      usuarioActual,
    ],
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
