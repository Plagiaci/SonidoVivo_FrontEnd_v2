import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "../../api/axiosConfig";
import { Mensaje } from "../../components/PageHelpers";
import { formatearPrecio } from "../../utils/formatoPrecio";

type EstadoPedido =
  "PENDIENTE" | "PREPARANDO" | "ENVIADO" | "ENTREGADO" | "CANCELADO";

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
  clienteNombre: string;
  clienteEmail: string;
  detalles: DetallePedido[];
}

const estadosSiguientes: Record<EstadoPedido, EstadoPedido[]> = {
  PENDIENTE: ["PREPARANDO", "CANCELADO"],
  PREPARANDO: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

export function AdminOrdersPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"danger" | "success">(
    "success",
  );
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    api
      .get<Pedido[]>("/pedidos")
      .then(({ data }) => {
        if (activo) setPedidos(data);
      })
      .catch((error) => {
        if (activo) {
          setTipoMensaje("danger");
          setMensaje(
            isAxiosError<{ error?: string }>(error)
              ? (error.response?.data?.error ??
                  "No fue posible cargar los pedidos.")
              : "No fue posible cargar los pedidos.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const cambiarEstado = async (pedido: Pedido, estado: EstadoPedido) => {
    try {
      const { data } = await api.patch<Pedido>(`/pedidos/${pedido.id}/estado`, {
        estado,
      });
      setPedidos((actuales) =>
        actuales.map((item) => (item.id === data.id ? data : item)),
      );
      setTipoMensaje("success");
      setMensaje(`El estado del pedido #${pedido.id} se actualizó.`);
    } catch (error) {
      setTipoMensaje("danger");
      setMensaje(
        isAxiosError<{ error?: string }>(error)
          ? (error.response?.data?.error ??
              "No fue posible actualizar el pedido.")
          : "No fue posible actualizar el pedido.",
      );
    }
  };

  return (
    <details className="card shadow-sm border-0 mb-3">
      <summary
        className="card-header bg-body p-4"
        style={{ cursor: "pointer" }}
      >
        <h2 className="h5 fw-bold mb-0">Gestión de pedidos</h2>
      </summary>
      <div className="card-body p-4">
        <Mensaje texto={mensaje} tipo={tipoMensaje} />
        {cargando ? (
          <p className="text-secondary" role="status">
            Cargando pedidos…
          </p>
        ) : pedidos.length === 0 ? (
          !mensaje && (
            <p className="text-secondary mb-0">No hay pedidos registrados.</p>
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
                {pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td>#{pedido.id}</td>
                    <td>{new Date(pedido.fecha).toLocaleString("es-CL")}</td>
                    <td>
                      {pedido.clienteNombre}
                      <br />
                      <small className="text-secondary">
                        {pedido.clienteEmail}
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
                    <td>{formatearPrecio(pedido.total)}</td>
                    <td>
                      <select
                        className="form-select"
                        aria-label={`Estado del pedido ${pedido.id}`}
                        value={pedido.estado}
                        disabled={!estadosSiguientes[pedido.estado].length}
                        onChange={(evento) =>
                          void cambiarEstado(
                            pedido,
                            evento.target.value as EstadoPedido,
                          )
                        }
                      >
                        <option value={pedido.estado}>
                          {pedido.estado.replace(/_/g, " ")}
                        </option>
                        {estadosSiguientes[pedido.estado].map((estado) => (
                          <option key={estado} value={estado}>
                            {estado.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
