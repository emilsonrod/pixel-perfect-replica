import { getSupabase, businessSlug } from "./supabase";
import { BUCKETS, mimeExtension, parseImageDataUri, type Bucket } from "./image-ref";

let businessPromise: Promise<string> | undefined;

/** Id of the business identified by VITE_BUSINESS_SLUG (public read by RLS). Cached. */
export function getBusinessId(): Promise<string> {
  businessPromise ??= (async () => {
    const { data, error } = await getSupabase()
      .from("businesses")
      .select("id")
      .eq("slug", businessSlug)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`No existe un negocio con el slug "${businessSlug}".`);
    return (data as { id: string }).id;
  })().catch((error: unknown) => {
    businessPromise = undefined; // do not cache a failure
    throw error;
  });
  return businessPromise;
}

export function publicUrl(bucket: Bucket, path: string): string {
  return getSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Image shown in the UI for a stored reference: managed assets stay as-is, paths become public URLs. */
export function displayImage(bucket: Bucket, ref: string): string {
  return ref.startsWith("/") ? ref : publicUrl(bucket, ref);
}

/** Uploads an image data URI to `<folder>/<uuid>.<ext>` and returns the stored path. */
export async function uploadDataUri(bucket: Bucket, folder: string, dataUri: string) {
  const parsed = parseImageDataUri(dataUri);
  if (!parsed) throw new Error("La imagen no es válida.");
  const path = `${folder}/${crypto.randomUUID()}.${mimeExtension(parsed.mime)}`;
  const { error } = await getSupabase()
    .storage.from(bucket)
    .upload(path, new Blob([parsed.bytes as BlobPart], { type: parsed.mime }), {
      contentType: parsed.mime,
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export { BUCKETS };
