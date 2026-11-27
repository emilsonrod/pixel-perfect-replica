import { imageSchema } from "@/features/catalog/model";

/**
 * Validates that a string is an accepted image source (managed asset, image data URI or
 * https Supabase Storage URL) before it is used as an href or src attribute.
 *
 * Defense-in-depth against protocol-based XSS (e.g. javascript:, data:text/html): the schema
 * already enforces this when data is parsed, but an explicit check at render time keeps the
 * invariant even if a value somehow bypasses validation (SEC-07).
 *
 * Returns the original string when it is valid, undefined otherwise.
 */
export function safeImageDataUri(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return imageSchema.safeParse(value).success ? value : undefined;
}
