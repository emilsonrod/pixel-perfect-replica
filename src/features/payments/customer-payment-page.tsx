import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Loader2, MessageCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { preparePhoto } from "@/features/catalog/images";
import { safeImageDataUri } from "@/lib/safe-image";
import { usePayments } from "./payment-context";
import { usePaymentRequest } from "./use-payment-request";
import { downloadQr, paymentWhatsappUrl } from "./share";
import {
  LocalPaymentNotice,
  PaymentAmount,
  PaymentHeading,
  PaymentReceived,
  PaymentUnavailable,
  QrPreview,
  RequestProduct,
} from "./payment-ui";

export function CustomerPaymentPage({ requestId }: { requestId: string }) {
  const { saveReceipt } = usePayments();
  const { loading, request, reload } = usePaymentRequest(requestId);
  const [processing, setProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  if (loading || !request) return <PaymentUnavailable loading={loading} />;
  // Sanitize before using as href/src — defense-in-depth (SEC-07).
  const safeReceipt = safeImageDataUri(request.receipt);
  const upload = async (file?: File) => {
    if (!file || request.status === "paid") return;
    setProcessing(true);
    try {
      if (await saveReceipt(request.id, await preparePhoto(file))) {
        await reload();
        toast.success("Comprobante guardado. El pago sigue pendiente de confirmación.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el comprobante.");
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  return (
    <main className="payment-container fade-up">
      <PaymentHeading title={request.status === "paid" ? "Pago recibido" : "Casa Luma"} back="/" />
      {request.status === "paid" ? (
        <>
          <PaymentReceived request={request} />
          <div className="payment-intro">
            <h2>Gracias por tu pago.</h2>
            <p>El negocio confirmó manualmente el ingreso.</p>
          </div>
          <Button asChild className="payment-wide-button">
            <Link to="/">Volver al catálogo</Link>
          </Button>
        </>
      ) : (
        <>
          <div className="payment-intro">
            <h2>Paga tu pedido</h2>
            <p>
              Solicitud #{request.id.slice(0, 8)} · {request.customer}
            </p>
          </div>
          <PaymentAmount request={request} />
          <RequestProduct request={request} />
          <QrPreview config={request.qr} />
          <Button
            type="button"
            variant="outline"
            className="payment-wide-button mt-3"
            onClick={() => downloadQr(request.qr.image, request.id)}
          >
            <Download />
            Guardar imagen QR
          </Button>
          <div className="payment-warning">
            <strong>Importe y destinatario</strong>
            <p>
              Usa el QR en tu banco, ingresa el importe de la solicitud y verifica que el
              destinatario sea {request.qr.recipient}. El pago se confirma cuando el negocio revisa
              el ingreso.
            </p>
          </div>
          <div className="payment-receipt-section">
            <div className="payment-section-heading">
              <h2>Comprobante de pago</h2>
              <span>{request.receipt ? "Adjuntado" : "Sin adjuntar"}</span>
            </div>
            {safeReceipt && (
              <a
                href={safeReceipt}
                target="_blank"
                rel="noopener noreferrer"
                className="payment-receipt-preview"
                aria-label="Ver comprobante adjuntado"
              >
                <img src={safeReceipt} alt="Comprobante adjuntado" width={220} height={140} />
              </a>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              aria-label="Imagen del comprobante"
              onChange={(event) => upload(event.target.files?.[0])}
            />
            <Button
              variant="outline"
              type="button"
              className="payment-wide-button"
              disabled={processing}
              onClick={() => fileInput.current?.click()}
            >
              {processing ? <Loader2 className="animate-spin" /> : <Upload />}
              {processing
                ? "Cargando…"
                : safeReceipt
                  ? "Reemplazar comprobante"
                  : "Adjuntar comprobante"}
            </Button>
            <p className="payment-fineprint mt-2">JPG, PNG o WebP · Hasta 5 MB</p>
          </div>
          <Button
            variant="whatsapp"
            className="payment-wide-button mt-5"
            disabled={!request.receipt || processing}
            onClick={() =>
              window.open(paymentWhatsappUrl(request, "receipt"), "_blank", "noopener,noreferrer")
            }
          >
            <MessageCircle />
            Compartir aviso por WhatsApp
          </Button>
          <p className="payment-fineprint mt-2">
            WhatsApp abre un aviso; el comprobante debe adjuntarse también al mensaje. No se envía
            automáticamente.
          </p>
        </>
      )}
      <LocalPaymentNotice />
    </main>
  );
}
