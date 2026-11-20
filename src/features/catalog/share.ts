import { toast } from "sonner";
import { productSchema, type Product } from "./model";

export function productUrl(id: string) {
  return `${window.location.origin}/producto/${encodeURIComponent(id)}`;
}

export async function shareProduct(product: Product) {
  const validated = productSchema.safeParse(product);
  if (!validated.success) return;
  const url = productUrl(validated.data.id);
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${validated.data.name} · Casa Luma`,
        text: validated.data.name,
        url,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Enlace del producto copiado.");
  } catch {
    toast.error("No se pudo copiar el enlace. Puedes copiarlo desde la barra de direcciones.");
  }
}

export function whatsappUrl(product: Product) {
  const validated = productSchema.parse(product);
  const message = `Mira ${validated.name} de Casa Luma: ${productUrl(validated.id)}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
