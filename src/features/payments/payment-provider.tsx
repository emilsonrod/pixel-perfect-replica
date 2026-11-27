import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { userMessage } from "@/lib/supabase-errors";
import { PaymentsContext } from "./payment-context";
import { emptyPaymentState, qrConfigSchema, requestInputSchema, type PaymentState } from "./model";
import { createSupabasePaymentRepository, type PaymentRepository } from "./repository";

export function PaymentProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Defaults to Supabase; tests pass an in-memory implementation. */
  repository?: PaymentRepository;
}) {
  const auth = useAuth();
  const repo = useMemo(() => repository ?? createSupabasePaymentRepository(), [repository]);
  const [state, setState] = useState<PaymentState>(emptyPaymentState);
  const [ready, setReady] = useState(false);
  const available = repository !== undefined || isSupabaseConfigured;
  const isMember = auth.isMember;

  // Only members can read the QR and the list of requests (RLS). Customers read a single
  // request by id through getRequest.
  const refresh = useCallback(async () => {
    if (!available || !isMember) {
      setState(emptyPaymentState);
      return;
    }
    try {
      const [config, requests] = await Promise.all([repo.loadConfig(), repo.listRequests()]);
      setState({ config, requests });
    } catch (error) {
      toast.error(userMessage(error, "No se pudieron cargar los pagos."));
    }
  }, [available, isMember, repo]);

  useEffect(() => {
    if (!auth.ready) return;
    let cancelled = false;
    void refresh().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [auth.ready, refresh]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, fallback: string): Promise<T | null> => {
      if (!ready || !available) return null;
      try {
        return await action();
      } catch (error) {
        toast.error(userMessage(error, fallback));
        return null;
      }
    },
    [available, ready],
  );

  const value = useMemo(
    () => ({
      ...state,
      ready,
      saveQr: async (config: Parameters<PaymentRepository["saveQr"]>[0]) => {
        const parsed = qrConfigSchema.safeParse(config);
        if (!parsed.success) return false;
        const saved = await run(
          async () => (await repo.saveQr(parsed.data), true),
          "No se pudo guardar el QR. Inténtalo de nuevo.",
        );
        if (!saved) return false;
        await refresh();
        return true;
      },
      createRequest: async (
        input: Parameters<PaymentRepository["createRequest"]>[0],
        product: Parameters<PaymentRepository["createRequest"]>[1],
      ) => {
        const parsed = requestInputSchema.safeParse(input);
        if (!parsed.success) return null;
        const id = await run(
          () => repo.createRequest(parsed.data, product),
          "No se pudo crear la solicitud de pago.",
        );
        if (id) await refresh();
        return id;
      },
      getRequest: async (id: string) => {
        if (!available) return null;
        try {
          return await repo.getRequest(id);
        } catch {
          return null;
        }
      },
      saveReceipt: async (id: string, image: string) => {
        const saved = await run(
          async () => (await repo.attachReceipt(id, image), true),
          "No se pudo guardar el comprobante. Inténtalo de nuevo.",
        );
        if (!saved) return false;
        await refresh();
        return true;
      },
      confirmRequest: async (id: string, bankVerified: boolean) => {
        const saved = await run(
          async () => (await repo.confirmRequest(id, bankVerified), true),
          "No se pudo confirmar el pago.",
        );
        if (!saved) return false;
        await refresh();
        return true;
      },
    }),
    [available, ready, refresh, repo, run, state],
  );

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}
