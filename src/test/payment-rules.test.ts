import { describe, expect, it } from "vitest";
import { initialProducts } from "@/features/catalog/seed";
import {
  attachReceipt,
  buildPaymentRequest,
  confirmPayment,
  paymentRequestSchema,
  qrConfigSchema,
  requestInputSchema,
} from "@/features/payments/model";
import { paymentImageUploadSchema } from "@/features/payments/images";

const product = initialProducts[0];
if (!product) throw new Error("Missing product fixture");
const qr = { image: "data:image/png;base64,aGVsbG8=", recipient: "Casa Luma" };
const id = "31f6d100-e440-43ee-8f9a-48e645a73246";
const time = "2026-11-20T01:33:00.000Z";
const pending = buildPaymentRequest(
  { customer: "Ana Silva", amount: 49 },
  product,
  qr,
  id,
  time,
  "admin",
);

describe("QR payment rules", () => {
  it("requires a QR image uploaded by the administrator", () => {
    expect(qrConfigSchema.safeParse({ ...qr, image: "" }).success).toBe(false);
    expect(() =>
      buildPaymentRequest({ customer: "Ana", amount: 49 }, product, null, id, time, "admin"),
    ).toThrow();
  });
  it("requires the recipient", () => {
    expect(qrConfigSchema.safeParse({ ...qr, recipient: " " }).success).toBe(false);
  });
  it("requires the customer's name", () => {
    expect(requestInputSchema.safeParse({ customer: " ", amount: 49 }).success).toBe(false);
  });
  it("rejects zero and negative payment amounts", () => {
    expect(requestInputSchema.safeParse({ customer: "Ana", amount: 0 }).success).toBe(false);
    expect(requestInputSchema.safeParse({ customer: "Ana", amount: -49 }).success).toBe(false);
  });
  it("rejects more than two decimal places", () => {
    expect(requestInputSchema.safeParse({ customer: "Ana", amount: 49.001 }).success).toBe(false);
  });
  it("preserves the original recipient, QR and amount when the business QR changes", () => {
    const changedQr = {
      ...qr,
      image: "data:image/png;base64,bmV3",
      recipient: "Otro destinatario",
    };
    expect(pending.qr).toEqual(qr);
    expect(pending.qr).not.toEqual(changedQr);
    expect(pending.amount).toBe(49);
  });
  it("enforces the product price for customer-created requests", () => {
    expect(
      buildPaymentRequest({ customer: "Ana", amount: 49 }, product, qr, id, time, "customer")
        .amount,
    ).toBe(49);
    expect(() =>
      buildPaymentRequest({ customer: "Ana", amount: 1 }, product, qr, id, time, "customer"),
    ).toThrow();
  });
  it("prevents customers from paying for an unpublished product", () => {
    expect(() =>
      buildPaymentRequest(
        { customer: "Ana", amount: 49 },
        { ...product, published: false },
        qr,
        id,
        time,
        "customer",
      ),
    ).toThrow();
  });
  it("attaching a receipt never marks the payment completed", () => {
    const result = attachReceipt(pending, "data:image/png;base64,cmVjZWlwdA==");
    expect(result.receipt).toBe("data:image/png;base64,cmVjZWlwdA==");
    expect(result.status).toBe("pending");
    expect(result.confirmedAt).toBeNull();
  });
  it("requires an administrator acknowledgment of the bank deposit", () => {
    expect(() => confirmPayment(pending, false, time)).toThrow();
    expect(confirmPayment(pending, true, time).status).toBe("paid");
  });
  it("records manual confirmation time and does not confirm twice", () => {
    const paid = confirmPayment(pending, true, time);
    expect(confirmPayment(paid, true, "2026-11-21T01:33:00.000Z").confirmedAt).toBe(time);
  });
  it("does not allow a receipt to replace a confirmed payment", () => {
    expect(() => attachReceipt(confirmPayment(pending, true, time), qr.image)).toThrow();
  });
  it("rejects a paid request without confirmation time and a pending one with it", () => {
    expect(
      paymentRequestSchema.safeParse({ ...pending, status: "paid", confirmedAt: null }).success,
    ).toBe(false);
    expect(
      paymentRequestSchema.safeParse({ ...pending, status: "pending", confirmedAt: time }).success,
    ).toBe(false);
    expect(paymentRequestSchema.safeParse(pending).success).toBe(true);
  });
  it("keeps a request whose product was deleted", () => {
    expect(paymentRequestSchema.safeParse({ ...pending, productId: null }).success).toBe(true);
  });
  it("accepts JPG, PNG and WebP up to 5 MB, but not PDF or larger files", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"])
      expect(paymentImageUploadSchema.safeParse({ type, size: 5 * 1024 * 1024 }).success).toBe(
        true,
      );
    expect(paymentImageUploadSchema.safeParse({ type: "application/pdf", size: 500 }).success).toBe(
      false,
    );
    expect(
      paymentImageUploadSchema.safeParse({ type: "image/png", size: 5 * 1024 * 1024 + 1 }).success,
    ).toBe(false);
  });
});
