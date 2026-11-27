import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { BUCKETS, isManagedAsset, pathFromPublicUrl } from "@/lib/image-ref";
import { displayImage, getBusinessId, uploadDataUri } from "@/lib/supabase-storage";
import { productSchema, type Product, type ProductInput } from "./model";

/** Where products live. The provider only talks to this interface. */
export type ProductRepository = {
  list(): Promise<Product[]>;
  save(input: ProductInput, id?: string): Promise<void>;
  remove(id: string): Promise<void>;
  setPublished(id: string, published: boolean): Promise<void>;
};

const MAX_PRODUCTS = 500;

const rowSchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  published: z.boolean(),
  category_name: z.string(),
  images: z.array(z.string()),
});

export function createSupabaseProductRepository(): ProductRepository {
  let categoryIds: Promise<Map<string, string>> | undefined;
  const categories = () => {
    categoryIds ??= (async () => {
      const businessId = await getBusinessId();
      const { data, error } = await getSupabase()
        .from("categories")
        .select("id,name")
        .eq("business_id", businessId);
      if (error) throw error;
      return new Map((data as { id: string; name: string }[]).map((row) => [row.name, row.id]));
    })().catch((error: unknown) => {
      categoryIds = undefined;
      throw error;
    });
    return categoryIds;
  };

  // Photos picked in the form are data URIs: upload them and keep only the Storage path.
  const toStoredRef = async (businessId: string, image: string) => {
    if (image.startsWith("data:")) return uploadDataUri(BUCKETS.products, businessId, image);
    if (isManagedAsset(image)) return image;
    const path = pathFromPublicUrl(BUCKETS.products, image);
    if (!path) throw new Error("Fotografía no válida.");
    return path;
  };

  return {
    async list() {
      const businessId = await getBusinessId();
      const { data, error } = await getSupabase()
        .from("catalog_products")
        .select("id,slug,name,description,price,published,category_name,images")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true })
        .limit(MAX_PRODUCTS);
      if (error) throw error;
      const products: Product[] = [];
      for (const row of data ?? []) {
        const parsed = rowSchema.safeParse(row);
        if (!parsed.success) continue;
        const item = productSchema.safeParse({
          id: parsed.data.id,
          slug: parsed.data.slug,
          name: parsed.data.name,
          description: parsed.data.description,
          price: parsed.data.price,
          published: parsed.data.published,
          category: parsed.data.category_name,
          images: parsed.data.images.map((ref) => displayImage(BUCKETS.products, ref)),
        });
        // A row that does not satisfy the product rules is skipped instead of breaking the page.
        if (item.success) products.push(item.data);
      }
      return products;
    },

    async save(input, id) {
      const businessId = await getBusinessId();
      const categoryId = (await categories()).get(input.category);
      if (!categoryId) throw new Error("La categoría no existe en la base de datos.");
      const images = await Promise.all(input.images.map((image) => toStoredRef(businessId, image)));
      const { error } = await getSupabase().rpc("save_product", {
        p_business: businessId,
        p_id: id ?? null,
        p_name: input.name,
        p_description: input.description,
        p_price: input.price,
        p_category: categoryId,
        p_published: input.published,
        p_images: images,
      });
      if (error) throw error;
    },

    async remove(id) {
      const { error } = await getSupabase().from("products").delete().eq("id", id);
      if (error) throw error;
    },

    async setPublished(id, published) {
      const { error } = await getSupabase().from("products").update({ published }).eq("id", id);
      if (error) throw error;
    },
  };
}
