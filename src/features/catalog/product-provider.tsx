import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { userMessage } from "@/lib/supabase-errors";
import { productInputSchema, type Product, type ProductInput } from "./model";
import { ProductsContext } from "./product-context";
import { createSupabaseProductRepository, type ProductRepository } from "./repository";

const LOAD_ERROR = "No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.";

export function ProductProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Defaults to Supabase; tests pass an in-memory implementation. */
  repository?: ProductRepository;
}) {
  const auth = useAuth();
  const repo = useMemo(() => repository ?? createSupabaseProductRepository(), [repository]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const available = repository !== undefined || isSupabaseConfigured;
  const userId = auth.user?.id ?? null;

  const reload = useCallback(async () => {
    if (!available) {
      setLoadError("Supabase no está configurado.");
      return;
    }
    try {
      setProducts(await repo.list());
      setLoadError(null);
    } catch {
      setLoadError(LOAD_ERROR);
    }
  }, [available, repo]);

  // Load once the session is known, and again when the user signs in or out:
  // members also receive the unpublished products.
  useEffect(() => {
    if (!auth.ready) return;
    let cancelled = false;
    void reload().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [auth.ready, userId, reload]);

  const mutate = useCallback(
    async (action: () => Promise<void>, fallback: string) => {
      if (!ready || !available) return false;
      try {
        await action();
      } catch (error) {
        toast.error(userMessage(error, fallback));
        return false;
      }
      await reload();
      return true;
    },
    [available, ready, reload],
  );

  const value = useMemo(
    () => ({
      products,
      ready,
      loadError,
      reload,
      saveProduct: async (input: ProductInput, id?: string) => {
        if (!productInputSchema.safeParse(input).success) return false;
        if (id && !products.some((product) => product.id === id)) {
          toast.error("Este producto ya no existe.");
          return false;
        }
        return mutate(
          () => repo.save(productInputSchema.parse(input), id),
          "No se pudo guardar el producto. Inténtalo de nuevo.",
        );
      },
      removeProduct: (id: string) =>
        mutate(() => repo.remove(id), "No se pudo eliminar el producto."),
      togglePublication: async (id: string) => {
        const product = products.find((item) => item.id === id);
        if (!product) return false;
        return mutate(
          () => repo.setPublished(id, !product.published),
          "No se pudo cambiar la publicación.",
        );
      },
    }),
    [loadError, mutate, products, ready, reload, repo],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}
