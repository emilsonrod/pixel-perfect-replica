import { describe, expect, it } from "vitest";
import {
  filterProducts,
  formatPrice,
  imageSchema,
  matchesProductPath,
  productInputSchema,
  productPath,
  type Product,
} from "@/features/catalog/model";

const sample: Product = {
  id: "taza",
  name: "Taza de cerámica",
  description: "Cerámica hecha a mano.",
  price: 49,
  category: "Cerámica",
  images: ["/__l5e/assets-v1/example/ceramic-mug.webp"],
  published: true,
};
describe("Product rules", () => {
  it("rejects negative prices", () => {
    expect(productInputSchema.safeParse({ ...sample, price: -0.01 }).success).toBe(false);
  });
  it("accepts a zero price", () => {
    expect(productInputSchema.parse({ ...sample, price: 0 }).price).toBe(0);
  });
  it.each(["name", "description", "category"])("requires %s", (field) => {
    expect(productInputSchema.safeParse({ ...sample, [field]: "" }).success).toBe(false);
  });
  it("requires a photo", () => {
    expect(productInputSchema.safeParse({ ...sample, images: [] }).success).toBe(false);
  });
  it("never shows unpublished products in the public catalog", () => {
    expect(
      filterProducts([sample, { ...sample, id: "hidden", published: false }]).map(
        (item) => item.id,
      ),
    ).toEqual(["taza"]);
  });
  it("includes unpublished products in administration", () => {
    expect(
      filterProducts([{ ...sample, published: false }], "", "Todos", false).map((item) => item.id),
    ).toEqual(["taza"]);
  });
  it("searches names ignoring accents and casing", () => {
    expect(filterProducts([sample], " CERAMICA ").map((item) => item.id)).toEqual(["taza"]);
    expect(filterProducts([sample], "jarrón")).toHaveLength(0);
  });
  it("filters by category", () => {
    expect(
      filterProducts(
        [sample, { ...sample, id: "vase", category: "Decoración" }],
        "",
        "Decoración",
      ).map((item) => item.id),
    ).toEqual(["vase"]);
  });
  it("accepts only known image sources", () => {
    const uuid = "31f6d100-e440-43ee-8f9a-48e645a73246";
    const host = "https://abc.supabase.co/storage/v1/object";
    for (const ok of [
      "/__l5e/assets-v1/example/mug.webp",
      "data:image/webp;base64,aGVsbG8=",
      `${host}/public/product-images/${uuid}/foto.webp`,
      `${host}/sign/payment-receipts/${uuid}/recibo.png?token=abc.def-ghi_jkl`,
    ])
      expect(imageSchema.safeParse(ok).success).toBe(true);
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      `http://abc.supabase.co/storage/v1/object/public/product-images/${uuid}/foto.webp`,
      `${host}/public/other-bucket/${uuid}/foto.webp`,
      `${host}/public/product-images/${uuid}/foto.svg`,
      `https://evil.example/path?u=${host}/public/product-images/${uuid}/foto.webp`,
    ])
      expect(imageSchema.safeParse(bad).success).toBe(false);
  });
  it("uses the slug in public URLs and still resolves by id", () => {
    const withSlug = { ...sample, id: "uuid-1", slug: "taza-de-ceramica" };
    expect(productPath(withSlug)).toBe("taza-de-ceramica");
    expect(productPath({ id: "uuid-2", slug: null })).toBe("uuid-2");
    expect(matchesProductPath(withSlug, "taza-de-ceramica")).toBe(true);
    expect(matchesProductPath(withSlug, "uuid-1")).toBe(true);
    expect(matchesProductPath(withSlug, "otra")).toBe(false);
  });
  it("displays the reference mug price in bolivianos", () => {
    expect(formatPrice(49).replace(/\s/g, " ")).toBe("Bs 49,00");
  });
});
