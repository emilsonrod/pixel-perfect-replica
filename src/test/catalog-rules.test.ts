import { describe, expect, it } from "vitest";
import {
  filterProducts,
  formatPrice,
  productInputSchema,
  readStoredProducts,
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
  it("preserves an intentionally emptied local catalog", () => {
    expect(readStoredProducts("[]", [sample])).toEqual([]);
  });
  it("rejects corrupted or invalid storage instead of accepting negative prices", () => {
    expect(readStoredProducts("broken json", [sample])).toEqual([sample]);
    expect(readStoredProducts(JSON.stringify([{ ...sample, price: -5 }]), [sample])).toEqual([
      sample,
    ]);
  });
  it("displays the reference mug price in bolivianos", () => {
    expect(formatPrice(49).replace(/\s/g, " ")).toBe("Bs 49,00");
  });
});
