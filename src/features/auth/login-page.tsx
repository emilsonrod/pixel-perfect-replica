import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/catalog/empty-state";
import { useAuth } from "./auth-context";

export function LoginPage() {
  const { ready, configured, user, isMember, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user && isMember) void navigate({ to: "/admin", replace: true });
  }, [ready, user, isMember, navigate]);

  if (!configured)
    return (
      <main className="form-container">
        <EmptyState
          title="Supabase no está configurado"
          description="Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY y reinicia la aplicación."
        />
      </main>
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    setSubmitting(true);
    setError("");
    const message = await signIn(email.trim(), password);
    setSubmitting(false);
    if (message) setError(message);
  };

  return (
    <main className="form-container fade-up">
      <div className="form-heading">
        <h1 className="page-heading">Acceso de administración</h1>
      </div>
      <form className="product-form" onSubmit={submit} noValidate>
        <div className="form-fields min-w-0">
          <div>
            <label className="field-label" htmlFor="login-email">
              Correo
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="login-password">
              Contraseña
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {ready && user && !isMember && (
            <p role="alert" className="form-error">
              Esta cuenta no tiene acceso a la administración del negocio.
            </p>
          )}
        </div>
        <div className="form-footer">
          <Button asChild variant="outline" className="shadow-none">
            <Link to="/">Volver al catálogo</Link>
          </Button>
          <Button type="submit" disabled={submitting || !ready}>
            {submitting ? <Loader2 className="animate-spin" /> : <LogIn strokeWidth={1.5} />}
            Entrar
          </Button>
        </div>
      </form>
    </main>
  );
}
