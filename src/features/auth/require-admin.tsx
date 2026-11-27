import type { ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/catalog/empty-state";
import { useAuth } from "./auth-context";

/**
 * Keeps the admin screens for signed-in business members. This is only the user experience:
 * what protects the data is Row Level Security in the database, which rejects the writes
 * of anyone who is not a member even if this component were bypassed.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { ready, configured, user, isMember, signOut } = useAuth();
  if (!configured)
    return (
      <main className="form-container">
        <EmptyState
          title="Supabase no está configurado"
          description="Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY y reinicia la aplicación."
        >
          <Button asChild variant="outline">
            <Link to="/">Volver al catálogo</Link>
          </Button>
        </EmptyState>
      </main>
    );
  if (!ready)
    return (
      <main className="form-container">
        <p className="py-20 text-sm text-muted-foreground">Cargando…</p>
      </main>
    );
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isMember)
    return (
      <main className="form-container">
        <EmptyState
          title="Tu cuenta no tiene acceso"
          description="Esta cuenta no pertenece al equipo de administración del negocio."
        >
          <Button variant="outline" onClick={() => void signOut()}>
            Cerrar sesión
          </Button>
        </EmptyState>
      </main>
    );
  return <>{children}</>;
}
