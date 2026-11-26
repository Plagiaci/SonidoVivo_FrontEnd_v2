import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { api } from "../api/axiosConfig";
import { Mensaje } from "../components/PageHelpers";
import { useStore, type AuthResponse } from "../context/StoreContext";

const cuentasDePrueba = import.meta.env.DEV
  ? [
      {
        rol: "Cliente",
        correo: import.meta.env.VITE_DEMO_CLIENTE_EMAIL ?? "",
        password: import.meta.env.VITE_DEMO_CLIENTE_PASSWORD ?? "",
      },
      {
        rol: "Vendedor",
        correo: import.meta.env.VITE_DEMO_VENDEDOR_EMAIL ?? "",
        password: import.meta.env.VITE_DEMO_VENDEDOR_PASSWORD ?? "",
      },
      {
        rol: "Administrador",
        correo: import.meta.env.VITE_DEMO_ADMIN_EMAIL ?? "",
        password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD ?? "",
      },
    ].filter((cuenta) => cuenta.correo && cuenta.password)
  : [];

export function Login() {
  const { establecerSesion } = useStore();
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();
  const correoInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  const iniciarSesion = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formElement = evento.currentTarget;
    const formulario = new FormData(formElement);
    const correo = String(formulario.get("correo") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formulario.get("password") ?? "");
    if (!correo) return setMensaje("Debe ingresar su correo.");
    if (!password) return setMensaje("Debe ingresar su contraseña.");

    try {
      const { data } = await api.post<AuthResponse>("/auth/login", {
        correo,
        password,
      });
      establecerSesion(data);
      navigate(data.rol === "CLIENTE" ? "/catalogo" : "/gestion");
      formElement.reset();
    } catch (error) {
      setMensaje(
        isAxiosError<{ error?: string }>(error)
          ? (error.response?.data?.error ??
              "No fue posible conectar con el servidor.")
          : "No fue posible iniciar sesión.",
      );
    }
  };

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-5">
          <section className="mb-4 text-center">
            <span className="badge text-bg-secondary mb-3">Acceso</span>
            <h1 className="display-6 fw-bold">Iniciar sesión</h1>
            <p className="text-secondary">
              Ingresa con tu correo y contraseña.
            </p>
          </section>
          <section className="card shadow-sm border-0">
            <div className="card-body p-4 p-md-5">
              <form onSubmit={iniciarSesion}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="correo">
                    Correo electrónico
                  </label>
                  <input
                    className="form-control"
                    id="correo"
                    name="correo"
                    type="email"
                    autoComplete="email"
                    ref={correoInput}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="password">
                    Contraseña
                  </label>
                  <input
                    className="form-control"
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    ref={passwordInput}
                  />
                </div>
                <div className="d-grid mt-4">
                  <button className="btn btn-primary btn-lg" type="submit">
                    Ingresar
                  </button>
                </div>
              </form>
              <Mensaje texto={mensaje} />
              <p className="text-center text-secondary mt-4 mb-0">
                ¿No tienes una cuenta?{" "}
                <Link to="/registro">Regístrate aquí</Link>
              </p>
            </div>
          </section>
          {import.meta.env.DEV && (
            <section className="card border-info shadow-sm mt-4">
              <div className="card-body p-4">
                <h2 className="h5 fw-bold">Usuarios de prueba</h2>
                <p className="small text-secondary">
                  Solo para desarrollo local. Usa cuentas ficticias, nunca
                  credenciales reales.
                </p>
                {cuentasDePrueba.map((cuenta) => (
                  <div className="border rounded p-3 mb-2" key={cuenta.rol}>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="small">
                        <strong>{cuenta.rol}</strong>
                        <div>Correo: {cuenta.correo}</div>
                        <div>
                          Contraseña: <code>{cuenta.password}</code>
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-primary flex-shrink-0"
                        type="button"
                        onClick={() => {
                          if (correoInput.current) {
                            correoInput.current.value = cuenta.correo;
                          }
                          if (passwordInput.current) {
                            passwordInput.current.value = cuenta.password;
                          }
                          setMensaje("");
                        }}
                      >
                        Completar
                      </button>
                    </div>
                  </div>
                ))}
                {cuentasDePrueba.length < 3 && (
                  <p className="small text-secondary mb-0">
                    Configura las cuentas en el archivo local `.env.local` para
                    mostrarlas aquí.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
