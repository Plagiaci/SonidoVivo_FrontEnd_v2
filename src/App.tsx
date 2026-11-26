import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { StoreProvider } from "./context/StoreContext";
import { Perfil } from "./pages/Perfil";
import {
  Carrito,
  Catalogo,
  Detalle,
  DetalleAntiguo,
  Inicio,
} from "./pages/store";
import {
  Gestion,
  RutaAdministrador,
  RutaUsuario,
  RutaVendedor,
} from "./pages/ManagementPages";
import { AdminPage } from "./pages/admin/AdminPage";
import { VendedorPage } from "./pages/VendedorPage";
import { Login } from "./pages/LoginPage";
import { Registro } from "./pages/RegistroPage";
import { HistorialPedidos } from "./pages/store/HistorialPedidos";
import { useStore } from "./context/StoreContext";

function Aplicacion() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Header />
          <EstadoCatalogo />
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/detalle/:id" element={<Detalle />} />
            <Route
              path="/carrito"
              element={
                <RutaUsuario>
                  <Carrito />
                </RutaUsuario>
              }
            />
            <Route
              path="/gestion"
              element={
                <RutaUsuario>
                  <Gestion />
                </RutaUsuario>
              }
            />
            <Route
              path="/administracion"
              element={
                <RutaAdministrador>
                  <AdminPage />
                </RutaAdministrador>
              }
            />
            <Route
              path="/ventas"
              element={
                <RutaVendedor>
                  <VendedorPage />
                </RutaVendedor>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route
              path="/perfil"
              element={
                <RutaUsuario>
                  <Perfil />
                </RutaUsuario>
              }
            />
            <Route
              path="/mis-pedidos"
              element={
                <RutaUsuario>
                  <HistorialPedidos />
                </RutaUsuario>
              }
            />
            <Route
              path="/html/index.html"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/html/catalogo.html"
              element={<Navigate to="/catalogo" replace />}
            />
            <Route
              path="/html/carrito.html"
              element={<Navigate to="/carrito" replace />}
            />
            <Route
              path="/html/login.html"
              element={<Navigate to="/login" replace />}
            />
            <Route
              path="/html/registro.html"
              element={<Navigate to="/registro" replace />}
            />
            <Route path="/html/detalle.html" element={<DetalleAntiguo />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      </BrowserRouter>
    </StoreProvider>
  );
}

function EstadoCatalogo() {
  const { catalogoCargando, catalogoError } = useStore();

  if (catalogoError) {
    return (
      <div className="container pt-3">
        <div className="alert alert-danger mb-0" role="alert">
          {catalogoError}
        </div>
      </div>
    );
  }

  if (catalogoCargando) {
    return (
      <div className="container pt-3">
        <p className="text-secondary mb-0" role="status">
          Cargando catálogo…
        </p>
      </div>
    );
  }

  return null;
}

export default Aplicacion;
