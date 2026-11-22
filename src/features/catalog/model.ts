import { z } from "zod";

export const categories = ["Cerámica", "Decoración", "Accesorios"] as const;
export const imageSchema = z
  .string()
  .refine(
    (value) =>
      /^\/__l5e\/assets-v1\/[a-zA-Z0-9/-]+\.(webp|png|jpg|jpeg)$/.test(value) ||
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
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
export const productSchema = productInputSchema.extend({ id: z.string().min(1).max(100) });
export const storedProductsSchema = z.array(productSchema);
export type ProductInput = z.infer<typeof productInputSchema>;
export type Product = z.infer<typeof productSchema>;
export const STORAGE_KEY = "casa-luma-products-v1";

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

export function readStoredProducts(raw: string | null, fallback: Product[]): Product[] {
  if (raw === null) return fallback;
  try {
    const result = storedProductsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}
