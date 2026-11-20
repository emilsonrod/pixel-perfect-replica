import { createContext, useContext } from "react";
import type { Product, ProductInput } from "./model";

export type ProductsContextValue = {
  products: Product[];
  ready: boolean;
  saveProduct: (input: ProductInput, id?: string) => boolean;
  removeProduct: (id: string) => boolean;
  togglePublication: (id: string) => boolean;
};

// The context lives outside the component refresh boundary so an updated consumer
// and an already mounted provider always reference the same context object.
export const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) throw new Error("ProductProvider is required.");
  return context;
}
