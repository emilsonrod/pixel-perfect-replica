import { createFileRoute } from "@tanstack/react-router";
import { PaymentRequestForm } from "@/features/payments/payment-request-form";

export const Route = createFileRoute("/producto/$productId_/pagar")({
  head: () => ({
    meta: [
      { title: "Preparar pago con QR · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Prepara el pago de tu pieza de Casa Luma con el QR del negocio.",
      },
      { property: "og:title", content: "Preparar pago · Casa Luma" },
      { property: "og:description", content: "Tu pedido en Casa Luma con pago directo por QR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StartCustomerPaymentPage,
});
function StartCustomerPaymentPage() {
  const { productId } = Route.useParams();
  return <PaymentRequestForm key={productId} productId={productId} />;
}
