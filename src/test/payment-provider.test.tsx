import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentProvider } from "@/features/payments/payment-provider";
import { usePayments, type PaymentsContextValue } from "@/features/payments/payment-context";
import { PAYMENT_STORAGE_KEY, readPaymentState } from "@/features/payments/model";
import { initialProducts } from "@/features/catalog/seed";

let current: PaymentsContextValue | undefined;
function Consumer() {
  current = usePayments();
  return null;
}
const qr = { image: "data:image/png;base64,aGVsbG8=", recipient: "Casa Luma" };
beforeEach(() => {
  localStorage.clear();
  current = undefined;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Local payment provider", () => {
  it("persists QR, requests, receipts and manual confirmations across remounts", async () => {
    const view = render(
      <PaymentProvider>
        <Consumer />
      </PaymentProvider>,
    );
    await waitFor(() => expect(current?.ready).toBe(true));
    const product = initialProducts[0];
    if (!product || !current) throw new Error("Missing test context");
    act(() => {
      expect(current?.saveQr(qr)).toBe(true);
    });
    let id: string | null = null;
    act(() => {
      id = current?.createRequest({ customer: "Ana Silva", amount: 49 }, product, "admin") ?? null;
    });
    if (!id) throw new Error("Request was not created");
    const requestId: string = id;
    expect(current.requests[0]?.status).toBe("pending");
    act(() => {
      expect(current?.saveReceipt(requestId, qr.image)).toBe(true);
    });
    expect(current.requests[0]?.status).toBe("pending");
    act(() => {
      expect(current?.confirmRequest(requestId, false)).toBe(false);
    });
    expect(current.requests[0]?.status).toBe("pending");
    act(() => {
      expect(current?.confirmRequest(requestId, true)).toBe(true);
    });
    const confirmedAt = current.requests[0]?.confirmedAt;
    view.unmount();
    render(
      <PaymentProvider>
        <Consumer />
      </PaymentProvider>,
    );
    await waitFor(() => expect(current?.requests[0]?.status).toBe("paid"));
    expect(current?.config).toEqual(qr);
    expect(current?.requests[0]?.receipt).toBe(qr.image);
    expect(current?.requests[0]?.confirmedAt).toBe(confirmedAt);
  });
  it("does not claim a save when browser storage is full", async () => {
    render(
      <PaymentProvider>
        <Consumer />
      </PaymentProvider>,
    );
    await waitFor(() => expect(current?.ready).toBe(true));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    act(() => {
      expect(current?.saveQr(qr)).toBe(false);
    });
    expect(current?.config).toBeNull();
    expect(localStorage.getItem(PAYMENT_STORAGE_KEY)).toBeNull();
  });
  it("synchronizes another tab's QR settings", async () => {
    render(
      <PaymentProvider>
        <Consumer />
      </PaymentProvider>,
    );
    await waitFor(() => expect(current?.ready).toBe(true));
    const raw = JSON.stringify({ config: qr, requests: [] });
    act(() => {
      localStorage.setItem(PAYMENT_STORAGE_KEY, raw);
      window.dispatchEvent(
        new StorageEvent("storage", { key: PAYMENT_STORAGE_KEY, newValue: raw }),
      );
    });
    expect(current?.config).toEqual(qr);
    expect(readPaymentState(localStorage.getItem(PAYMENT_STORAGE_KEY)).config).toEqual(qr);
  });
});
