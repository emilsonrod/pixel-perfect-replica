import { createContext, useContext } from "react";
import type { Product } from "@/features/catalog/model";
import type { PaymentState, QrConfig, RequestInput } from "./model";

export type PaymentsContextValue = PaymentState & {
  ready: boolean;
  saveQr: (config: QrConfig) => boolean;
  createRequest: (
    input: RequestInput,
    product: Product,
    source: "admin" | "customer",
  ) => string | null;
  saveReceipt: (id: string, image: string) => boolean;
  confirmRequest: (id: string, bankVerified: boolean) => boolean;
};
export const PaymentsContext = createContext<PaymentsContextValue | undefined>(undefined);
export function usePayments() {
  const value = useContext(PaymentsContext);
  if (!value) throw new Error("PaymentProvider is required.");
  return value;
}
