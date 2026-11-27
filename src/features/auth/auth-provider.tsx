import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getBusinessId } from "@/lib/supabase-storage";
import { AuthContext, type AuthContextValue, type AuthUser } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMember, setIsMember] = useState(false);

  const apply = useCallback(async (session: Session | null) => {
    if (!session) {
      setUser(null);
      setIsMember(false);
      setReady(true);
      return;
    }
    setUser({ id: session.user.id, email: session.user.email ?? null });
    try {
      const businessId = await getBusinessId();
      const { data, error } = await getSupabase()
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", session.user.id)
        .limit(1);
      setIsMember(!error && (data?.length ?? 0) > 0);
    } catch {
      setIsMember(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // INITIAL_SESSION fires on subscribe, so no separate getSession call is needed.
    // The callback must not await Supabase calls itself (documented deadlock), hence setTimeout.
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void apply(session), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [apply]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      user,
      isMember,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return "Supabase no está configurado.";
        const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) {
          // Supabase only reports an unconfirmed email after the password was right, so naming it
          // does not reveal whether an account exists. Everything else stays generic.
          if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message))
            return "Tu correo aún no está confirmado. Confírmalo en Supabase (Authentication → Users) o desde el enlace del correo.";
          if (error.code === "over_request_rate_limit" || error.status === 429)
            return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
          if (error.status === 0 || /fetch|network/i.test(error.message))
            return "No se pudo conectar con Supabase. Revisa tu conexión.";
          return "Correo o contraseña incorrectos.";
        }
        if (!data.session) return "Correo o contraseña incorrectos.";
        await apply(data.session);
        return null;
      },
      signOut: async () => {
        if (isSupabaseConfigured) await getSupabase().auth.signOut();
        setUser(null);
        setIsMember(false);
      },
    }),
    [apply, isMember, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
