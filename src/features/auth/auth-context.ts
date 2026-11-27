import { createContext, useContext } from "react";

export type AuthUser = { id: string; email: string | null };

export type AuthContextValue = {
  /** True once the stored session (if any) has been checked. */
  ready: boolean;
  /** False when the Supabase environment variables are missing. */
  configured: boolean;
  user: AuthUser | null;
  /** The user belongs to the business (row in business_members). Only a UI hint: RLS is the real check. */
  isMember: boolean;
  /** Returns an error message, or null when the sign-in worked. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required.");
  return value;
}
