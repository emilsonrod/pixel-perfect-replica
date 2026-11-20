import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/catalog/empty-state";
import { IconButton } from "@/components/catalog/icon-button";
import { formatPrice } from "@/features/catalog/model";
import { formatPaymentDate, type PaymentRequest, type QrConfig } from "./model";

export function LocalPaymentNotice() {
  return (
    <p className="payment-local-note">
      <ShieldCheck size={14} strokeWidth={1.5} />
      Demostración local · Sin verificación bancaria ni acceso protegido. No uses datos privados.
      Los enlaces solo funcionan en este navegador.
    </p>
  );
}
export function PaymentHeading({
  title,
  back = "/admin/pagos",
}: {
  title: string;
  back?: "/admin/pagos" | "/";
}) {
  return (
    <div className="payment-heading">
      <IconButton asChild label="Volver">
        <Link to={back}>
          <ArrowLeft strokeWidth={1.5} />
        </Link>
      </IconButton>
      <h1>{title}</h1>
    </div>
  );
}
export function PaymentUnavailable({ loading = false }: { loading?: boolean }) {
  if (loading)
    return (
      <main className="payment-container">
        <p className="py-20 text-sm text-muted-foreground">Cargando pago…</p>
      </main>
    );
  return (
    <main className="payment-container">
      <EmptyState
        title="Solicitud no disponible"
        description="Este enlace no existe en este navegador. Las solicitudes de la demostración no se comparten entre dispositivos."
      >
        <Button asChild>
          <Link to="/">Volver al catálogo</Link>
        </Button>
      </EmptyState>
    </main>
  );
}
export function QrPreview({ config }: { config: QrConfig | null }) {
  return (
    <div className="payment-qr-preview">
      <span className="payment-qr-label">
        <QrCode size={12} /> QR del negocio
      </span>
      {config ? (
        <img
          src={config.image}
          alt={`Código QR para pagar a ${config.recipient}`}
          width={260}
          height={260}
        />
      ) : (
        <div className="payment-qr-empty">
          <QrCode size={58} strokeWidth={1} />
          <span>Sin imagen QR</span>
        </div>
      )}
      {config && (
        <p>
          Destinatario: <strong>{config.recipient}</strong>
        </p>
      )}
    </div>
  );
}
export function RequestProduct({ request }: { request: PaymentRequest }) {
  return (
    <div className="payment-product-summary">
      <img src={request.productImage} alt={request.productName} width={48} height={48} />
      <div>
        <h2>{request.productName}</h2>
        <p>1 unidad · Pago con QR</p>
      </div>
    </div>
  );
}
export function PaymentStatus({ request }: { request: PaymentRequest }) {
  return (
    <span className={`payment-status ${request.status === "paid" ? "is-paid" : "is-pending"}`}>
      {request.status === "paid" && <Check size={12} />}
      {request.status === "paid"
        ? "Confirmado manualmente"
        : request.receipt
          ? "Pendiente de revisión"
          : "Esperando pago"}
    </span>
  );
}
export function PaymentAmount({ request }: { request: PaymentRequest }) {
  return (
    <div className="payment-amount-row">
      <strong>{formatPrice(request.amount)}</strong>
      <PaymentStatus request={request} />
    </div>
  );
}
export function PaymentReceived({ request }: { request: PaymentRequest }) {
  return (
    <>
      <div className="payment-received">
        <span className="payment-received-check">
          <Check size={27} strokeWidth={1.5} />
        </span>
        <h2>Pago recibido</h2>
        <strong>{formatPrice(request.amount)}</strong>
      </div>
      <p className="payment-reference">Solicitud #{request.id.slice(0, 8)}</p>
      <dl className="payment-details">
        <div>
          <dt>Cliente</dt>
          <dd>{request.customer}</dd>
        </div>
        <div>
          <dt>Producto</dt>
          <dd>{request.productName}</dd>
        </div>
        <div>
          <dt>Método</dt>
          <dd>Pago con QR</dd>
        </div>
        <div>
          <dt>Confirmación</dt>
          <dd>Manual · {request.confirmedAt ? formatPaymentDate(request.confirmedAt) : "—"}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <PaymentStatus request={request} />
      </div>
    </>
  );
}
