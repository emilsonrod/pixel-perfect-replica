import { createFileRoute } from "@tanstack/react-router";
import { ProductFormPage } from "@/features/catalog/product-form";

export const Route = createFileRoute("/admin_/nuevo")({
  head: () => ({
    meta: [
      { title: "Agregar producto · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Agrega una nueva pieza con fotografías, precio y categoría a Casa Luma.",
      },
      { property: "og:title", content: "Agregar producto · Casa Luma" },
      { property: "og:description", content: "Una nueva pieza para tu colección." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewProductPage,
});
function NewProductPage() {
  return <ProductFormPage />;
}
