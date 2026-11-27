import { createContext, useContext } from "react";
import type { Product, ProductInput } from "./model";

export type ProductsContextValue = {
  products: Product[];
  /** True once the first load finished, whether it worked or not. */
  ready: boolean;
  /** Message when the catalog could not be loaded; null otherwise. */
  loadError: string | null;
  reload: () => Promise<void>;
  saveProduct: (input: ProductInput, id?: string) => Promise<boolean>;
  removeProduct: (id: string) => Promise<boolean>;
  togglePublication: (id: string) => Promise<boolean>;
};

// The context lives outside the component refresh boundary so an updated consumer
// and an already mounted provider always reference the same context object.
export const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) throw new Error("ProductProvider is required.");
  return context;
}
