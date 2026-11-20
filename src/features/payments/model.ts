import { z } from "zod";
import { imageSchema, productSchema, type Product } from "@/features/catalog/model";

export const PAYMENT_STORAGE_KEY = "casa-luma-payments-v1";
export const qrConfigSchema = z.object({
  image: imageSchema,
  recipient: z.string().trim().min(1, "El nombre del destinatario es obligatorio.").max(100),
});
export const requestInputSchema = z.object({
  customer: z.string().trim().min(1, "El nombre del cliente es obligatorio.").max(100),
  amount: z
    .number()
    .finite()
    .positive("El importe debe ser mayor que cero.")
    .max(999999.99, "El importe es demasiado alto.")
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
      "Usa un máximo de dos decimales.",
    ),
});
const requestBaseSchema = requestInputSchema.extend({
  id: z.string().uuid(),
  productId: z.string().min(1),
  productName: z.string().min(1).max(100),
  productImage: imageSchema,
  qr: qrConfigSchema,
  createdAt: z.string().datetime(),
  receipt: imageSchema.optional(),
});
export const paymentRequestSchema = z.discriminatedUnion("status", [
  requestBaseSchema.extend({ status: z.literal("pending"), confirmedAt: z.null() }),
  requestBaseSchema.extend({ status: z.literal("paid"), confirmedAt: z.string().datetime() }),
]);
export const paymentStateSchema = z.object({
  config: qrConfigSchema.nullable(),
  requests: z.array(paymentRequestSchema),
});
export type QrConfig = z.infer<typeof qrConfigSchema>;
export type RequestInput = z.infer<typeof requestInputSchema>;
export type PaymentRequest = z.infer<typeof paymentRequestSchema>;
export type PaymentState = z.infer<typeof paymentStateSchema>;
export const emptyPaymentState: PaymentState = { config: null, requests: [] };

export function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function readPaymentState(raw: string | null): PaymentState {
  if (raw === null) return emptyPaymentState;
  try {
    const result = paymentStateSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : emptyPaymentState;
  } catch {
    return emptyPaymentState;
  }
}

export function buildPaymentRequest(
  input: RequestInput,
  product: Product,
  qr: QrConfig | null,
  id: string,
  createdAt: string,
  source: "admin" | "customer",
): PaymentRequest {
  const validatedProduct = productSchema.parse(product);
  if (source === "customer" && !validatedProduct.published)
    throw new Error("Este producto no está disponible.");
  const details = requestInputSchema.parse(input);
  // A customer pays the displayed product price, never a browser-supplied alternative.
  if (source === "customer" && details.amount !== validatedProduct.price)
    throw new Error("El importe debe coincidir con el precio del producto.");
  return paymentRequestSchema.parse({
    ...details,
    id,
    productId: validatedProduct.id,
    productName: validatedProduct.name,
    productImage: validatedProduct.images[0],
    qr: qrConfigSchema.parse(qr),
    createdAt,
    status: "pending",
    confirmedAt: null,
  });
}

export function attachReceipt(request: PaymentRequest, image: string): PaymentRequest {
  if (request.status === "paid") throw new Error("Este pago ya fue confirmado.");
  // A receipt is not evidence of bank settlement; only the administrator confirms it.
  return paymentRequestSchema.parse({ ...request, receipt: imageSchema.parse(image) });
}

export function confirmPayment(
  request: PaymentRequest,
  bankVerified: boolean,
  confirmedAt: string,
): PaymentRequest {
  if (request.status === "paid") return request;
  if (!bankVerified) throw new Error("Confirma que verificaste el ingreso en tu banco.");
  return paymentRequestSchema.parse({ ...request, status: "paid", confirmedAt });
}
