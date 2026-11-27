import { z } from "zod";
import type { Product } from "@/features/catalog/model";
import { getSupabase } from "@/lib/supabase";
import { BUCKETS, pathFromPublicUrl } from "@/lib/image-ref";
import {
  displayImage,
  getBusinessId,
  publicUrl,
  uploadDataUri,
} from "@/lib/supabase-storage";
import {
  paymentRequestSchema,
  qrConfigSchema,
  type PaymentRequest,
  type QrConfig,
  type RequestInput,
} from "./model";

/** Where payment data lives. The provider only talks to this interface. */
export type PaymentRepository = {
  /** Active QR of the business. Members only. */
  loadConfig(): Promise<QrConfig | null>;
  /** All requests of the business, newest first. Members only. */
  listRequests(): Promise<PaymentRequest[]>;
  /** One request by id: how a customer (no account) reads their own payment. */
  getRequest(id: string): Promise<PaymentRequest | null>;
  saveQr(config: QrConfig): Promise<void>;
  /** The database decides the amount and the source; it returns the new request id. */
  createRequest(input: RequestInput, product: Product): Promise<string>;
  attachReceipt(id: string, image: string): Promise<void>;
  confirmRequest(id: string, bankVerified: boolean): Promise<void>;
};

const MAX_REQUESTS = 1000;
const RECEIPT_URL_SECONDS = 60 * 60;

const iso = (value: string) => new Date(value).toISOString();

const listRowSchema = z.object({
  id: z.string(),
  product_id: z.string().nullable(),
  product_name: z.string(),
  product_image_ref: z.string(),
  customer_name: z.string(),
  amount: z.number(),
  qr_config_id: z.string(),
  status: z.enum(["pending", "paid"]),
  receipt_path: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  created_at: z.string(),
});
const qrRowSchema = z.object({ id: z.string(), image_path: z.string(), recipient: z.string() });
const detailRowSchema = z.object({
  id: z.string(),
  customer_name: z.string(),
  product_name: z.string(),
  product_image_ref: z.string(),
  amount: z.number(),
  status: z.enum(["pending", "paid"]),
  created_at: z.string(),
  confirmed_at: z.string().nullable(),
  receipt_path: z.string().nullable(),
  qr_image_path: z.string(),
  qr_recipient: z.string(),
});

async function signedReceipt(path: string | null): Promise<string | undefined> {
  if (!path) return undefined;
  const { data, error } = await getSupabase()
    .storage.from(BUCKETS.receipts)
    .createSignedUrl(path, RECEIPT_URL_SECONDS);
  return error || !data ? undefined : data.signedUrl;
}

type RequestParts = {
  id: string;
  productId: string | null;
  productName: string;
  productImageRef: string;
  customer: string;
  amount: number;
  status: "pending" | "paid";
  createdAt: string;
  confirmedAt: string | null;
  receipt: string | undefined;
  qr: { image: string; recipient: string };
};

function toPaymentRequest(parts: RequestParts): PaymentRequest | null {
  const base = {
    id: parts.id,
    productId: parts.productId,
    productName: parts.productName,
    productImage: displayImage(BUCKETS.products, parts.productImageRef),
    customer: parts.customer,
    amount: parts.amount,
    qr: parts.qr,
    createdAt: iso(parts.createdAt),
    ...(parts.receipt ? { receipt: parts.receipt } : {}),
  };
  const result = paymentRequestSchema.safeParse(
    parts.status === "paid" && parts.confirmedAt
      ? { ...base, status: "paid", confirmedAt: iso(parts.confirmedAt) }
      : { ...base, status: "pending", confirmedAt: null },
  );
  return result.success ? result.data : null;
}

export function createSupabasePaymentRepository(): PaymentRepository {
  return {
    async loadConfig() {
      const businessId = await getBusinessId();
      const { data, error } = await getSupabase()
        .from("payment_qr_configs")
        .select("id,image_path,recipient")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      const row = qrRowSchema.safeParse(data);
      if (!row.success) return null;
      const config = qrConfigSchema.safeParse({
        image: publicUrl(BUCKETS.qr, row.data.image_path),
        recipient: row.data.recipient,
      });
      return config.success ? config.data : null;
    },

    async listRequests() {
      const businessId = await getBusinessId();
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("payment_requests")
        .select(
          "id,product_id,product_name,product_image_ref,customer_name,amount,qr_config_id,status,receipt_path,confirmed_at,created_at",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(MAX_REQUESTS);
      if (error) throw error;
      const rows = (data ?? []).flatMap((row) => {
        const parsed = listRowSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      });

      // Each request keeps the QR it was created with, so read every QR version it points to.
      const qrIds = [...new Set(rows.map((row) => row.qr_config_id))];
      const qrById = new Map<string, { image: string; recipient: string }>();
      if (qrIds.length) {
        const { data: qrs, error: qrError } = await supabase
          .from("payment_qr_configs")
          .select("id,image_path,recipient")
          .in("id", qrIds);
        if (qrError) throw qrError;
        for (const qr of qrs ?? []) {
          const parsed = qrRowSchema.safeParse(qr);
          if (parsed.success)
            qrById.set(parsed.data.id, {
              image: publicUrl(BUCKETS.qr, parsed.data.image_path),
              recipient: parsed.data.recipient,
            });
        }
      }

      const requests: PaymentRequest[] = [];
      for (const row of rows) {
        const qr = qrById.get(row.qr_config_id);
        if (!qr) continue;
        const request = toPaymentRequest({
          id: row.id,
          productId: row.product_id,
          productName: row.product_name,
          productImageRef: row.product_image_ref,
          customer: row.customer_name,
          amount: row.amount,
          status: row.status,
          createdAt: row.created_at,
          confirmedAt: row.confirmed_at,
          receipt: await signedReceipt(row.receipt_path),
          qr,
        });
        if (request) requests.push(request);
      }
      return requests;
    },

    async getRequest(id) {
      if (!z.string().uuid().safeParse(id).success) return null;
      const { data, error } = await getSupabase().rpc("get_payment_request", { p_id: id });
      if (error) throw error;
      const row = detailRowSchema.safeParse(Array.isArray(data) ? data[0] : data);
      if (!row.success) return null;
      return toPaymentRequest({
        id: row.data.id,
        productId: null,
        productName: row.data.product_name,
        productImageRef: row.data.product_image_ref,
        customer: row.data.customer_name,
        amount: row.data.amount,
        status: row.data.status,
        createdAt: row.data.created_at,
        confirmedAt: row.data.confirmed_at,
        receipt: await signedReceipt(row.data.receipt_path),
        qr: {
          image: publicUrl(BUCKETS.qr, row.data.qr_image_path),
          recipient: row.data.qr_recipient,
        },
      });
    },

    async saveQr(config) {
      const businessId = await getBusinessId();
      // Keep the original bytes of a new QR (no resizing or recompression); reuse the file
      // when only the recipient changed.
      const path = config.image.startsWith("data:")
        ? await uploadDataUri(BUCKETS.qr, businessId, config.image)
        : pathFromPublicUrl(BUCKETS.qr, config.image);
      if (!path) throw new Error("Imagen QR no válida.");
      const { error } = await getSupabase().rpc("set_qr_config", {
        p_business: businessId,
        p_image_path: path,
        p_recipient: config.recipient,
      });
      if (error) throw error;
    },

    async createRequest(input, product) {
      const { data, error } = await getSupabase().rpc("create_payment_request", {
        p_product_id: product.id,
        p_customer: input.customer,
        p_amount: input.amount,
      });
      if (error) throw error;
      const id = z.string().uuid().safeParse(data);
      if (!id.success) throw new Error("Respuesta no válida del servidor.");
      return id.data;
    },

    async attachReceipt(id, image) {
      const path = await uploadDataUri(BUCKETS.receipts, id, image);
      const { error } = await getSupabase().rpc("attach_receipt", { p_id: id, p_path: path });
      if (error) throw error;
    },

    async confirmRequest(id, bankVerified) {
      const { error } = await getSupabase().rpc("confirm_payment_request", {
        p_id: id,
        p_bank_verified: bankVerified,
      });
      if (error) throw error;
    },
  };
}
