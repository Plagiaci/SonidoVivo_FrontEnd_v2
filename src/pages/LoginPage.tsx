import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { api } from "../api/axiosConfig";
import { Mensaje } from "../components/PageHelpers";
import { useStore, type AuthResponse } from "../context/StoreContext";

export function Login() {
  const { establecerSesion } = useStore();
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

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
        </div>
      </div>
    </main>
  );
}
