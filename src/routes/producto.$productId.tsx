import { createFileRoute } from "@tanstack/react-router";
import { ProductDetailPage } from "@/features/catalog/product-detail-page";
import { initialProducts } from "@/features/catalog/seed";

export const Route = createFileRoute("/producto/$productId")({
  head: ({ params }) => {
    const product = initialProducts.find((item) => item.id === params.productId);
    const name = product?.name ?? "Detalle del producto";
    const description =
      product?.description.split("\n")[0] ??
      "Descubre las piezas de Casa Luma, hechas para tu día a día.";
    return {
      meta: [
        { title: `${name} · Casa Luma | Catálogo Digital` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} · Casa Luma` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DetailPage,
});
function DetailPage() {
  const { productId } = Route.useParams();
  return <ProductDetailPage key={productId} productId={productId} />;
}
