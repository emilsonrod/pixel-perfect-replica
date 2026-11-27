import { createFileRoute } from "@tanstack/react-router";
import { ProductFormPage } from "@/features/catalog/product-form";
import { RequireAdmin } from "@/features/auth/require-admin";

export const Route = createFileRoute("/admin_/editar/$productId")({
  head: () => ({
    meta: [
      { title: "Editar producto · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Actualiza los detalles y la publicación de una pieza de Casa Luma.",
      },
      { property: "og:title", content: "Editar producto · Casa Luma" },
      { property: "og:description", content: "Cuida cada detalle de tu colección." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditProductPage,
});
function EditProductPage() {
  const { productId } = Route.useParams();
  return (
    <RequireAdmin>
      <ProductFormPage productId={productId} />
    </RequireAdmin>
  );
}
