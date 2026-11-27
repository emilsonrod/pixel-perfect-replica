import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/catalog/product-card";
import { SearchField } from "@/components/catalog/search-field";
import { EmptyState } from "@/components/catalog/empty-state";
import { SiteFooter } from "@/components/catalog/site-shell";
import { categories, filterProducts } from "./model";
import { useProducts } from "./product-context";

export function CatalogPage() {
  const { products, ready, loadError, reload } = useProducts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  // Members also receive unpublished products; the public catalog only shows published ones.
  const filtered = filterProducts(products, query, category);
  return (
    <main className="site-container fade-up">
      <section className="catalog-intro">
        <div className="min-w-0">
          <p className="eyebrow">Nuestra colección</p>
          <h1 className="catalog-title">
            Pequeñas alegrías
            <br />
            para tu día a día.
          </h1>
          <p className="catalog-subtitle">Piezas sencillas. Hechas para vivir contigo.</p>
        </div>
        <div className="intro-note">
          Objetos cotidianos,
          <br />
          cuidadosamente elegidos.
        </div>
      </section>
      <section aria-label="Productos del catálogo">
        <div className="catalog-toolbar">
          <div className="category-tabs" role="group" aria-label="Filtrar por categoría">
            {["Todos", ...categories].map((item) => (
              <Button
                key={item}
                variant="category"
                size="sm"
                data-active={category === item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item === "Todos" ? "Todos los productos" : item}
              </Button>
            ))}
          </div>
          <SearchField value={query} onChange={setQuery} />
        </div>
        <div className="product-count" aria-live="polite">
          <span>
            {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
          </span>
          <span>Una pieza, muchas historias.</span>
        </div>
        {!ready ? (
          <p className="py-16 text-sm text-muted-foreground">Cargando productos…</p>
        ) : loadError ? (
          <EmptyState title="No pudimos cargar el catálogo" description={loadError}>
            <Button variant="outline" onClick={() => void reload()}>
              Reintentar
            </Button>
          </EmptyState>
        ) : filtered.length ? (
          <div className="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No encontramos productos"
            description={
              query || category !== "Todos"
                ? "Prueba con otro nombre o categoría."
                : "Pronto encontrarás nuevas piezas por aquí."
            }
          >
            {(query || category !== "Todos") && (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory("Todos");
                }}
              >
                Ver todos los productos
              </Button>
            )}
          </EmptyState>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
