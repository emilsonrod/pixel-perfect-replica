import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PaymentsContext } from "./payment-context";
import {
  attachReceipt,
  buildPaymentRequest,
  confirmPayment,
  emptyPaymentState,
  PAYMENT_STORAGE_KEY,
  paymentStateSchema,
  qrConfigSchema,
  readPaymentState,
  type PaymentState,
} from "./model";

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaymentState>(emptyPaymentState);
  const [ready, setReady] = useState(false);
  const available = useRef(false);

  useEffect(() => {
    try {
      const saved = readPaymentState(localStorage.getItem(PAYMENT_STORAGE_KEY));
      setState(saved);
      available.current = true;
    } catch {
      toast.error("El almacenamiento no está disponible. Los pagos no se podrán guardar.");
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== PAYMENT_STORAGE_KEY && event.key !== null) return;
      const saved = readPaymentState(event.key === null ? null : event.newValue);
      setState(saved);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const persist = (change: (latest: PaymentState) => PaymentState) => {
    if (!ready || !available.current) return false;
    try {
      // Read the latest saved state rather than a stale render snapshot.
      const latest = readPaymentState(localStorage.getItem(PAYMENT_STORAGE_KEY));
      const next = paymentStateSchema.parse(change(latest));
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(next));
      setState(next);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error && error.name !== "QuotaExceededError" && error.name !== "ZodError"
          ? error.message
          : "No se pudo guardar. Comprueba los datos o usa una imagen más pequeña.",
      );
      return false;
    }
  };

  return (
    <PaymentsContext.Provider
      value={{
        ...state,
        ready,
        saveQr: (config) =>
          persist((latest) => ({ ...latest, config: qrConfigSchema.parse(config) })),
        createRequest: (input, product, source) => {
          const id = crypto.randomUUID();
          const saved = persist((latest) => ({
            ...latest,
            requests: [
              buildPaymentRequest(
                input,
                product,
                latest.config,
                id,
                new Date().toISOString(),
                source,
              ),
              ...latest.requests,
            ],
          }));
          return saved ? id : null;
        },
        saveReceipt: (id, image) =>
          persist((latest) => {
            if (!latest.requests.some((item) => item.id === id))
              throw new Error("La solicitud ya no existe.");
            return {
              ...latest,
              requests: latest.requests.map((item) =>
                item.id === id ? attachReceipt(item, image) : item,
              ),
            };
          }),
        confirmRequest: (id, bankVerified) =>
          persist((latest) => {
            if (!latest.requests.some((item) => item.id === id))
              throw new Error("La solicitud ya no existe.");
            return {
              ...latest,
              requests: latest.requests.map((item) =>
                item.id === id
                  ? confirmPayment(item, bankVerified, new Date().toISOString())
                  : item,
              ),
            };
          }),
      }}
    >
      {children}
    </PaymentsContext.Provider>
  );
}
