import { toast } from "sonner";
import { formatPrice } from "@/features/catalog/model";
import type { PaymentRequest } from "./model";

export function paymentUrl(id: string) {
  return `${window.location.origin}/pago/${encodeURIComponent(id)}`;
}
export async function copyPaymentLink(id: string) {
  try {
    await navigator.clipboard.writeText(paymentUrl(id));
    toast.success("Enlace de pago copiado. Solo disponible en este navegador de demostración.");
  } catch {
    toast.error("No se pudo copiar el enlace.");
  }
}
export function paymentWhatsappUrl(
  request: PaymentRequest,
  kind: "request" | "receipt" | "confirmation",
) {
  const text =
    kind === "confirmation"
      ? `Casa Luma: pago de ${formatPrice(request.amount)} confirmado manualmente para ${request.productName}.`
      : kind === "receipt"
        ? `Adjunté el comprobante de ${formatPrice(request.amount)} para ${request.productName}. Pendiente de confirmación.`
        : `Casa Luma: solicitud de ${formatPrice(request.amount)} para ${request.productName}, a nombre de ${request.customer}.`;
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${paymentUrl(request.id)}\nDemostración local: el enlace no está disponible en otros dispositivos.`)}`;
}

export async function downloadQr(image: string, id: string) {
  try {
    const response = await fetch(image);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qr-casa-luma-${id}.${blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp"}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Imagen QR guardada.");
  } catch {
    toast.error("No se pudo guardar la imagen QR.");
  }
}
