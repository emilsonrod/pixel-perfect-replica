import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus, QrCode, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "@/components/catalog/admin-tabs";
import { EmptyState } from "@/components/catalog/empty-state";
import { SiteFooter } from "@/components/catalog/site-shell";
import { formatPrice } from "@/features/catalog/model";
import { usePayments } from "./payment-context";
import { LocalPaymentNotice, PaymentStatus } from "./payment-ui";
import { formatPaymentDate } from "./model";

export function AdminPaymentsPage() {
  const { config, requests, ready } = usePayments();
  const [filter, setFilter] = useState("all");
  const visible = requests.filter((item) => filter === "all" || item.status === filter);
  const pending = requests.filter((item) => item.status === "pending").length;
  return (
    <main className="admin-container fade-up">
      <AdminTabs active="payments" />
      <div className="admin-heading">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Casa Luma</p>
          <h1 className="page-heading">Tus pagos</h1>
        </div>
        <Button asChild className="add-product-button h-11">
          <Link to="/admin/pagos/nuevo">
            <Plus />
            Nueva solicitud
          </Link>
        </Button>
      </div>
      <div className="payment-config-band">
        <div className="payment-config-image">
          {config ? (
            <img src={config.image} alt={`QR de ${config.recipient}`} width={64} height={64} />
          ) : (
            <QrCode size={36} strokeWidth={1} />
          )}
        </div>
        <div className="min-w-0">
          <h2>{config ? "QR de pago listo" : "Agrega tu QR de pago"}</h2>
          <p>{config ? config.recipient : "Sin método de pago configurado"}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/pagos/qr">
            <Settings2 />
            <span>{config ? "Editar QR" : "Cargar QR"}</span>
          </Link>
        </Button>
      </div>
      <div className="payment-filter-bar">
        <div className="category-tabs" aria-label="Estado del pago">
          {[
            { id: "all", label: "Todos" },
            { id: "pending", label: "Pendientes" },
            { id: "paid", label: "Confirmados" },
          ].map((item) => (
            <Button
              key={item.id}
              variant="category"
              size="sm"
              data-active={filter === item.id}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <span>
          {pending} {pending === 1 ? "pendiente" : "pendientes"}
        </span>
      </div>
      {!ready ? (
        <p className="py-16 text-sm text-muted-foreground">Cargando pagos…</p>
      ) : visible.length ? (
        <div className="payment-request-list">
          {visible.map((request) => (
            <article key={request.id} className="payment-request-item">
              <img src={request.productImage} alt={request.productName} width={58} height={58} />
              <div className="min-w-0">
                <h2>{request.customer}</h2>
                <p>{request.productName}</p>
                <span className="payment-reference">
                  #{request.id.slice(0, 8)} · {formatPaymentDate(request.createdAt)}
                </span>
              </div>
              <div className="payment-list-amount">
                <strong>{formatPrice(request.amount)}</strong>
                <PaymentStatus request={request} />
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link
                  to="/admin/pagos/revisar/$requestId"
                  params={{ requestId: request.id }}
                  aria-label={`Revisar pago de ${request.customer}`}
                >
                  Revisar
                  <ArrowUpRight />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={requests.length ? "No hay pagos en este estado" : "Tus solicitudes de pago"}
          description={
            requests.length
              ? "Selecciona otro estado para ver tus solicitudes."
              : "Todavía no hay solicitudes de pago."
          }
        >
          {config && !requests.length && (
            <Button asChild variant="outline">
              <Link to="/admin/pagos/nuevo">
                <Plus />
                Nueva solicitud
              </Link>
            </Button>
          )}
        </EmptyState>
      )}
      <LocalPaymentNotice />
      <SiteFooter />
    </main>
  );
}
