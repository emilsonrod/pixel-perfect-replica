import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconButton } from "@/components/catalog/icon-button";
import { EmptyState } from "@/components/catalog/empty-state";
import { categories, productInputSchema, type Product } from "./model";
import { referencePhotos } from "./seed";
import { preparePhoto } from "./images";
import { useProducts } from "./product-context";

export function ProductFormPage({ productId }: { productId?: string }) {
  const { products, ready } = useProducts();
  if (!ready)
    return (
      <main className="form-container">
        <p className="py-20 text-sm text-muted-foreground">Cargando…</p>
      </main>
    );
  const product = products.find((item) => item.id === productId);
  if (productId && !product)
    return (
      <main className="form-container">
        <EmptyState
          title="No encontramos este producto"
          description="Puede que haya sido eliminado."
        >
          <Button asChild>
            <Link to="/admin">Volver a tus productos</Link>
          </Button>
        </EmptyState>
      </main>
    );
  return <ProductForm key={productId ?? "new"} product={product} />;
}

function ProductForm({ product }: { product: Product | undefined }) {
  const navigate = useNavigate();
  const { saveProduct } = useProducts();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [published, setPublished] = useState(product?.published ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [errors, setErrors] = useState<
    Partial<Record<"name" | "description" | "price" | "category" | "images" | "published", string>>
  >({});
  const [processing, setProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length + images.length > 3) {
      toast.error("Puedes agregar hasta 3 fotografías.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setProcessing(true);
    try {
      const photos = await Promise.all(Array.from(files).map(preparePhoto));
      setImages((current) => [...current, ...photos].slice(0, 3));
      setErrors((current) => ({ ...current, images: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la fotografía.");
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (processing) return;
    const result = productInputSchema.safeParse({
      name,
      description,
      price: price.trim() === "" ? Number.NaN : Number(price.replace(",", ".")),
      category,
      images,
      published,
    });
    if (!result.success) {
      const next: Partial<
        Record<"name" | "description" | "price" | "category" | "images" | "published", string>
      > = {};
      for (const field of [
        "name",
        "description",
        "price",
        "category",
        "images",
        "published",
      ] as const) {
        const issue = result.error.issues.find((item) => item.path[0] === field);
        if (issue) next[field] = issue.message;
      }
      setErrors(next);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setErrors({});
    if (saveProduct(result.data, product?.id)) {
      toast.success(product ? "Producto actualizado." : "Producto creado.");
      navigate({ to: "/admin" });
    }
  };

  return (
    <main className="form-container fade-up">
      <div className="form-heading">
        <IconButton asChild label="Volver a tus productos">
          <Link to="/admin">
            <ArrowLeft strokeWidth={1.5} />
          </Link>
        </IconButton>
        <h1 className="page-heading">{product ? "Editar producto" : "Agregar producto"}</h1>
      </div>
      <form className="product-form" onSubmit={submit} noValidate>
        <section className="min-w-0" aria-label="Fotografías del producto">
          <h2 className="eyebrow">Fotografías</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            La primera fotografía será la portada.
          </p>
          {images.length > 0 && (
            <div className="photo-grid">
              {images.map((image, index) => (
                <div className="photo-preview" key={`${image.slice(-20)}-${index}`}>
                  <img
                    src={image}
                    alt={`Fotografía ${index + 1} del producto`}
                    width={150}
                    height={150}
                  />
                  {index === 0 && <span className="photo-cover-label">Portada</span>}
                  <IconButton
                    label={`Quitar fotografía ${index + 1}`}
                    variant="photo"
                    className="photo-remove h-5 w-5 rounded-full"
                    disabled={processing}
                    onClick={() =>
                      setImages((current) => current.filter((_, item) => item !== index))
                    }
                  >
                    <X className="h-3 w-3" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(event) => addFiles(event.target.files)}
          />
          <Button
            variant="outline"
            type="button"
            className="mt-4 w-full bg-card shadow-none"
            disabled={processing || images.length >= 3}
            onClick={() => fileInput.current?.click()}
            aria-invalid={!!errors.images}
            aria-describedby={errors.images ? "images-error" : undefined}
          >
            {processing ? <Loader2 className="animate-spin" /> : <Plus />}
            {processing ? "Procesando…" : "Agregar fotografías"}
          </Button>
          <p className="mt-2 text-[10px] text-muted-foreground">
            JPG, PNG o WebP · Máximo 5 MB por foto · Hasta 3 fotos
          </p>
          {errors.images && (
            <p id="images-error" className="form-error" role="alert">
              {errors.images}
            </p>
          )}
          <p className="mt-7 text-xs text-muted-foreground">
            O elige una fotografía de la colección
          </p>
          <div className="reference-picker">
            {referencePhotos.map((image) => (
              <Button
                variant="photo"
                type="button"
                key={image.url}
                className="reference-photo"
                aria-label={`Usar fotografía de ${image.name.toLowerCase()}`}
                aria-pressed={images.includes(image.url)}
                disabled={processing || (images.length >= 3 && !images.includes(image.url))}
                onClick={() => {
                  setImages((current) =>
                    current.includes(image.url)
                      ? current.filter((item) => item !== image.url)
                      : [...current, image.url],
                  );
                  setErrors((current) => ({ ...current, images: "" }));
                }}
              >
                <img src={image.url} alt={image.name} width={80} height={80} />
              </Button>
            ))}
          </div>
        </section>
        <div className="form-fields min-w-0">
          <div>
            <label className="field-label" htmlFor="product-name">
              Nombre del producto
            </label>
            <Input
              id="product-name"
              placeholder="Ej. Taza de cerámica"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="form-error" role="alert">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label className="field-label" htmlFor="product-price">
              Precio (R$)
            </label>
            <Input
              id="product-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? "price-error" : undefined}
            />
            {errors.price && (
              <p id="price-error" className="form-error" role="alert">
                {errors.price}
              </p>
            )}
          </div>
          <div>
            <label className="field-label" htmlFor="product-category">
              Categoría
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                id="product-category"
                aria-invalid={!!errors.category}
                aria-describedby={errors.category ? "category-error" : undefined}
              >
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p id="category-error" className="form-error" role="alert">
                {errors.category}
              </p>
            )}
          </div>
          <div>
            <label className="field-label" htmlFor="product-description">
              Descripción
            </label>
            <Textarea
              id="product-description"
              placeholder="Cuenta qué hace especial a esta pieza…"
              maxLength={1500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <p id="description-error" className="form-error" role="alert">
                {errors.description}
              </p>
            )}
          </div>
          <div className="form-publication">
            <label htmlFor="product-published" className="min-w-0">
              <span className="text-xs font-medium">Publicar en el catálogo</span>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {published ? "Visible para tus clientes" : "Solo visible en tus productos"}
              </p>
            </label>
            <Switch id="product-published" checked={published} onCheckedChange={setPublished} />
          </div>
        </div>
        <div className="form-footer">
          <Button asChild variant="outline" className="shadow-none">
            <Link to="/admin">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={processing}>
            <Save strokeWidth={1.5} />
            Guardar producto
          </Button>
        </div>
      </form>
    </main>
  );
}
