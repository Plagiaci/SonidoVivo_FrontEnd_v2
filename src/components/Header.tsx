import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";

const navigation = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Productos" },
];

export const Header = () => {
  const { carrito, usuarioActual, cerrarSesion } = useStore();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mensajeCierre, setMensajeCierre] = useState("");
  const navigate = useNavigate();
  const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
  const enlaces = [
    ...navigation,
    ...(!usuarioActual
      ? [
          { to: "/registro", label: "Registrarse" },
          { to: "/login", label: "Iniciar sesión" },
        ]
      : []),
    ...(usuarioActual && usuarioActual.rol !== "cliente"
      ? [{ to: "/gestion", label: "Gestión" }]
      : []),
  ];

  const salir = async () => {
    const error = await cerrarSesion();
    setMensajeCierre(error ?? "");
    setMenuAbierto(false);
    navigate("/");
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-dark navbar-dark">
      <div className="container">
        <NavLink className="navbar-brand fw-bold" to="/">
          Sonido Vivo
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="menuPrincipal"
          aria-expanded={menuAbierto}
          aria-label="Mostrar navegación"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div
          className={`collapse navbar-collapse${menuAbierto ? " show" : ""}`}
          id="menuPrincipal"
        >
          <div className="navbar-nav ms-auto">
            {enlaces.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => {
                  const esGestionAdmin =
                    to === "/gestion" && usuarioActual?.rol === "administrador";
                  return `nav-link${isActive ? " active" : ""}${
                    esGestionAdmin ? " gestion-admin" : ""
                  }`;
                }}
                onClick={() => setMenuAbierto(false)}
              >
                {label}
              </NavLink>
            ))}
            {usuarioActual && (
              <NavLink
                to="/carrito"
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                onClick={() => setMenuAbierto(false)}
              >
                Carrito{" "}
                <span className="badge text-bg-warning">{cantidad}</span>
              </NavLink>
            )}
            {(usuarioActual?.rol === "cliente" ||
              usuarioActual?.rol === "vendedor") && (
              <NavLink
                to="/mis-pedidos"
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                onClick={() => setMenuAbierto(false)}
              >
                Mis pedidos
              </NavLink>
            )}
            {usuarioActual && (
              <>
                <NavLink
                  to="/perfil"
                  className="nav-link"
                  onClick={() => setMenuAbierto(false)}
                >
                  {usuarioActual.nombre} · {usuarioActual.rol}
                </NavLink>
                <button
                  className="btn btn-outline-light btn-sm my-1"
                  type="button"
                  onClick={() => void salir()}
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
        </div>
      </nav>
      {mensajeCierre && (
        <div className="container pt-3">
          <div className="alert alert-warning mb-0" role="alert">
            {mensajeCierre}
          </div>
        </div>
      )}
    </>
  );
};
