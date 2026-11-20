import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { initialProducts } from "./seed";
import {
  productInputSchema,
  readStoredProducts,
  STORAGE_KEY,
  type Product,
  type ProductInput,
} from "./model";

type ProductsContextValue = {
  products: Product[];
  ready: boolean;
  saveProduct: (input: ProductInput, id?: string) => boolean;
  removeProduct: (id: string) => boolean;
  togglePublication: (id: string) => boolean;
};
const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setProducts(readStoredProducts(localStorage.getItem(STORAGE_KEY), initialProducts));
    } catch {
      toast.error(
        "El almacenamiento de este navegador no está disponible. Los cambios no se podrán guardar.",
      );
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY)
        setProducts(readStoredProducts(event.newValue, initialProducts));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const persist = (next: Product[]) => {
    if (!ready) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setProducts(next);
      return true;
    } catch {
      toast.error(
        "No se pudo guardar. El almacenamiento puede estar lleno; prueba con fotografías más pequeñas.",
      );
      return false;
    }
  };
  const saveProduct = (input: ProductInput, id?: string) => {
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) return false;
    if (id && !products.some((product) => product.id === id)) {
      toast.error("Este producto ya no existe.");
      return false;
    }
    const product: Product = { ...parsed.data, id: id ?? crypto.randomUUID() };
    const next = id
      ? products.map((current) => (current.id === id ? product : current))
      : [...products, product];
    return persist(next);
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        ready,
        saveProduct,
        removeProduct: (id) => persist(products.filter((product) => product.id !== id)),
        togglePublication: (id) =>
          persist(
            products.map((product) =>
              product.id === id ? { ...product, published: !product.published } : product,
            ),
          ),
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) throw new Error("ProductProvider is required.");
  return context;
}
