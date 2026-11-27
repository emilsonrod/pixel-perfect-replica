import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Package, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";

export function AdminTabs({ active }: { active: "products" | "payments" }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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
      {user && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={async () => {
            await signOut();
            await navigate({ to: "/" });
          }}
        >
          <LogOut size={16} strokeWidth={1.5} /> Salir
        </Button>
      )}
    </nav>
  );
}
