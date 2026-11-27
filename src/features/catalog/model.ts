import { z } from "zod";

export const categories = ["Cerámica", "Decoración", "Accesorios"] as const;
// Accepted image sources: managed assets, local data URIs (previews before upload) and
// https Supabase Storage URLs with the exact bucket/uuid/file layout used by this app.
const REMOTE_IMAGE =
  /^https:\/\/[A-Za-z0-9.-]+(:\d+)?\/storage\/v1\/object\/(public|sign)\/(product-images|payment-qr|payment-receipts)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+\.(webp|png|jpg|jpeg)(\?token=[A-Za-z0-9._-]+)?$/;
export const imageSchema = z
  .string()
  .refine(
    (value) =>
      /^\/__l5e\/assets-v1\/[a-zA-Z0-9/-]+\.(webp|png|jpg|jpeg)$/.test(value) ||
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ||
      REMOTE_IMAGE.test(value),
    "Selecciona una fotografía válida.",
  );
export const productInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(100, "Usa un máximo de 100 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria.")
    .max(1500, "Usa un máximo de 1500 caracteres."),
  price: z
    .number({ invalid_type_error: "Ingresa un precio válido." })
    .finite()
    .min(0, "El precio no puede ser negativo."),
  category: z.enum(categories, { errorMap: () => ({ message: "Selecciona una categoría." }) }),
  images: z
    .array(imageSchema)
    .min(1, "Agrega al menos una fotografía.")
    .max(3, "Puedes agregar hasta 3 fotografías."),
  published: z.boolean(),
});
export const productSchema = productInputSchema.extend({
  id: z.string().min(1).max(100),
  // Readable URL id (products.slug). Optional: new products may not have one.
  slug: z.string().max(100).nullish(),
});
export type ProductInput = z.infer<typeof productInputSchema>;
export type Product = z.infer<typeof productSchema>;

/** Segment used in public URLs: the readable slug when the product has one, else its id. */
export function productPath(product: Pick<Product, "id" | "slug">) {
  return product.slug || product.id;
}
/** Matches a URL segment against a product by slug or id. */
export function matchesProductPath(product: Pick<Product, "id" | "slug">, segment: string) {
  return product.id === segment || product.slug === segment;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function filterProducts(
  products: Product[],
  query = "",
  category = "Todos",
  publicOnly = true,
) {
  const term = normalize(query.trim().slice(0, 100));
  return products.filter(
    (product) =>
      (!publicOnly || product.published) &&
      (category === "Todos" || product.category === category) &&
      normalize(product.name).includes(term),
  );
}

export function formatPrice(price: number) {
  return "Bs " + new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
}
