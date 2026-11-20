import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/features/catalog/admin-page";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Tus productos · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Gestiona los productos, fotografías y publicaciones de tu catálogo Casa Luma.",
      },
      { property: "og:title", content: "Tus productos · Casa Luma" },
      { property: "og:description", content: "Administra tu colección Casa Luma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});
