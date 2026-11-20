import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconButton } from "@/components/catalog/icon-button";
import { SearchField } from "@/components/catalog/search-field";
import { EmptyState } from "@/components/catalog/empty-state";
import { SiteFooter } from "@/components/catalog/site-shell";
import { filterProducts, formatPrice, type Product } from "./model";
import { useProducts } from "./product-context";
import { shareProduct } from "./share";

export function AdminPage() {
  const { products, ready, togglePublication, removeProduct } = useProducts();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [deleting, setDeleting] = useState<Product | null>(null);
  const filtered = filterProducts(products, query, "Todos", false).filter(
    (product) =>
      status === "all" || (status === "visible" ? product.published : !product.published),
  );
  const published = products.filter((product) => product.published).length;
  return (
    <main className="admin-container fade-up">
      <div className="admin-heading">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Casa Luma</p>
          <h1 className="page-heading">Tus productos</h1>
        </div>
        <Button asChild className="add-product-button h-11">
          <Link to="/admin/nuevo">
            <Plus />
            Agregar producto
          </Link>
        </Button>
      </div>
      <div className="admin-toolbar">
        <SearchField value={query} onChange={setQuery} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger
            className="h-[42px] bg-card shadow-none"
            aria-label="Estado de publicación"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="visible">Publicados</SelectItem>
            <SelectItem value="hidden">No publicados</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="admin-stats" aria-live="polite">
        <span>
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </span>
        <span>
          {published} {published === 1 ? "publicado" : "publicados"} · {products.length - published}{" "}
          sin publicar
        </span>
      </div>
      {filtered.length ? (
        <div className="admin-list">
          {filtered.map((product) => (
            <article className="admin-product" key={product.id}>
              <img
                className="admin-product-image"
                src={product.images[0]}
                alt={product.name}
                width={88}
                height={88}
              />
              <div className="min-w-0">
                <h2 className="admin-product-name">{product.name}</h2>
                <p className="mt-1 text-xs font-semibold">{formatPrice(product.price)}</p>
                <p className="mt-2 hidden text-[10px] text-muted-foreground sm:block">
                  {product.category}
                </p>
              </div>
              <div className="admin-product-controls">
                <div className="admin-product-actions">
                  <IconButton asChild label={`Editar ${product.name}`}>
                    <Link to="/admin/editar/$productId" params={{ productId: product.id }}>
                      <Pencil strokeWidth={1.5} />
                    </Link>
                  </IconButton>
                  <IconButton
                    label={`Compartir ${product.name}`}
                    disabled={!product.published}
                    onClick={() => shareProduct(product)}
                  >
                    <Share2 strokeWidth={1.5} />
                  </IconButton>
                  <IconButton
                    label={`Eliminar ${product.name}`}
                    disabled={!ready}
                    onClick={() => setDeleting(product)}
                  >
                    <Trash2 strokeWidth={1.5} />
                  </IconButton>
                </div>
                <label className="publication-control">
                  <span>{product.published ? "Publicado" : "Sin publicar"}</span>
                  <Switch
                    checked={product.published}
                    disabled={!ready}
                    aria-label={`Publicar ${product.name}`}
                    onCheckedChange={() => {
                      if (togglePublication(product.id))
                        toast.success(
                          product.published
                            ? "Producto retirado del catálogo."
                            : "Producto publicado.",
                        );
                    }}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={products.length ? "No encontramos productos" : "Tu colección empieza aquí"}
          description={
            products.length
              ? "Prueba con otra búsqueda o cambia el estado."
              : "Agrega tu primera pieza al catálogo."
          }
        >
          {products.length ? (
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Limpiar filtros
            </Button>
          ) : (
            <Button asChild>
              <Link to="/admin/nuevo">
                <Plus />
                Agregar producto
              </Link>
            </Button>
          )}
        </EmptyState>
      )}
      <div className="mt-7 flex justify-end">
        <Button asChild variant="link" className="px-0 text-xs">
          <Link to="/">
            Ver catálogo <ArrowUpRight />
          </Link>
        </Button>
      </div>
      <SiteFooter />
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleting?.name}» se eliminará de tus productos y del catálogo. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting && removeProduct(deleting.id)) {
                  toast.success("Producto eliminado.");
                  setDeleting(null);
                }
              }}
            >
              Eliminar producto
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
