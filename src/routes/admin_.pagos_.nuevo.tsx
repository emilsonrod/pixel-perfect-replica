import { createFileRoute } from "@tanstack/react-router";
import { PaymentRequestForm } from "@/features/payments/payment-request-form";
import { RequireAdmin } from "@/features/auth/require-admin";

export const Route = createFileRoute("/admin_/pagos_/nuevo")({
  head: () => ({
    meta: [
      { title: "Nueva solicitud de pago · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Prepara una solicitud de pago con QR para un producto de Casa Luma.",
      },
      { property: "og:title", content: "Nueva solicitud · Casa Luma" },
      { property: "og:description", content: "Solicitud de pago para una pieza de tu colección." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewRequestPage,
});
function NewRequestPage() {
  return (
    <RequireAdmin>
      <PaymentRequestForm />
    </RequireAdmin>
  );
}
