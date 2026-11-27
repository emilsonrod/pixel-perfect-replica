import { useCallback, useEffect, useState } from "react";
import type { PaymentRequest } from "./model";
import { usePayments } from "./payment-context";

/** Loads one payment request by id, for screens a customer opens without an account. */
export function usePaymentRequest(requestId: string) {
  const { getRequest, ready } = usePayments();
  const [state, setState] = useState<{ loading: boolean; request: PaymentRequest | null }>({
    loading: true,
    request: null,
  });

  const reload = useCallback(async () => {
    const request = await getRequest(requestId);
    setState({ loading: false, request });
  }, [getRequest, requestId]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void getRequest(requestId).then((request) => {
      if (!cancelled) setState({ loading: false, request });
    });
    return () => {
      cancelled = true;
    };
  }, [getRequest, ready, requestId]);

  return { ...state, reload };
}
