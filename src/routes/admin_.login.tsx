import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/login-page";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Acceso · Casa Luma | Catálogo Digital" },
      { name: "description", content: "Acceso de administración de Casa Luma." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});
