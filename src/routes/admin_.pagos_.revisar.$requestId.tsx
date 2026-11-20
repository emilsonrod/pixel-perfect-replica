import { createFileRoute } from "@tanstack/react-router";
import { ReviewPaymentPage } from "@/features/payments/review-payment-page";

export const Route = createFileRoute("/admin_/pagos_/revisar/$requestId")({
  head: () => ({
    meta: [
      { title: "Revisar pago · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Revisa un comprobante y confirma manualmente un ingreso de Casa Luma.",
      },
      { property: "og:title", content: "Revisar pago · Casa Luma" },
      { property: "og:description", content: "Revisión y confirmación manual del pago recibido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReviewRequestPage,
});
function ReviewRequestPage() {
  const { requestId } = Route.useParams();
  return <ReviewPaymentPage key={requestId} requestId={requestId} />;
}
