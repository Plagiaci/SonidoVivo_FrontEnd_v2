import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "../../api/axiosConfig";
import { formatearPrecio } from "../../utils/formatoPrecio";

type PeriodoReporte = "SEMANA" | "MES" | "ANIO";

interface ProductoMasSolicitado {
  productoId: string;
  nombre: string;
  unidades: number;
}

interface ReporteVentas {
  periodo: PeriodoReporte;
  desde: string;
  hasta: string;
  operaciones: number;
  montoVendido: number;
  unidadesVendidas: number;
  productosMasSolicitados: ProductoMasSolicitado[];
}

const periodos: { valor: PeriodoReporte; etiqueta: string }[] = [
  { valor: "SEMANA", etiqueta: "Esta semana" },
  { valor: "MES", etiqueta: "Este mes" },
  { valor: "ANIO", etiqueta: "Este año" },
];

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CL");
}

export function AdminReportsPage() {
  const [periodo, setPeriodo] = useState<PeriodoReporte>("SEMANA");
  const [recarga, setRecarga] = useState(0);
  const [reporte, setReporte] = useState<ReporteVentas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");

    api
      .get<ReporteVentas>("/admin/reportes", { params: { periodo } })
      .then(({ data }) => {
        if (activo) setReporte(data);
      })
      .catch((fallo: unknown) => {
        if (!activo) return;
        setReporte(null);
        setError(
          isAxiosError<{ error?: string }>(fallo)
            ? (fallo.response?.data?.error ??
                "No fue posible cargar el reporte.")
            : "No fue posible cargar el reporte.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [periodo, recarga]);

  return (
    <details className="card shadow-sm border-0 mb-3">
      <summary
        className="card-header bg-body p-4"
        style={{ cursor: "pointer" }}
      >
        <h2 className="h5 fw-bold mb-0">Reportes de ventas</h2>
      </summary>
      <div className="card-body p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
          <div>
            <p className="text-secondary mb-0">
              Los pedidos cancelados no se incluyen en los indicadores.
            </p>
          </div>
          <div className="d-flex flex-column flex-sm-row align-items-sm-end gap-2">
            <label className="form-label mb-0">
              Período
              <select
                className="form-select mt-1"
                value={periodo}
                onChange={(evento) =>
                  setPeriodo(evento.target.value as PeriodoReporte)
                }
              >
                {periodos.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn btn-outline-primary"
              type="button"
              disabled={cargando}
              onClick={() => setRecarga((actual) => actual + 1)}
            >
              Actualizar
            </button>
          </div>
        </div>

        {cargando && (
          <p className="text-secondary" role="status">
            Cargando reporte…
          </p>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {reporte && !cargando && (
          <>
            <p className="small text-secondary">
              Desde {formatearFecha(reporte.desde)} hasta{" "}
              {formatearFecha(reporte.hasta)}
            </p>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <article className="border rounded p-3 h-100">
                  <p className="text-secondary mb-1">Pedidos válidos</p>
                  <p className="h3 fw-bold mb-0">{reporte.operaciones}</p>
                </article>
              </div>
              <div className="col-12 col-md-4">
                <article className="border rounded p-3 h-100">
                  <p className="text-secondary mb-1">Monto vendido</p>
                  <p className="h3 fw-bold mb-0">
                    {formatearPrecio(reporte.montoVendido)}
                  </p>
                </article>
              </div>
              <div className="col-12 col-md-4">
                <article className="border rounded p-3 h-100">
                  <p className="text-secondary mb-1">Unidades vendidas</p>
                  <p className="h3 fw-bold mb-0">{reporte.unidadesVendidas}</p>
                </article>
              </div>
            </div>

            <h3 className="h5 fw-bold">Productos más solicitados</h3>
            {reporte.productosMasSolicitados.length === 0 ? (
              <p className="text-secondary mb-0">
                No hay ventas para este período.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="text-end">Unidades vendidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.productosMasSolicitados.map((producto) => (
                      <tr key={producto.productoId}>
                        <td>{producto.nombre}</td>
                        <td className="text-end">{producto.unidades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
