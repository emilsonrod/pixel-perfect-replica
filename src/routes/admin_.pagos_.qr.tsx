import { createFileRoute } from "@tanstack/react-router";
import { QrSettingsPage } from "@/features/payments/qr-settings-page";
import { RequireAdmin } from "@/features/auth/require-admin";

export const Route = createFileRoute("/admin_/pagos_/qr")({
  head: () => ({
    meta: [
      { title: "QR de pago · Casa Luma | Catálogo Digital" },
      {
        name: "description",
        content: "Configura la imagen QR bancaria y el destinatario de Casa Luma.",
      },
      { property: "og:title", content: "QR del negocio · Casa Luma" },
      { property: "og:description", content: "Configuración del QR de pago de Casa Luma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <QrSettingsPage />
    </RequireAdmin>
  ),
});
