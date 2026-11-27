import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Only public values belong here. The URL and the publishable (anon) key are meant for the
// browser; access control is enforced by Row Level Security in the database, never by this client.
const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

/** Slug of the business whose catalog this app shows (row in public.businesses). */
export const businessSlug = (import.meta.env["VITE_BUSINESS_SLUG"] as string | undefined) || "casa-luma";

export const isSupabaseConfigured = Boolean(url && key);

/** True when a key is a secret/service_role key, which must never ship to a browser. */
export function isPrivilegedKey(value: string): boolean {
  if (value.startsWith("sb_secret_")) return true;
  const payload = value.split(".")[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: unknown };
    return json.role === "service_role";
  } catch {
    return false;
  }
}

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  if (isPrivilegedKey(key)) {
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY contiene una clave privada. Usa la clave publishable/anon.",
    );
  }
  if (!client) {
    const browser = typeof window !== "undefined";
    client = createClient(url, key, {
      auth: {
        // The server render never holds a session; the browser keeps it in localStorage.
        persistSession: browser,
        autoRefreshToken: browser,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
