import { createFileRoute } from "@tanstack/react-router";
import { AdminPaymentsPage } from "@/features/payments/admin-payments-page";

export const Route = createFileRoute("/admin_/pagos")({
  head: () => ({
    meta: [
      { title: "Tus pagos · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Solicitudes y confirmación manual de pagos con QR de Casa Luma.",
      },
      { property: "og:title", content: "Tus pagos · Casa Luma" },
      {
        property: "og:description",
        content: "Gestiona solicitudes y revisa los ingresos de tu negocio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPaymentsPage,
});
