import { AdminProductsPage } from "./AdminProductsPage";
import { AdminProfilesPage } from "../admin/AdminProfilesPage";
import { AdminCategoriesPage } from "./AdminCategoriesPage";
import { AdminOrdersPage } from "./AdminOrdersPage";
import { AdminReportsPage } from "./AdminReportsPage";

export function AdminPage() {
  return (
    <main className="container py-5">
      <section className="mb-4">
        <span className="badge text-bg-primary mb-3">Administrador</span>

        <h1 className="display-6 fw-bold">Gestión de la tienda</h1>

        <p className="text-secondary">
          Administra el catálogo, los usuarios, los pedidos y los reportes.
        </p>
      </section>

      <AdminProductsPage />

      <AdminCategoriesPage />

      <AdminProfilesPage />

      <AdminOrdersPage />

      <AdminReportsPage />
    </main>
  );
}
