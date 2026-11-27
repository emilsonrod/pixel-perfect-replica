/**
 * Turns a Supabase/PostgREST/Storage error into a message that is safe to show.
 * Messages raised on purpose by our SQL functions (SQLSTATE P0001, 23514) are written
 * in Spanish for the user and pass through; everything else gets a generic text so
 * internal details never reach the screen.
 */
export function userMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if ((code === "P0001" || code === "23514") && typeof message === "string") return message;
    if (code === "42501") return "No tienes permiso para realizar esta acción.";
  }
  return fallback;
}
