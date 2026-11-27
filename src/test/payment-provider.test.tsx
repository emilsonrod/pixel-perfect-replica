import type { ReactNode } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import { PaymentProvider } from "@/features/payments/payment-provider";
import { usePayments, type PaymentsContextValue } from "@/features/payments/payment-context";
import type { PaymentRepository } from "@/features/payments/repository";
import {
  attachReceipt,
  buildPaymentRequest,
  confirmPayment,
  type PaymentRequest,
  type QrConfig,
} from "@/features/payments/model";
import { initialProducts } from "@/features/catalog/seed";

let current: PaymentsContextValue | undefined;
function Consumer() {
  current = usePayments();
  return null;
}
const qr: QrConfig = { image: "data:image/png;base64,aGVsbG8=", recipient: "Casa Luma" };

const auth = (override: Partial<AuthContextValue> = {}): AuthContextValue => ({
  ready: true,
  configured: true,
  user: { id: "user-1", email: "admin@example.com" },
  isMember: true,
  signIn: async () => null,
  signOut: async () => {},
  ...override,
});
const wrap = (value: AuthContextValue, repository: PaymentRepository, children: ReactNode) => (
  <AuthContext.Provider value={value}>
    <PaymentProvider repository={repository}>{children}</PaymentProvider>
  </AuthContext.Provider>
);

// In-memory stand-in for the database: it applies the same business rules the SQL functions do.
function memoryRepository() {
  let config: QrConfig | null = null;
  let requests: PaymentRequest[] = [];
  const repository: PaymentRepository = {
    loadConfig: vi.fn(async () => config),
    listRequests: vi.fn(async () => [...requests]),
    getRequest: vi.fn(async (id) => requests.find((item) => item.id === id) ?? null),
    saveQr: vi.fn(async (next) => {
      config = next;
    }),
    createRequest: vi.fn(async (input, product) => {
      const id = crypto.randomUUID();
      requests = [
        buildPaymentRequest(input, product, config, id, new Date().toISOString(), "admin"),
        ...requests,
      ];
      return id;
    }),
    attachReceipt: vi.fn(async (id, image) => {
      requests = requests.map((item) => (item.id === id ? attachReceipt(item, image) : item));
    }),
    confirmRequest: vi.fn(async (id, bankVerified) => {
      requests = requests.map((item) =>
        item.id === id ? confirmPayment(item, bankVerified, new Date().toISOString()) : item,
      );
    }),
  };
  return repository;
}

beforeEach(() => {
  current = undefined;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Payment provider", () => {
  it("saves the QR, creates a request, keeps a receipt pending and confirms manually", async () => {
    const repository = memoryRepository();
    render(wrap(auth(), repository, <Consumer />));
    await waitFor(() => expect(current?.ready).toBe(true));
    const product = initialProducts[0];
    if (!product || !current) throw new Error("Missing test context");

    await act(async () => {
      expect(await current?.saveQr(qr)).toBe(true);
    });
    expect(current.config).toEqual(qr);

    let id: string | null = null;
    await act(async () => {
      id = (await current?.createRequest({ customer: "Ana Silva", amount: 49 }, product)) ?? null;
    });
    if (!id) throw new Error("Request was not created");
    const requestId: string = id;
    expect(current.requests[0]?.status).toBe("pending");

    await act(async () => {
      expect(await current?.saveReceipt(requestId, qr.image)).toBe(true);
    });
    expect(current.requests[0]?.status).toBe("pending");
    expect(current.requests[0]?.receipt).toBe(qr.image);

    await act(async () => {
      expect(await current?.confirmRequest(requestId, false)).toBe(false);
    });
    expect(current.requests[0]?.status).toBe("pending");

    await act(async () => {
      expect(await current?.confirmRequest(requestId, true)).toBe(true);
    });
    expect(current.requests[0]?.status).toBe("paid");
    expect(current.requests[0]?.confirmedAt).not.toBeNull();
  });

  it("does not read the QR or the request list for someone who is not a member", async () => {
    const repository = memoryRepository();
    render(wrap(auth({ user: null, isMember: false }), repository, <Consumer />));
    await waitFor(() => expect(current?.ready).toBe(true));
    expect(repository.loadConfig).not.toHaveBeenCalled();
    expect(repository.listRequests).not.toHaveBeenCalled();
    expect(current?.config).toBeNull();
    expect(current?.requests).toEqual([]);
  });

  it("lets a customer read a single request by id", async () => {
    const repository = memoryRepository();
    const product = initialProducts[0];
    if (!product) throw new Error("Missing product");
    await repository.saveQr(qr);
    const id = await repository.createRequest({ customer: "Ana", amount: 49 }, product);
    render(wrap(auth({ user: null, isMember: false }), repository, <Consumer />));
    await waitFor(() => expect(current?.ready).toBe(true));
    expect((await current?.getRequest(id))?.customer).toBe("Ana");
    expect(await current?.getRequest("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("does not claim a save when the database rejects it", async () => {
    const repository = memoryRepository();
    repository.saveQr = vi.fn(async () => {
      throw { code: "42501", message: "permission denied" };
    });
    render(wrap(auth(), repository, <Consumer />));
    await waitFor(() => expect(current?.ready).toBe(true));
    await act(async () => {
      expect(await current?.saveQr(qr)).toBe(false);
    });
    expect(current?.config).toBeNull();
  });

  it("rejects an invalid request before reaching the repository", async () => {
    const repository = memoryRepository();
    render(wrap(auth(), repository, <Consumer />));
    await waitFor(() => expect(current?.ready).toBe(true));
    const product = initialProducts[0];
    if (!product) throw new Error("Missing product");
    await act(async () => {
      expect(await current?.createRequest({ customer: " ", amount: 49 }, product)).toBeNull();
    });
    expect(repository.createRequest).not.toHaveBeenCalled();
  });
});
