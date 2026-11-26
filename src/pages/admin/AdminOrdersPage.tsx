import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "../../api/axiosConfig";
import { Mensaje } from "../../components/PageHelpers";
import { formatearPrecio } from "../../utils/formatoPrecio";

type EstadoPedido =
  | "PENDIENTE"
  | "CONFIRMADA"
  | "PREPARANDO"
  | "ENVIADA"
  | "ENTREGADA"
  | "CANCELADA";

interface DetallePedido {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Pedido {
  id: number;
  fecha: string;
  estado: EstadoPedido;
  total: number;

  usuarioId: number;
  nombreCliente: string;
  emailCliente: string;

  detalles: DetallePedido[];
}

interface ErrorApi {
  error?: string;
  mensaje?: string;
}

const estadosSiguientes: Record<
  EstadoPedido,
  EstadoPedido[]
> = {
  PENDIENTE: [
    "CONFIRMADA",
    "CANCELADA",
  ],

  CONFIRMADA: [
    "PREPARANDO",
    "CANCELADA",
  ],

  PREPARANDO: [
    "ENVIADA",
    "CANCELADA",
  ],

  ENVIADA: [
    "ENTREGADA",
  ],

  ENTREGADA: [],

  CANCELADA: [],
};

export function AdminOrdersPage() {
  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  const [mensaje, setMensaje] =
    useState("");

  const [
    tipoMensaje,
    setTipoMensaje,
  ] = useState<
    "danger" | "success"
  >("success");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargarPedidos() {
      setCargando(true);

      try {
        const { data } =
          await api.get<Pedido[]>(
            "/compras",
          );

        if (activo) {
          setPedidos(data);
          setMensaje("");
        }

      } catch (error) {

        if (activo) {
          setTipoMensaje("danger");

          setMensaje(
            isAxiosError<ErrorApi>(
              error,
            )
              ? (
                  error.response?.data
                    ?.mensaje ??
                  error.response?.data
                    ?.error ??
                  "No fue posible cargar los pedidos."
                )
              : "No fue posible cargar los pedidos.",
          );
        }

      } finally {

        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarPedidos();

    return () => {
      activo = false;
    };

  }, []);


  const cambiarEstado =
    async (
      pedido: Pedido,
      estado: EstadoPedido,
    ) => {

      try {

        const { data } =
          await api.patch<Pedido>(
            `/compras/${pedido.id}/estado`,
            {
              estado,
            },
          );

        setPedidos(
          (actuales) =>
            actuales.map(
              (item) =>
                item.id === data.id
                  ? data
                  : item,
            ),
        );

        setTipoMensaje("success");

        setMensaje(
          `El estado del pedido #${pedido.id} se actualizó correctamente.`,
        );

      } catch (error) {

        setTipoMensaje("danger");

        setMensaje(
          isAxiosError<ErrorApi>(
            error,
          )
            ? (
                error.response?.data
                  ?.mensaje ??
                error.response?.data
                  ?.error ??
                "No fue posible actualizar el pedido."
              )
            : "No fue posible actualizar el pedido.",
        );
      }
    };


  return (
    <details className="card shadow-sm border-0 mb-3">

      <summary
        className="card-header bg-body p-4"
        style={{
          cursor: "pointer",
        }}
      >
        <h2 className="h5 fw-bold mb-0">
          Gestión de pedidos
        </h2>
      </summary>


      <div className="card-body p-4">

        <Mensaje
          texto={mensaje}
          tipo={tipoMensaje}
        />


        {cargando ? (

          <div
            className="d-flex align-items-center gap-2 py-3"
            role="status"
          >
            <div
              className="spinner-border spinner-border-sm"
              aria-hidden="true"
            />

            <span>
              Cargando pedidos...
            </span>
          </div>

        ) : pedidos.length === 0 ? (

          !mensaje && (
            <p className="text-secondary mb-0">
              No hay pedidos registrados.
            </p>
          )

        ) : (

          <div className="table-responsive">

            <table className="table align-middle">

              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>


              <tbody>

                {pedidos.map(
                  (pedido) => (

                    <tr key={pedido.id}>

                      <td>
                        #{pedido.id}
                      </td>


                      <td>
                        {new Date(
                          pedido.fecha,
                        ).toLocaleString(
                          "es-CL",
                        )}
                      </td>


                      <td>
                        {
                          pedido.nombreCliente
                        }

                        <br />

                        <small className="text-secondary">
                          {
                            pedido.emailCliente
                          }
                        </small>
                      </td>


                      <td>
                        {pedido.detalles
                          .map(
                            (detalle) =>
                              `${detalle.nombreProducto} × ${detalle.cantidad}`,
                          )
                          .join(", ")}
                      </td>


                      <td>
                        {formatearPrecio(
                          pedido.total,
                        )}
                      </td>


                      <td>

                        <select
                          className="form-select"
                          aria-label={`Estado del pedido ${pedido.id}`}
                          value={
                            pedido.estado
                          }
                          disabled={
                            !estadosSiguientes[
                              pedido.estado
                            ].length
                          }
                          onChange={(
                            evento,
                          ) =>
                            void cambiarEstado(
                              pedido,
                              evento.target
                                .value as EstadoPedido,
                            )
                          }
                        >

                          <option
                            value={
                              pedido.estado
                            }
                          >
                            {pedido.estado}
                          </option>


                          {estadosSiguientes[
                            pedido.estado
                          ].map(
                            (estado) => (

                              <option
                                key={
                                  estado
                                }
                                value={
                                  estado
                                }
                              >
                                {estado}
                              </option>

                            ),
                          )}

                        </select>

                      </td>

                    </tr>

                  ),
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </details>
  );
}