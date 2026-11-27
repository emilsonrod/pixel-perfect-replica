import { describe, expect, it } from "vitest";
import {
  BUCKETS,
  isManagedAsset,
  mimeExtension,
  parseImageDataUri,
  pathFromPublicUrl,
} from "@/lib/image-ref";
import { isPrivilegedKey } from "@/lib/supabase";
import { userMessage } from "@/lib/supabase-errors";

const uuid = "31f6d100-e440-43ee-8f9a-48e645a73246";

describe("Storage image references", () => {
  it("decodes only image data URIs and keeps the original bytes", () => {
    const parsed = parseImageDataUri("data:image/png;base64,aGVsbG8=");
    expect(parsed?.mime).toBe("image/png");
    expect(new TextDecoder().decode(parsed?.bytes)).toBe("hello");
    expect(parseImageDataUri("data:text/html;base64,aGVsbG8=")).toBeNull();
    expect(parseImageDataUri("not a data uri")).toBeNull();
  });

  it("maps mime types to file extensions", () => {
    expect(mimeExtension("image/png")).toBe("png");
    expect(mimeExtension("image/jpeg")).toBe("jpg");
    expect(mimeExtension("image/webp")).toBe("webp");
  });

  it("extracts the bucket path only from a public https URL of the right bucket", () => {
    const base = "https://abc.supabase.co/storage/v1/object/public";
    expect(pathFromPublicUrl(BUCKETS.products, `${base}/product-images/${uuid}/a.webp`)).toBe(
      `${uuid}/a.webp`,
    );
    expect(pathFromPublicUrl(BUCKETS.qr, `${base}/product-images/${uuid}/a.webp`)).toBeNull();
    expect(
      pathFromPublicUrl(BUCKETS.products, `http://abc.supabase.co/storage/v1/object/public/product-images/${uuid}/a.webp`),
    ).toBeNull();
    expect(pathFromPublicUrl(BUCKETS.products, `${base}/product-images/../etc/a.webp`)).toBeNull();
  });

  it("recognizes managed assets", () => {
    expect(isManagedAsset("/__l5e/assets-v1/x/y.webp")).toBe(true);
    expect(isManagedAsset("https://evil.example/a.webp")).toBe(false);
  });
});

describe("Supabase client safety", () => {
  const jwt = (role: string) =>
    `x.${btoa(JSON.stringify({ role })).replace(/=+$/, "")}.y`;

  it("refuses privileged keys in the browser", () => {
    expect(isPrivilegedKey(jwt("service_role"))).toBe(true);
    expect(isPrivilegedKey("sb_secret_abc")).toBe(true);
    expect(isPrivilegedKey(jwt("anon"))).toBe(false);
    expect(isPrivilegedKey("sb_publishable_abc")).toBe(false);
  });

  it("shows database messages meant for users and hides internal errors", () => {
    expect(userMessage({ code: "P0001", message: "Este producto no está disponible." }, "x")).toBe(
      "Este producto no está disponible.",
    );
    expect(userMessage({ code: "42501", message: "permission denied for table x" }, "x")).toBe(
      "No tienes permiso para realizar esta acción.",
    );
    expect(userMessage({ code: "XX000", message: "relation public.secret does not exist" }, "Falló")).toBe(
      "Falló",
    );
    expect(userMessage(new Error("boom"), "Falló")).toBe("Falló");
  });
});
