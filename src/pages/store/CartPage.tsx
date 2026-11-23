import { useState } from "react";
import { Mensaje } from "../../components/PageHelpers";
import { useStore } from "../../context/StoreContext";
import { formatearPrecio } from "../../utils/formatoPrecio";

export function Carrito() {
  const {
    carrito,
    cambiarCantidadCarrito,
    eliminarDelCarrito,
    vaciarCarrito,
    finalizarCompra,
  } = useStore();
  const [mensaje, setMensaje] = useState("");
  const [procesandoCompra, setProcesandoCompra] = useState(false);
  const [tipoMensaje, setTipoMensaje] = useState<"danger" | "success">(
    "success",
  );
  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0,
  );

  const comprar = async () => {
    setProcesandoCompra(true);
    try {
      const error = await finalizarCompra();
      if (error) {
        setMensaje(error);
        setTipoMensaje("danger");
        return;
      }
      setMensaje("Compra realizada y registrada correctamente.");
      setTipoMensaje("success");
    } finally {
      setProcesandoCompra(false);
    }
  };

  return (
    <main className="container py-5">
      <section className="mb-4">
        <span className="badge text-bg-primary mb-3">Compra</span>
        <h1 className="display-6 fw-bold">Carrito de compras</h1>
        <p className="text-secondary">
          Revisa los productos antes de finalizar tu compra.
        </p>
      </section>
      {!carrito.length ? (
        <div className="alert alert-light border text-center">
          El carrito está vacío.
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Subtotal</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => (
                  <tr key={item.idProducto}>
                    <td className="fw-semibold">{item.nombre}</td>
                    <td>
                      <input
                        className="form-control"
                        style={{ maxWidth: "90px" }}
                        type="number"
                        min="1"
                        value={item.cantidad}
                        aria-label={`Cantidad de ${item.nombre}`}
                        onChange={(evento) =>
                          cambiarCantidadCarrito(
                            item.idProducto,
                            Number(evento.target.value),
                          )
                        }
                      />
                    </td>
                    <td>{formatearPrecio(item.precio)}</td>
                    <td className="fw-bold">
                      {formatearPrecio(item.precio * item.cantidad)}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={() => eliminarDelCarrito(item.idProducto)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row justify-content-end">
            <div className="col-md-5 col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-secondary mb-1">Total de la compra</p>
                  <p className="display-6 fw-bold text-primary">
                    {formatearPrecio(total)}
                  </p>
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-success btn-lg"
                      type="button"
                      onClick={comprar}
                      disabled={procesandoCompra}
                    >
                      {procesandoCompra ? "Procesando…" : "Finalizar compra"}
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      type="button"
                      onClick={() => {
                        vaciarCarrito();
                        setMensaje("El carrito fue vaciado.");
                        setTipoMensaje("success");
                      }}
                    >
                      Vaciar carrito
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <Mensaje texto={mensaje} tipo={tipoMensaje} />
    </main>
  );
}
