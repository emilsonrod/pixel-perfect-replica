import { Link } from "@tanstack/react-router";
import { Package, QrCode } from "lucide-react";

export function AdminTabs({ active }: { active: "products" | "payments" }) {
  return (
    <nav className="admin-tabs" aria-label="Administración del negocio">
      <Link
        to="/admin"
        className={active === "products" ? "selected" : ""}
        aria-current={active === "products" ? "page" : undefined}
      >
        <Package size={16} strokeWidth={1.5} /> Productos
      </Link>
      <Link
        to="/admin/pagos"
        className={active === "payments" ? "selected" : ""}
        aria-current={active === "payments" ? "page" : undefined}
      >
        <QrCode size={16} strokeWidth={1.5} /> Pagos
      </Link>
    </nav>
  );
}
