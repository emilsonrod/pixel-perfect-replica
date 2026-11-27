import { createContext, useContext } from "react";
import type { Product } from "@/features/catalog/model";
import type { PaymentRequest, PaymentState, QrConfig, RequestInput } from "./model";

export type PaymentsContextValue = PaymentState & {
  ready: boolean;
  saveQr: (config: QrConfig) => Promise<boolean>;
  /** Returns the new request id, or null when it could not be created. */
  createRequest: (input: RequestInput, product: Product) => Promise<string | null>;
  /** Reads one request by id. Works for customers without an account. */
  getRequest: (id: string) => Promise<PaymentRequest | null>;
  saveReceipt: (id: string, image: string) => Promise<boolean>;
  confirmRequest: (id: string, bankVerified: boolean) => Promise<boolean>;
};
export const PaymentsContext = createContext<PaymentsContextValue | undefined>(undefined);
export function usePayments() {
  const value = useContext(PaymentsContext);
  if (!value) throw new Error("PaymentProvider is required.");
  return value;
}
