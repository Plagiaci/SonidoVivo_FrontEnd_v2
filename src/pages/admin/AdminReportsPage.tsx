import {
  useEffect,
  useState,
} from "react";

import { isAxiosError } from "axios";

import { api } from "../../api/axiosConfig";

import {
  formatearPrecio,
} from "../../utils/formatoPrecio";


type PeriodoReporte =
  | "SEMANA"
  | "MES"
  | "ANIO";


interface ProductoMasVendido {
  productoId: string;
  nombre: string;
  cantidadVendida: number;
}


interface ReporteVentas {
  periodo: string;

  totalOperaciones: number;

  totalVendido: number;

  productosVendidos: number;

  productosMasVendidos:
    ProductoMasVendido[];
}


interface ErrorApi {
  error?: string;
  mensaje?: string;
}


const periodos: {
  valor: PeriodoReporte;
  etiqueta: string;
}[] = [
  {
    valor: "SEMANA",
    etiqueta: "Esta semana",
  },

  {
    valor: "MES",
    etiqueta: "Este mes",
  },

  {
    valor: "ANIO",
    etiqueta: "Este año",
  },
];


export function AdminReportsPage() {

  const [
    periodo,
    setPeriodo,
  ] = useState<PeriodoReporte>(
    "SEMANA",
  );

  const [
    recarga,
    setRecarga,
  ] = useState(0);

  const [
    reporte,
    setReporte,
  ] = useState<
    ReporteVentas | null
  >(null);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {

    let activo = true;

    async function cargarReporte() {

      setCargando(true);

      setError("");

      try {

        const { data } =
          await api.get<ReporteVentas>(
            "/admin/dashboard",
            {
              params: {
                periodo,
              },
            },
          );

        if (activo) {
          setReporte(data);
        }

      } catch (fallo) {

        if (!activo) {
          return;
        }

        setReporte(null);

        setError(
          isAxiosError<ErrorApi>(
            fallo,
          )
            ? (
                fallo.response?.data
                  ?.mensaje ??
                fallo.response?.data
                  ?.error ??
                "No fue posible cargar el reporte."
              )
            : "No fue posible cargar el reporte.",
        );

      } finally {

        if (activo) {
          setCargando(false);
        }
      }
    }


    cargarReporte();


    return () => {
      activo = false;
    };

  }, [
    periodo,
    recarga,
  ]);


  return (

    <details className="card shadow-sm border-0 mb-3">

      <summary
        className="card-header bg-body p-4"
        style={{
          cursor: "pointer",
        }}
      >

        <h2 className="h5 fw-bold mb-0">
          Reportes de ventas
        </h2>

      </summary>


      <div className="card-body p-4">

        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">

          <div>

            <p className="text-secondary mb-0">
              Los pedidos cancelados
              no se incluyen en los
              indicadores.
            </p>

          </div>


          <div className="d-flex flex-column flex-sm-row align-items-sm-end gap-2">

            <label className="form-label mb-0">

              Período

              <select
                className="form-select mt-1"
                value={periodo}
                onChange={(
                  evento,
                ) =>
                  setPeriodo(
                    evento.target
                      .value as PeriodoReporte,
                  )
                }
              >

                {periodos.map(
                  (opcion) => (

                    <option
                      key={
                        opcion.valor
                      }
                      value={
                        opcion.valor
                      }
                    >
                      {
                        opcion.etiqueta
                      }
                    </option>

                  ),
                )}

              </select>

            </label>


            <button
              className="btn btn-outline-primary"
              type="button"
              disabled={
                cargando
              }
              onClick={() =>
                setRecarga(
                  (actual) =>
                    actual + 1,
                )
              }
            >
              Actualizar
            </button>

          </div>

        </div>


        {cargando && (

          <div
            className="d-flex align-items-center gap-2 py-3"
            role="status"
          >

            <div
              className="spinner-border spinner-border-sm"
              aria-hidden="true"
            />

            <span>
              Cargando reporte...
            </span>

          </div>

        )}


        {error && (

          <div
            className="alert alert-danger"
            role="alert"
          >
            {error}
          </div>

        )}


        {reporte &&
          !cargando && (

            <>

              <p className="small text-secondary">

                Período seleccionado:{" "}

                <strong>
                  {
                    reporte.periodo
                  }
                </strong>

              </p>


              <div className="row g-3 mb-4">


                <div className="col-12 col-md-4">

                  <article className="border rounded p-3 h-100">

                    <p className="text-secondary mb-1">
                      Operaciones
                    </p>

                    <p className="h3 fw-bold mb-0">
                      {
                        reporte.totalOperaciones
                      }
                    </p>

                  </article>

                </div>


                <div className="col-12 col-md-4">

                  <article className="border rounded p-3 h-100">

                    <p className="text-secondary mb-1">
                      Total vendido
                    </p>

                    <p className="h3 fw-bold mb-0">

                      {formatearPrecio(
                        reporte.totalVendido,
                      )}

                    </p>

                  </article>

                </div>


                <div className="col-12 col-md-4">

                  <article className="border rounded p-3 h-100">

                    <p className="text-secondary mb-1">
                      Productos vendidos
                    </p>

                    <p className="h3 fw-bold mb-0">
                      {
                        reporte.productosVendidos
                      }
                    </p>

                  </article>

                </div>

              </div>


              <h3 className="h5 fw-bold">
                Productos más vendidos
              </h3>


              {reporte
                .productosMasVendidos
                .length === 0 ? (

                <p className="text-secondary mb-0">

                  No hay ventas para
                  este período.

                </p>

              ) : (

                <div className="table-responsive">

                  <table className="table align-middle mb-0">

                    <thead>

                      <tr>
                        <th>
                          Producto
                        </th>

                        <th className="text-end">
                          Cantidad vendida
                        </th>
                      </tr>

                    </thead>


                    <tbody>

                      {reporte
                        .productosMasVendidos
                        .map(
                          (
                            producto,
                          ) => (

                            <tr
                              key={
                                producto.productoId
                              }
                            >

                              <td>
                                {
                                  producto.nombre
                                }
                              </td>

                              <td className="text-end">

                                {
                                  producto.cantidadVendida
                                }

                              </td>

                            </tr>

                          ),
                        )}

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