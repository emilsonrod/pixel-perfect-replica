import { createFileRoute } from "@tanstack/react-router";
import { CustomerPaymentPage } from "@/features/payments/customer-payment-page";

export const Route = createFileRoute("/pago/$requestId")({
  head: () => ({
    meta: [
      { title: "Paga tu pedido · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Consulta el QR y el estado de tu solicitud de pago de Casa Luma.",
      },
      { property: "og:title", content: "Paga tu pedido · Casa Luma" },
      {
        property: "og:description",
        content: "Pago directo al negocio con QR y confirmación manual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomerRequestPage,
});
function CustomerRequestPage() {
  const { requestId } = Route.useParams();
  return <CustomerPaymentPage key={requestId} requestId={requestId} />;
}
