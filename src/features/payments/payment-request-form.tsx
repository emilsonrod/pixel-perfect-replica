import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/features/catalog/product-context";
import { formatPrice } from "@/features/catalog/model";
import { usePayments } from "./payment-context";
import { requestInputSchema } from "./model";
import { LocalPaymentNotice, PaymentHeading, PaymentUnavailable } from "./payment-ui";

export function PaymentRequestForm({ productId }: { productId?: string }) {
  const { products, ready: productsReady } = useProducts();
  const { ready, config, createRequest } = usePayments();
  const navigate = useNavigate();
  const customerFlow = productId !== undefined;
  const options = customerFlow
    ? products.filter((item) => item.published && item.id === productId)
    : products;
  const [selected, setSelected] = useState(productId ?? "");
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const product = options.find((item) => item.id === selected);
  if (!ready || !productsReady) return <PaymentUnavailable loading />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!product) {
      setError("Selecciona un producto.");
      return;
    }
    const parsed = requestInputSchema.safeParse({
      customer,
      amount: customerFlow
        ? product.price
        : amount.trim() === ""
          ? Number.NaN
          : Number(amount.replace(",", ".")),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Completa los datos.");
      return;
    }
    setSubmitting(true);
    const id = createRequest(parsed.data, product, customerFlow ? "customer" : "admin");
    if (id) {
      navigate(
        customerFlow
          ? { to: "/pago/$requestId", params: { requestId: id } }
          : { to: "/admin/pagos/revisar/$requestId", params: { requestId: id } },
      );
    } else {
      setSubmitting(false);
    }
  };
  return (
    <main className="payment-container fade-up">
      <PaymentHeading
        title={customerFlow ? "Pagar con QR" : "Nueva solicitud de pago"}
        back={customerFlow ? "/" : "/admin/pagos"}
      />
      <div className="payment-intro">
        <h2>{customerFlow ? "Tu pedido en Casa Luma." : "Una forma simple de cobrar."}</h2>
        <p>
          {customerFlow
            ? "Pago directo a la cuenta del negocio."
            : "Solicitud para una pieza de tu colección."}
        </p>
      </div>
      {!config ? (
        <div className="payment-unconfigured">
          <QrCode size={42} strokeWidth={1} />
          <h2>El QR de pago no está configurado</h2>
          {customerFlow ? (
            <Button asChild variant="outline">
              <Link to="/">Volver al catálogo</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/admin/pagos/qr">Configurar QR</Link>
            </Button>
          )}
        </div>
      ) : customerFlow && !product ? (
        <p role="alert" className="form-error">
          Este producto no está disponible.
        </p>
      ) : (
        <form onSubmit={submit} className="payment-form" noValidate>
          {!customerFlow && (
            <div>
              <label className="field-label" htmlFor="payment-product">
                Producto
              </label>
              <Select
                value={selected}
                onValueChange={(id) => {
                  setSelected(id);
                  setAmount(String(products.find((item) => item.id === id)?.price ?? ""));
                  setError("");
                }}
              >
                <SelectTrigger id="payment-product">
                  <SelectValue placeholder="Selecciona una pieza" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {product && (
            <div className="payment-product-summary">
              <img src={product.images[0]} alt={product.name} width={48} height={48} />
              <div>
                <h2>{product.name}</h2>
                <p>1 unidad · {formatPrice(product.price)}</p>
              </div>
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="payment-customer">
              {customerFlow ? "Tu nombre" : "Nombre del cliente"}
            </label>
            <Input
              id="payment-customer"
              autoComplete="name"
              maxLength={100}
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
            />
          </div>
          {!customerFlow && (
            <div>
              <label className="field-label" htmlFor="payment-request-amount">
                Importe a solicitar (R$)
              </label>
              <Input
                id="payment-request-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          )}
          <div className="payment-method-row">
            <img src={config.image} alt="QR del negocio" width={38} height={38} />
            <div>
              <strong>{config.recipient}</strong>
              <p>QR de pago del negocio</p>
            </div>
            <QrCode size={18} strokeWidth={1.5} />
          </div>
          <div className="payment-warning">
            <strong>El importe se ingresa en la aplicación de tu banco.</strong>
            <p>
              El QR no ajusta automáticamente el monto. Comprueba el destinatario antes de pagar.
            </p>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={submitting || !options.length}
            className="payment-wide-button"
          >
            <ArrowRight />
            {customerFlow ? "Ver QR para pagar" : "Crear solicitud de pago"}
          </Button>
        </form>
      )}
      <LocalPaymentNotice />
    </main>
  );
}
