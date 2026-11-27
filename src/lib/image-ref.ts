// Pure helpers to move images between the browser (data URIs, public URLs) and
// Supabase Storage (bucket-relative paths). No network and no Supabase client here.

export const BUCKETS = {
  products: "product-images",
  qr: "payment-qr",
  receipts: "payment-receipts",
} as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

const DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export function mimeExtension(mime: string): "webp" | "png" | "jpg" {
  return mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
}

export function parseImageDataUri(value: string): { mime: string; bytes: Uint8Array } | null {
  const match = DATA_URI.exec(value);
  if (!match?.[1] || match[2] === undefined) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { mime: match[1], bytes };
}

/**
 * Returns the bucket-relative path ("<folder-uuid>/<file>") of a public Storage URL for the
 * given bucket, or null when the value is not one.
 */
export function pathFromPublicUrl(bucket: Bucket, value: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = value.indexOf(marker);
  if (!value.startsWith("https://") || at < 0) return null;
  const path = value.slice(at + marker.length);
  return /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+\.(webp|png|jpg|jpeg)$/.test(path) ? path : null;
}

export function isManagedAsset(value: string): boolean {
  return /^\/__l5e\/assets-v1\/[a-zA-Z0-9/-]+\.(webp|png|jpg|jpeg)$/.test(value);
}
