import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProductProvider } from "@/features/catalog/product-provider";
import { useProducts, type ProductsContextValue } from "@/features/catalog/product-context";
import { initialProducts } from "@/features/catalog/seed";
import { STORAGE_KEY } from "@/features/catalog/model";

let current: ProductsContextValue | undefined;
function Consumer({ label }: { label: string }) {
  const value = useProducts();
  current = value;
  return <output data-testid={label}>{value.products.length}</output>;
}

beforeEach(() => {
  localStorage.clear();
  current = undefined;
});
afterEach(cleanup);

describe("Shared product context", () => {
  it("shares one provider with all consumers and preserves updates when a consumer remounts", async () => {
    const view = render(
      <ProductProvider>
        <Consumer label="catalog" />
        <Consumer label="admin" />
      </ProductProvider>,
    );
    await waitFor(() => expect(current?.ready).toBe(true));
    const product = initialProducts[0];
    if (!product || !current) throw new Error("Missing test product context.");
    let saved = false;
    act(() => {
      saved = current?.saveProduct({ ...product, name: "Pieza de regresión" }) ?? false;
    });
    expect(saved).toBe(true);
    expect(screen.getByTestId("catalog").textContent).toBe("5");
    expect(screen.getByTestId("admin").textContent).toBe("5");
    view.rerender(
      <ProductProvider>
        <Consumer key="updated" label="updated catalog" />
        <Consumer label="admin" />
      </ProductProvider>,
    );
    expect(screen.getByTestId("updated catalog").textContent).toBe("5");
    expect(screen.getByTestId("admin").textContent).toBe("5");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(5);
  });

  it("hydrates an intentionally empty catalog without losing the context", async () => {
    localStorage.setItem(STORAGE_KEY, "[]");
    render(
      <ProductProvider>
        <Consumer label="catalog" />
      </ProductProvider>,
    );
    await waitFor(() => expect(current?.ready).toBe(true));
    expect(screen.getByTestId("catalog").textContent).toBe("0");
  });

  it("rejects corrupt saved state without crashing consumers", async () => {
    localStorage.setItem(STORAGE_KEY, "invalid json");
    render(
      <ProductProvider>
        <Consumer label="catalog" />
      </ProductProvider>,
    );
    await waitFor(() => expect(current?.ready).toBe(true));
    expect(screen.getByTestId("catalog").textContent).toBe("4");
  });
});
