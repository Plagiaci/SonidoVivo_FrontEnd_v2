import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "../../api/axiosConfig";
import { Mensaje } from "../../components/PageHelpers";
import { formatearPrecio } from "../../utils/formatoPrecio";

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
  estado: string;
  total: number;
  detalles: DetallePedido[];
}

export function HistorialPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    api
      .get<Pedido[]>("/pedidos/mis-pedidos")
      .then(({ data }) => {
        if (activo) setPedidos(data);
      })
      .catch((error) => {
        if (activo) {
          setMensaje(
            isAxiosError<{ error?: string }>(error)
              ? (error.response?.data?.error ??
                "No fue posible cargar el historial.")
              : "No fue posible cargar el historial.",
          );
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <main className="container py-5">
      <section className="mb-4">
        <span className="badge text-bg-primary mb-3">Historial</span>
        <h1 className="display-6 fw-bold">Mis pedidos</h1>
      </section>
      <Mensaje texto={mensaje} tipo="danger" />
      {!pedidos.length && !mensaje && (
        <div className="alert alert-light border text-center">
          Aún no tienes pedidos registrados.
        </div>
      )}
      <div className="d-grid gap-4">
        {pedidos.map((pedido) => (
          <article className="card border-0 shadow-sm" key={pedido.id}>
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <h2 className="h5 mb-0">Pedido #{pedido.id}</h2>
                <span className="badge text-bg-secondary">{pedido.estado}</span>
              </div>
              <p className="text-secondary mt-2">
                Fecha: {new Date(pedido.fecha).toLocaleString("es-CL")}
              </p>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.detalles.map((detalle) => (
                      <tr key={detalle.productoId}>
                        <td>{detalle.nombreProducto}</td>
                        <td>{detalle.cantidad}</td>
                        <td>{formatearPrecio(detalle.precioUnitario)}</td>
                        <td>{formatearPrecio(detalle.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="fs-5 fw-bold text-end mb-0">
                Total: {formatearPrecio(pedido.total)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
