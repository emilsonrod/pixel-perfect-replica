import type { ReactNode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import { ProductProvider } from "@/features/catalog/product-provider";
import { useProducts, type ProductsContextValue } from "@/features/catalog/product-context";
import type { ProductRepository } from "@/features/catalog/repository";
import { initialProducts } from "@/features/catalog/seed";
import type { Product } from "@/features/catalog/model";

let current: ProductsContextValue | undefined;
function Consumer({ label }: { label: string }) {
  const value = useProducts();
  current = value;
  return <output data-testid={label}>{value.products.length}</output>;
}

const auth = (override: Partial<AuthContextValue> = {}): AuthContextValue => ({
  ready: true,
  configured: true,
  user: { id: "user-1", email: "admin@example.com" },
  isMember: true,
  signIn: async () => null,
  signOut: async () => {},
  ...override,
});
const wrap = (value: AuthContextValue, repository: ProductRepository, children: ReactNode) => (
  <AuthContext.Provider value={value}>
    <ProductProvider repository={repository}>{children}</ProductProvider>
  </AuthContext.Provider>
);

function memoryRepository(seed: Product[] = initialProducts) {
  let items = [...seed];
  let counter = 0;
  const repository: ProductRepository = {
    list: vi.fn(async () => [...items]),
    save: vi.fn(async (input, id) => {
      if (id) items = items.map((item) => (item.id === id ? { ...item, ...input } : item));
      else {
        counter += 1;
        items = [...items, { ...input, id: `new-${counter}` }];
      }
    }),
    remove: vi.fn(async (id) => {
      items = items.filter((item) => item.id !== id);
    }),
    setPublished: vi.fn(async (id, published) => {
      items = items.map((item) => (item.id === id ? { ...item, published } : item));
    }),
  };
  return repository;
}

beforeEach(() => {
  current = undefined;
});
afterEach(cleanup);

describe("Shared product context", () => {
  it("shares one provider with all consumers and keeps updates when a consumer remounts", async () => {
    const repository = memoryRepository();
    const view = render(
      wrap(
        auth(),
        repository,
        <>
          <Consumer label="catalog" />
          <Consumer label="admin" />
        </>,
      ),
    );
    await waitFor(() => expect(current?.ready).toBe(true));
    expect(screen.getByTestId("catalog").textContent).toBe("4");
    const product = initialProducts[0];
    if (!product || !current) throw new Error("Missing test product context.");
    let saved = false;
    await act(async () => {
      saved = (await current?.saveProduct({ ...product, name: "Pieza de regresión" })) ?? false;
    });
    expect(saved).toBe(true);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("catalog").textContent).toBe("5");
    expect(screen.getByTestId("admin").textContent).toBe("5");
    view.rerender(
      wrap(
        auth(),
        repository,
        <>
          <Consumer key="updated" label="updated catalog" />
          <Consumer label="admin" />
        </>,
      ),
    );
    expect(screen.getByTestId("updated catalog").textContent).toBe("5");
  });

  it("does not load before the session is known and loads again when the user changes", async () => {
    const repository = memoryRepository();
    const view = render(wrap(auth({ ready: false, user: null }), repository, <Consumer label="c" />));
    await act(async () => {});
    expect(repository.list).not.toHaveBeenCalled();
    expect(current?.ready).toBe(false);

    view.rerender(wrap(auth({ user: null, isMember: false }), repository, <Consumer label="c" />));
    await waitFor(() => expect(current?.ready).toBe(true));
    expect(repository.list).toHaveBeenCalledTimes(1);

    view.rerender(wrap(auth(), repository, <Consumer label="c" />));
    await waitFor(() => expect(repository.list).toHaveBeenCalledTimes(2));
  });

  it("hydrates an intentionally empty catalog without losing the context", async () => {
    render(wrap(auth(), memoryRepository([]), <Consumer label="catalog" />));
    await waitFor(() => expect(current?.ready).toBe(true));
    expect(screen.getByTestId("catalog").textContent).toBe("0");
    expect(current?.loadError).toBeNull();
  });

  it("reports a load failure without crashing consumers", async () => {
    const repository = memoryRepository();
    repository.list = vi.fn(async () => {
      throw new Error("network down");
    });
    render(wrap(auth(), repository, <Consumer label="catalog" />));
    await waitFor(() => expect(current?.ready).toBe(true));
    expect(screen.getByTestId("catalog").textContent).toBe("0");
    expect(current?.loadError).toMatch(/No se pudo cargar/);
  });

  it("does not claim a save when the database rejects it", async () => {
    const repository = memoryRepository();
    repository.save = vi.fn(async () => {
      throw { code: "42501", message: "permission denied" };
    });
    render(wrap(auth(), repository, <Consumer label="catalog" />));
    await waitFor(() => expect(current?.ready).toBe(true));
    const product = initialProducts[0];
    if (!product || !current) throw new Error("Missing test product context.");
    let saved = true;
    await act(async () => {
      saved = (await current?.saveProduct({ ...product, name: "Otra" })) ?? true;
    });
    expect(saved).toBe(false);
    expect(screen.getByTestId("catalog").textContent).toBe("4");
  });

  it("rejects invalid input before reaching the repository", async () => {
    const repository = memoryRepository();
    render(wrap(auth(), repository, <Consumer label="catalog" />));
    await waitFor(() => expect(current?.ready).toBe(true));
    const product = initialProducts[0];
    if (!product || !current) throw new Error("Missing test product context.");
    let saved = true;
    await act(async () => {
      saved = (await current?.saveProduct({ ...product, price: -1 })) ?? true;
    });
    expect(saved).toBe(false);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("toggles publication and removes products through the repository", async () => {
    const repository = memoryRepository();
    render(wrap(auth(), repository, <Consumer label="catalog" />));
    await waitFor(() => expect(current?.ready).toBe(true));
    const target = initialProducts[0];
    if (!target || !current) throw new Error("Missing test product context.");
    await act(async () => {
      expect(await current?.togglePublication(target.id)).toBe(true);
    });
    expect(repository.setPublished).toHaveBeenCalledWith(target.id, false);
    expect(current?.products.find((item) => item.id === target.id)?.published).toBe(false);
    await act(async () => {
      expect(await current?.removeProduct(target.id)).toBe(true);
    });
    expect(screen.getByTestId("catalog").textContent).toBe("3");
  });
});
