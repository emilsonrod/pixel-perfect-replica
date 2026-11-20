import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/features/catalog/catalog-page";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Casa Luma · Catálogo Digital" },
      {
        name: "description",
        content:
          "Pequeñas alegrías para tu día a día. Descubre la colección de cerámica, decoración y accesorios de Casa Luma.",
      },
      { property: "og:title", content: "Casa Luma · Nuestra colección" },
      {
        property: "og:description",
        content: "Piezas sencillas. Hechas para vivir contigo. Explora el catálogo de Casa Luma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CatalogPage,
});
