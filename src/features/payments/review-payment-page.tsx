import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Image, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/features/catalog/model";
import { usePayments } from "./payment-context";
import { copyPaymentLink, paymentWhatsappUrl } from "./share";
import {
  LocalPaymentNotice,
  PaymentAmount,
  PaymentHeading,
  PaymentReceived,
  PaymentUnavailable,
  RequestProduct,
} from "./payment-ui";

export function ReviewPaymentPage({ requestId }: { requestId: string }) {
  const { ready, requests, confirmRequest } = usePayments();
  const request = requests.find((item) => item.id === requestId);
  const [verified, setVerified] = useState(false);
  if (!ready || !request) return <PaymentUnavailable loading={!ready} />;
  return (
    <main className="payment-container fade-up">
      <PaymentHeading title={request.status === "paid" ? "Pago recibido" : "Revisar pago"} />
      {request.status === "paid" ? (
        <>
          <PaymentReceived request={request} />
          <div className="payment-intro">
            <h2>Todo listo para continuar.</h2>
            <p>Ingreso marcado como recibido por el administrador.</p>
          </div>
          <Button
            variant="whatsapp"
            className="payment-wide-button"
            onClick={() =>
              window.open(
                paymentWhatsappUrl(request, "confirmation"),
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <MessageCircle />
            Compartir confirmación
          </Button>
        </>
      ) : (
        <>
          <p className="payment-reference mb-2">Solicitud #{request.id.slice(0, 8)}</p>
          <PaymentAmount request={request} />
          <div className="payment-customer-line">
            <span>Cliente</span>
            <strong>{request.customer}</strong>
          </div>
          <RequestProduct request={request} />
          <div className="payment-receipt-row">
            <Image size={19} strokeWidth={1.5} />
            <div>
              <strong>{request.receipt ? "Comprobante recibido" : "Sin comprobante"}</strong>
              <p>
                {request.receipt
                  ? "Adjuntado por el cliente"
                  : "El cliente todavía no adjuntó una imagen"}
              </p>
            </div>
            {request.receipt && (
              <Button asChild variant="link" size="sm">
                <a href={request.receipt} target="_blank" rel="noopener noreferrer">
                  Ver
                  <ExternalLink />
                </a>
              </Button>
            )}
          </div>
          {request.receipt && (
            <a
              href={request.receipt}
              target="_blank"
              rel="noopener noreferrer"
              className="payment-receipt-preview"
              aria-label="Abrir comprobante"
            >
              <img
                src={request.receipt}
                alt="Comprobante recibido del cliente"
                width={280}
                height={150}
              />
            </a>
          )}
          <div className="payment-warning">
            <strong>Revisa tu banco antes de confirmar.</strong>
            <p>
              Un comprobante no garantiza el pago. Confirma únicamente si recibiste{" "}
              {formatPrice(request.amount)} en tu cuenta bancaria. Este registro es manual.
            </p>
          </div>
          <label className="payment-verify" htmlFor="bank-verified">
            <Checkbox
              id="bank-verified"
              checked={verified}
              onCheckedChange={(checked) => setVerified(checked === true)}
            />
            <span>
              Verifiqué el ingreso de {formatPrice(request.amount)} en mi cuenta bancaria.
            </span>
          </label>
          <Button
            className="payment-wide-button"
            disabled={!verified}
            onClick={() => {
              if (confirmRequest(request.id, verified)) {
                toast.success("Pago confirmado manualmente.");
                setVerified(false);
              }
            }}
          >
            <Check />
            Confirmar pago recibido
          </Button>
          <div className="payment-share-tools">
            <Button asChild variant="outline">
              <Link to="/pago/$requestId" params={{ requestId: request.id }}>
                <ExternalLink />
                Ver QR del cliente
              </Link>
            </Button>
            <Button variant="outline" onClick={() => copyPaymentLink(request.id)}>
              <Copy />
              Copiar enlace
            </Button>
          </div>
          <Button
            variant="whatsapp"
            className="payment-wide-button mt-3"
            onClick={() =>
              window.open(paymentWhatsappUrl(request, "request"), "_blank", "noopener,noreferrer")
            }
          >
            <MessageCircle />
            Compartir solicitud
          </Button>
        </>
      )}
      <LocalPaymentNotice />
    </main>
  );
}
