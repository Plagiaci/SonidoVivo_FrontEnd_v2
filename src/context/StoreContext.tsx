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
  authApi,
  configurarTokenAcceso,
  guardarRefreshToken,
  obtenerRefreshToken,
  renovarSesion,
  type AuthResponse,
} from "../api/axiosConfig";

import type { Producto } from "../types/Producto";

export type { AuthResponse } from "../api/axiosConfig";

const CLAVE_CARRITO = "sonidovivo_carrito";
const CLAVE_SESION = "sonidovivo_sesion";

export type RolUsuario =
  | "cliente"
  | "vendedor"
  | "administrador";


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
  email: string;
  rol: string;
}


interface CategoriaApi {
  id: number;
  nombre: string;
}


interface ErrorApi {
  error?: string;
  mensaje?: string;
  detail?: string;
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

  agregarAlCarrito: (
    idProducto: string,
  ) => boolean;

  cambiarCantidadCarrito: (
    idProducto: string,
    cantidad: number,
  ) => boolean;

  eliminarDelCarrito: (
    idProducto: string,
  ) => void;

  vaciarCarrito: () => void;

  finalizarCompra: () =>
    Promise<string | null>;

  establecerSesion: (
    sesion: AuthResponse,
  ) => void;

  cerrarSesion: () =>
    Promise<string | null>;

  actualizarPerfil: (
    usuario: Usuario,
  ) => Promise<string | null>;

  guardarUsuarios: (
    usuarios: Usuario[],
  ) => Promise<string | null>;

  actualizarStock: (
    idProducto: string,
    stock: number,
  ) => Promise<boolean>;

  actualizarProducto: (
    producto: Producto,
  ) => Promise<boolean>;

  crearProducto: (
    producto: Producto,
  ) => Promise<boolean>;

  eliminarProducto: (
    idProducto: string,
  ) => Promise<boolean>;

  crearCategoria: (
    nombre: string,
  ) => Promise<boolean>;

  actualizarCategoria: (
    nombreActual: string,
    nombreNuevo: string,
  ) => Promise<boolean>;

  eliminarCategoria: (
    nombre: string,
  ) => Promise<boolean>;
}


const StoreContext =
  createContext<StoreContextValue | null>(
    null,
  );


function leerLocalStorage<T>(
  clave: string,
  valorInicial: T,
): T {
  const valor =
    localStorage.getItem(clave);

  if (valor === null) {
    return valorInicial;
  }

  try {
    return JSON.parse(valor) as T;
  } catch {
    localStorage.removeItem(clave);
    return valorInicial;
  }
}


function normalizarProducto(
  producto: Producto,
): Producto {
  const categoria =
    producto.categoria as unknown;

  const nombreCategoria =
    typeof categoria === "string"
      ? categoria
      : categoria &&
          typeof categoria === "object" &&
          "nombre" in categoria
        ? String(
            (
              categoria as {
                nombre: unknown;
              }
            ).nombre,
          )
        : "";

  return {
    ...producto,
    categoria: nombreCategoria,
  };
}


function convertirUsuarioApi(
  usuario: UsuarioApi,
): Usuario {
  const roles:
    Record<string, RolUsuario> = {
      CLIENTE: "cliente",
      VENDEDOR: "vendedor",
      ADMINISTRADOR: "administrador",
    };

  const rol =
    roles[usuario.rol.toUpperCase()];

  if (!rol) {
    throw new Error(
      "El backend devolvió un rol desconocido.",
    );
  }

  return {
    id: String(usuario.id),
    nombre: usuario.nombre,

    // El backend actual no guarda
    // estos datos todavía.
    apellido: "",
    fechaNacimiento: "",

    correo: usuario.email,
    password: "",

    direccion: "",
    region: "",
    genero: "",

    intentosFallidos: 0,
    bloqueado: false,

    rol,
  };
}


function usuarioDesdeAuth(
  sesion: AuthResponse,
): Usuario {
  const roles:
    Record<string, RolUsuario> = {
      CLIENTE: "cliente",
      VENDEDOR: "vendedor",
      ADMINISTRADOR: "administrador",
    };

  const rol =
    roles[sesion.rol.toUpperCase()];

  if (!rol) {
    throw new Error(
      "El backend devolvió un rol desconocido.",
    );
  }

  return {
    id: sesion.email,
    nombre: sesion.nombre,

    apellido: "",
    fechaNacimiento: "",

    correo: sesion.email,
    password: "",

    direccion: "",
    region: "",
    genero: "",

    intentosFallidos: 0,
    bloqueado: false,

    rol,
  };
}


function payloadUsuario(
  usuario: Usuario,
) {
  return {
    nombre: usuario.nombre,
    email: usuario.correo,

    password:
      usuario.password || "",

    rol: usuario.rol.toUpperCase(),
  };
}


function errorDeApi(
  error: unknown,
  fallback: string,
): string {
  if (isAxiosError<ErrorApi>(error)) {
    return (
      error.response?.data?.mensaje ??
      error.response?.data?.detail ??
      error.response?.data?.error ??
      fallback
    );
  }

  return fallback;
}


function cargarSesion():
  Usuario | null {
  const sesion =
    sessionStorage.getItem(
      CLAVE_SESION,
    );

  if (!sesion) {
    return null;
  }

  try {
    const usuario =
      JSON.parse(sesion) as Usuario;

    if (
      !usuario.correo ||
      ![
        "cliente",
        "vendedor",
        "administrador",
      ].includes(usuario.rol)
    ) {
      throw new Error(
        "Sesión inválida",
      );
    }

    return {
      ...usuario,
      password: "",
    };
  } catch {
    sessionStorage.removeItem(
      CLAVE_SESION,
    );

    configurarTokenAcceso(null);
    guardarRefreshToken(null);

    return null;
  }
}


async function obtenerCategoria(
  nombre: string,
): Promise<CategoriaApi | null> {
  const { data } =
    await api.get<CategoriaApi[]>(
      "/categorias",
    );

  return (
    data.find(
      (categoria) =>
        categoria.nombre
          .toLowerCase() ===
        nombre.toLowerCase(),
    ) ?? null
  );
}


async function productoParaBackend(
  producto: Producto,
) {
  const categoria =
    await obtenerCategoria(
      producto.categoria,
    );

  if (!categoria) {
    throw new Error(
      "La categoría seleccionada no existe.",
    );
  }

  return {
    id: producto.id,
    nombre: producto.nombre,
    marca: producto.marca,
    modelo: producto.modelo,
    stock: producto.stock,
    precio: producto.precio,
    descripcion:
      producto.descripcion,
    categoria,
  };
}


export const StoreProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [
    productos,
    setProductos,
  ] = useState<Producto[]>([]);

  const [
    categorias,
    setCategorias,
  ] = useState<string[]>([]);

  const [
    catalogoCargando,
    setCatalogoCargando,
  ] = useState(true);

  const [
    catalogoError,
    setCatalogoError,
  ] = useState("");

  const [
    carrito,
    setCarrito,
  ] = useState<ItemCarrito[]>(() =>
    leerLocalStorage<ItemCarrito[]>(
      CLAVE_CARRITO,
      [],
    ),
  );

  const [
    usuarios,
    setUsuarios,
  ] = useState<Usuario[]>([]);

  const [
    usuariosCargando,
    setUsuariosCargando,
  ] = useState(false);

  const [
    usuariosError,
    setUsuariosError,
  ] = useState("");

  const [
    usuariosCargados,
    setUsuariosCargados,
  ] = useState(false);

  const [
    usuarioActual,
    setUsuarioActual,
  ] = useState<Usuario | null>(
    cargarSesion,
  );


  // ==========================================
  // Eventos de sesión
  // ==========================================

  useEffect(() => {
    const cerrarSesionExpirada =
      () => {
        configurarTokenAcceso(null);
        guardarRefreshToken(null);

        sessionStorage.removeItem(
          CLAVE_SESION,
        );

        setUsuarioActual(null);
        setCarrito([]);
      };

    const actualizarSesionRenovada =
      (evento: Event) => {
        const sesion = (
          evento as CustomEvent<AuthResponse>
        ).detail;

        if (sesion) {
          setUsuarioActual(
            usuarioDesdeAuth(sesion),
          );
        }
      };

    window.addEventListener(
      "sonidovivo:unauthorized",
      cerrarSesionExpirada,
    );

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


  // ==========================================
  // Restaurar / renovar sesión
  // ==========================================

  useEffect(() => {
    if (!usuarioActual) {
      return;
    }

    let activo = true;

    renovarSesion()
      .then((sesion) => {
        if (activo) {
          setUsuarioActual(
            usuarioDesdeAuth(
              sesion,
            ),
          );
        }
      })
      .catch(() => {
        if (activo) {
          configurarTokenAcceso(
            null,
          );

          guardarRefreshToken(
            null,
          );

          sessionStorage.removeItem(
            CLAVE_SESION,
          );

          setUsuarioActual(null);
          setCarrito([]);
        }
      });

    return () => {
      activo = false;
    };
  }, []);


  // ==========================================
  // Cargar productos y categorías
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function cargarCatalogo() {
      setCatalogoCargando(true);

      try {
        const [
          respuestaProductos,
          respuestaCategorias,
        ] = await Promise.all([
          api.get<Producto[]>(
            "/productos",
          ),

          api.get<CategoriaApi[]>(
            "/categorias",
          ),
        ]);

        if (!activo) {
          return;
        }

        const productosRecibidos =
          respuestaProductos.data;

        if (
          !Array.isArray(
            productosRecibidos,
          )
        ) {
          throw new Error(
            "La respuesta del catálogo no es válida.",
          );
        }

        const normalizados =
          productosRecibidos.map(
            normalizarProducto,
          );

        setProductos(
          normalizados,
        );

        setCategorias(
          respuestaCategorias.data.map(
            (categoria) =>
              categoria.nombre,
          ),
        );

        setCatalogoError("");
      } catch (error) {
        console.error(
          "Error al cargar productos:",
          error,
        );

        if (activo) {
          setCatalogoError(
            "No fue posible cargar el catálogo. Comprueba que el backend esté disponible.",
          );
        }
      } finally {
        if (activo) {
          setCatalogoCargando(
            false,
          );
        }
      }
    }

    cargarCatalogo();

    return () => {
      activo = false;
    };
  }, []);


  // ==========================================
  // Cargar usuarios ADMIN
  // ==========================================

  useEffect(() => {
    let activo = true;

    if (
      usuarioActual?.rol !==
      "administrador"
    ) {
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
      .get<UsuarioApi[]>(
        "/admin/usuarios",
      )
      .then(({ data }) => {
        if (activo) {
          setUsuarios(
            data.map(
              convertirUsuarioApi,
            ),
          );

          setUsuariosError("");
          setUsuariosCargados(
            true,
          );
        }
      })
      .catch((error) => {
        if (activo) {
          setUsuariosError(
            errorDeApi(
              error,
              "No fue posible cargar los usuarios.",
            ),
          );

          setUsuariosCargados(
            false,
          );
        }
      })
      .finally(() => {
        if (activo) {
          setUsuariosCargando(
            false,
          );
        }
      });

    return () => {
      activo = false;
    };
  }, [usuarioActual?.rol]);


  // ==========================================
  // Guardar carrito
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      CLAVE_CARRITO,
      JSON.stringify(carrito),
    );
  }, [carrito]);


  // ==========================================
  // Guardar sesión
  // ==========================================

  useEffect(() => {
    if (usuarioActual) {
      sessionStorage.setItem(
        CLAVE_SESION,

        JSON.stringify({
          ...usuarioActual,
          password: "",
        }),
      );

      localStorage.removeItem(
        CLAVE_SESION,
      );
    } else {
      localStorage.removeItem(
        CLAVE_SESION,
      );

      sessionStorage.removeItem(
        CLAVE_SESION,
      );
    }
  }, [usuarioActual]);


  const value =
    useMemo<StoreContextValue>(
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


        // ======================================
        // CARRITO
        // ======================================

        agregarAlCarrito: (
          idProducto,
        ) => {
          if (!usuarioActual) {
            return false;
          }

          const producto =
            productos.find(
              (item) =>
                item.id ===
                idProducto,
            );

          if (
            !producto ||
            producto.stock <= 0
          ) {
            return false;
          }

          const existente =
            carrito.find(
              (item) =>
                item.idProducto ===
                idProducto,
            );

          if (
            existente &&
            existente.cantidad >=
              producto.stock
          ) {
            return false;
          }

          setCarrito(
            existente
              ? carrito.map(
                  (item) =>
                    item.idProducto ===
                    idProducto
                      ? {
                          ...item,

                          cantidad:
                            item.cantidad +
                            1,
                        }
                      : item,
                )
              : [
                  ...carrito,

                  {
                    idProducto:
                      producto.id,

                    nombre:
                      producto.nombre,

                    precio:
                      producto.precio,

                    cantidad: 1,
                  },
                ],
          );

          return true;
        },


        cambiarCantidadCarrito: (
          idProducto,
          cantidad,
        ) => {
          if (
            !Number.isInteger(
              cantidad,
            ) ||
            cantidad < 1
          ) {
            return false;
          }

          const producto =
            productos.find(
              (item) =>
                item.id ===
                idProducto,
            );

          if (
            !producto ||
            cantidad >
              producto.stock
          ) {
            return false;
          }

          setCarrito(
            (actual) =>
              actual.map(
                (item) =>
                  item.idProducto ===
                  idProducto
                    ? {
                        ...item,
                        cantidad,
                      }
                    : item,
              ),
          );

          return true;
        },


        eliminarDelCarrito: (
          idProducto,
        ) => {
          setCarrito(
            (actual) =>
              actual.filter(
                (item) =>
                  item.idProducto !==
                  idProducto,
              ),
          );
        },


        vaciarCarrito: () => {
          setCarrito([]);
        },


        // ======================================
        // COMPRA
        // ======================================

        finalizarCompra:
          async () => {
            if (
              !usuarioActual
            ) {
              return "Debes iniciar sesión para realizar una compra.";
            }

            if (
              usuarioActual.rol !==
              "cliente"
            ) {
              return "Solo los clientes pueden realizar compras.";
            }

            if (
              carrito.length === 0
            ) {
              return "No existen productos para comprar.";
            }

            try {
              await api.post(
                "/compras",
                {
                  items:
                    carrito.map(
                      (item) => ({
                        productoId:
                          item.idProducto,

                        cantidad:
                          item.cantidad,
                      }),
                    ),
                },
              );
            } catch (error) {
              return errorDeApi(
                error,
                "No fue posible completar la compra.",
              );
            }

            // Actualizar stock visual.
            const actualizados =
              productos.map(
                (producto) => {
                  const item =
                    carrito.find(
                      (actual) =>
                        actual.idProducto ===
                        producto.id,
                    );

                  return item
                    ? {
                        ...producto,

                        stock:
                          producto.stock -
                          item.cantidad,
                      }
                    : producto;
                },
              );

            setProductos(
              actualizados,
            );

            setCarrito([]);

            return null;
          },


        // ======================================
        // LOGIN
        // ======================================

        establecerSesion: (
          sesion,
        ) => {
          configurarTokenAcceso(
            sesion.token,
          );

          guardarRefreshToken(
            sesion.refreshToken,
          );

          const usuario =
            usuarioDesdeAuth(
              sesion,
            );

          sessionStorage.setItem(
            CLAVE_SESION,
            JSON.stringify(
              usuario,
            ),
          );

          setUsuarioActual(
            usuario,
          );
        },


        // ======================================
        // LOGOUT
        // ======================================

        cerrarSesion:
          async () => {
            const refreshToken =
              obtenerRefreshToken();

            let errorCierre:
              | string
              | null = null;

            try {
              if (
                refreshToken
              ) {
                await authApi.post(
                  "/logout",
                  {
                    refreshToken,
                  },
                );
              }
            } catch (error) {
              errorCierre =
                errorDeApi(
                  error,

                  "La sesión local se cerró, pero no se pudo invalidar la sesión del servidor.",
                );
            }

            configurarTokenAcceso(
              null,
            );

            guardarRefreshToken(
              null,
            );

            setUsuarioActual(
              null,
            );

            setCarrito([]);

            sessionStorage.removeItem(
              CLAVE_SESION,
            );

            return errorCierre;
          },


        // ======================================
        // PERFIL
        // ======================================

        actualizarPerfil:
          async () => {
            /*
             * Nuestro backend actual
             * todavía no tiene:
             *
             * PUT /usuarios/me
             *
             * Por eso evitamos enviar una
             * petición a una ruta inexistente.
             */

            return "La edición del perfil todavía no está habilitada en el backend.";
          },


        // ======================================
        // ADMIN - USUARIOS
        // ======================================

        guardarUsuarios:
          async (
            actualizados,
          ) => {
            if (
              usuarioActual?.rol !==
              "administrador"
            ) {
              return "No tienes permisos para gestionar usuarios.";
            }

            if (
              !usuariosCargados
            ) {
              return "La lista de usuarios aún no está disponible.";
            }

            const idsActualizados =
              new Set(
                actualizados.map(
                  (usuario) =>
                    usuario.id,
                ),
              );

            try {
              // Crear o actualizar.
              for (
                const usuario
                of actualizados
              ) {
                const anterior =
                  usuarios.find(
                    (item) =>
                      item.id ===
                      usuario.id,
                  );

                // Nuevo usuario.
                if (!anterior) {
                  await api.post<UsuarioApi>(
                    "/admin/usuarios",

                    payloadUsuario(
                      usuario,
                    ),
                  );

                  continue;
                }

                const cambio =
                  anterior.nombre !==
                    usuario.nombre ||
                  anterior.correo !==
                    usuario.correo ||
                  anterior.rol !==
                    usuario.rol;

                const passwordCambiada =
                  Boolean(
                    usuario.password,
                  );

                if (
                  !cambio &&
                  !passwordCambiada
                ) {
                  continue;
                }

                await api.put<UsuarioApi>(
                  `/admin/usuarios/${encodeURIComponent(
                    usuario.id,
                  )}`,

                  payloadUsuario(
                    usuario,
                  ),
                );
              }


              // Eliminar usuarios.
              for (
                const anterior
                of usuarios
              ) {
                if (
                  !idsActualizados.has(
                    anterior.id,
                  )
                ) {
                  await api.delete(
                    `/admin/usuarios/${encodeURIComponent(
                      anterior.id,
                    )}`,
                  );
                }
              }


              // Volver a consultar
              // MySQL después de guardar.
              const { data } =
                await api.get<
                  UsuarioApi[]
                >(
                  "/admin/usuarios",
                );

              setUsuarios(
                data.map(
                  convertirUsuarioApi,
                ),
              );

              return null;
            } catch (error) {
              return errorDeApi(
                error,

                "No fue posible guardar los cambios de usuario.",
              );
            }
          },


        // ======================================
        // STOCK
        // ======================================

        actualizarStock:
          async (
            idProducto,
            stock,
          ) => {
            /*
             * Nuestro backend protege
             * modificación de productos
             * para ADMINISTRADOR.
             */

            if (
              usuarioActual?.rol !==
                "administrador" ||
              !Number.isInteger(
                stock,
              ) ||
              stock < 0
            ) {
              return false;
            }

            const producto =
              productos.find(
                (item) =>
                  item.id ===
                  idProducto,
              );

            if (!producto) {
              return false;
            }

            try {
              const payload =
                await productoParaBackend(
                  {
                    ...producto,
                    stock,
                  },
                );

              const { data } =
                await api.put<Producto>(
                  `/productos/${encodeURIComponent(
                    idProducto,
                  )}`,

                  payload,
                );

              const actualizado =
                normalizarProducto(
                  data,
                );

              setProductos(
                (actuales) =>
                  actuales.map(
                    (item) =>
                      item.id ===
                      idProducto
                        ? actualizado
                        : item,
                  ),
              );

              return true;
            } catch {
              return false;
            }
          },


        // ======================================
        // ADMIN - CREAR PRODUCTO
        // ======================================

        crearProducto:
          async (
            nuevoProducto,
          ) => {
            if (
              usuarioActual?.rol !==
              "administrador"
            ) {
              return false;
            }

            if (
              !nuevoProducto.id.trim() ||
              !nuevoProducto
                .categoria
                .trim() ||
              !nuevoProducto
                .nombre
                .trim() ||
              !nuevoProducto
                .marca
                .trim() ||
              !nuevoProducto
                .modelo
                .trim() ||
              !nuevoProducto
                .descripcion
                .trim()
            ) {
              return false;
            }

            if (
              !Number.isInteger(
                nuevoProducto.stock,
              ) ||
              nuevoProducto.stock <
                0
            ) {
              return false;
            }

            if (
              !Number.isFinite(
                nuevoProducto.precio,
              ) ||
              nuevoProducto.precio <=
                0
            ) {
              return false;
            }

            const existe =
              productos.some(
                (producto) =>
                  producto.id ===
                  nuevoProducto.id,
              );

            if (existe) {
              return false;
            }

            try {
              const payload =
                await productoParaBackend(
                  nuevoProducto,
                );

              const { data } =
                await api.post<Producto>(
                  "/productos",
                  payload,
                );

              const creado =
                normalizarProducto(
                  data,
                );

              setProductos(
                (actuales) => [
                  ...actuales,
                  creado,
                ],
              );

              return true;
            } catch {
              return false;
            }
          },


        // ======================================
        // ADMIN - ELIMINAR PRODUCTO
        // ======================================

        eliminarProducto:
          async (
            idProducto,
          ) => {
            if (
              usuarioActual?.rol !==
              "administrador"
            ) {
              return false;
            }

            const existe =
              productos.some(
                (producto) =>
                  producto.id ===
                  idProducto,
              );

            if (!existe) {
              return false;
            }

            try {
              await api.delete(
                `/productos/${encodeURIComponent(
                  idProducto,
                )}`,
              );

              setProductos(
                (actuales) =>
                  actuales.filter(
                    (producto) =>
                      producto.id !==
                      idProducto,
                  ),
              );

              setCarrito(
                (actual) =>
                  actual.filter(
                    (item) =>
                      item.idProducto !==
                      idProducto,
                  ),
              );

              return true;
            } catch {
              return false;
            }
          },


        // ======================================
        // ADMIN - CREAR CATEGORÍA
        // ======================================

        crearCategoria:
          async (nombre) => {
            if (
              usuarioActual?.rol !==
              "administrador"
            ) {
              return false;
            }

            const nuevaCategoria =
              nombre.trim();

            if (!nuevaCategoria) {
              return false;
            }

            const existe =
              categorias.some(
                (categoria) =>
                  categoria.toLowerCase() ===
                  nuevaCategoria.toLowerCase(),
              );

            if (existe) {
              return false;
            }

            try {
              const { data } =
                await api.post<CategoriaApi>(
                  "/categorias",
                  {
                    nombre:
                      nuevaCategoria,
                  },
                );

              setCategorias(
                (actuales) => [
                  ...actuales,
                  data.nombre,
                ],
              );

              return true;
            } catch {
              return false;
            }
          },


        // ======================================
        // ADMIN - ACTUALIZAR CATEGORÍA
        // ======================================

        actualizarCategoria:
          async (
            nombreActual,
            nombreNuevo,
          ) => {
            if (
              usuarioActual?.rol !==
              "administrador"
            ) {
              return false;
            }

            const nuevoNombre =
              nombreNuevo.trim();

            if (!nuevoNombre) {
              return false;
            }

            const existe =
              categorias.some(
                (categoria) =>
                  categoria.toLowerCase() ===
                    nuevoNombre.toLowerCase() &&
                  categoria !==
                    nombreActual,
              );

            if (existe) {
              return false;
            }

            try {
              const { data } =
                await api.get<
                  CategoriaApi[]
                >(
                  "/categorias",
                );

              const categoria =
                data.find(
                  (item) =>
                    item.nombre ===
                    nombreActual,
                );

              if (!categoria) {
                return false;
              }

              await api.put(
                `/categorias/${categoria.id}`,
                {
                  id:
                    categoria.id,

                  nombre:
                    nuevoNombre,
                },
              );

              setCategorias(
                (actuales) =>
                  actuales.map(
                    (item) =>
                      item ===
                      nombreActual
                        ? nuevoNombre
                        : item,
                  ),
              );

              setProductos(
                (actuales) =>
                  actuales.map(
                    (producto) =>
                      producto.categoria ===
                      nombreActual
                        ? {
                            ...producto,

                            categoria:
                              nuevoNombre,
                          }
                        : producto,
                  ),
              );

              return true;
            } catch {
              return false;
            }
          },


        // ======================================
        // ADMIN - ELIMINAR CATEGORÍA
        // ======================================

        eliminarCategoria:
          async (nombre) => {
            if (
              usuarioActual?.rol !==
              "administrador"
            ) {
              return false;
            }

            const tieneProductos =
              productos.some(
                (producto) =>
                  producto.categoria ===
                  nombre,
              );

            if (
              tieneProductos
            ) {
              return false;
            }

            try {
              const { data } =
                await api.get<
                  CategoriaApi[]
                >(
                  "/categorias",
                );

              const categoria =
                data.find(
                  (item) =>
                    item.nombre ===
                    nombre,
                );

              if (!categoria) {
                return false;
              }

              await api.delete(
                `/categorias/${categoria.id}`,
              );

              setCategorias(
                (actuales) =>
                  actuales.filter(
                    (item) =>
                      item !== nombre,
                  ),
              );

              return true;
            } catch {
              return false;
            }
          },


        // ======================================
        // ADMIN - ACTUALIZAR PRODUCTO
        // ======================================

        actualizarProducto:
          async (
            actualizado,
          ) => {
            if (
              usuarioActual?.rol !==
                "administrador" ||
              !Number.isInteger(
                actualizado.stock,
              ) ||
              actualizado.stock <
                0 ||
              !Number.isFinite(
                actualizado.precio,
              ) ||
              actualizado.precio <=
                0 ||
              !actualizado
                .categoria
                .trim() ||
              !actualizado
                .nombre
                .trim() ||
              !actualizado
                .marca
                .trim() ||
              !actualizado
                .modelo
                .trim() ||
              !actualizado
                .descripcion
                .trim()
            ) {
              return false;
            }

            try {
              const payload =
                await productoParaBackend(
                  actualizado,
                );

              const { data } =
                await api.put<Producto>(
                  `/productos/${encodeURIComponent(
                    actualizado.id,
                  )}`,

                  payload,
                );

              const normalizado =
                normalizarProducto(
                  data,
                );

              setProductos(
                (actuales) =>
                  actuales.map(
                    (producto) =>
                      producto.id ===
                      actualizado.id
                        ? normalizado
                        : producto,
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
    <StoreContext.Provider
      value={value}
    >
      {children}
    </StoreContext.Provider>
  );
};


export function useStore():
  StoreContextValue {
  const context =
    useContext(StoreContext);

  if (!context) {
    throw new Error(
      "useStore debe usarse dentro de StoreProvider.",
    );
  }

  return context;
}