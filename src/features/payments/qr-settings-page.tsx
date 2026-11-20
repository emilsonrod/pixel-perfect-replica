import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePayments } from "./payment-context";
import { prepareQrImage } from "./images";
import { qrConfigSchema, type QrConfig } from "./model";
import { LocalPaymentNotice, PaymentHeading, PaymentUnavailable, QrPreview } from "./payment-ui";

export function QrSettingsPage() {
  const { ready, config } = usePayments();
  if (!ready) return <PaymentUnavailable loading />;
  return <QrSettingsForm config={config} />;
}
function QrSettingsForm({ config }: { config: QrConfig | null }) {
  const { saveQr } = usePayments();
  const navigate = useNavigate();
  const [image, setImage] = useState(config?.image ?? "");
  const [recipient, setRecipient] = useState(config?.recipient ?? "Casa Luma");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = async (file?: File) => {
    if (!file) return;
    setProcessing(true);
    try {
      setImage(await prepareQrImage(file));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la imagen.");
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (processing) return;
    const parsed = qrConfigSchema.safeParse({ image, recipient });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Completa los datos.");
      return;
    }
    if (saveQr(parsed.data)) {
      toast.success("QR del negocio guardado.");
      navigate({ to: "/admin/pagos" });
    }
  };
  return (
    <main className="payment-container fade-up">
      <PaymentHeading title="QR de pago" />
      <div className="payment-intro">
        <h2>Recibe pagos con tu QR.</h2>
        <p>Imagen QR emitida por tu banco.</p>
      </div>
      <form className="payment-form" onSubmit={submit} noValidate>
        <QrPreview config={image ? { image, recipient } : null} />
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          aria-label="Imagen QR del negocio"
          onChange={(event) => upload(event.target.files?.[0])}
        />
        <Button
          variant="outline"
          className="payment-wide-button"
          type="button"
          disabled={processing}
          onClick={() => fileInput.current?.click()}
        >
          {processing ? <Loader2 className="animate-spin" /> : <Upload />}
          {processing ? "Cargando…" : image ? "Reemplazar imagen QR" : "Cargar imagen QR"}
        </Button>
        <div>
          <label htmlFor="qr-recipient" className="field-label">
            Destinatario según tu banco
          </label>
          <Input
            id="qr-recipient"
            value={recipient}
            maxLength={100}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </div>
        <p className="payment-fineprint">
          JPG, PNG o WebP · Hasta 5 MB · Imagen original, sin recortar. Las solicitudes existentes
          conservan su QR.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button type="submit" className="payment-wide-button" disabled={processing}>
          <Save />
          Guardar QR de pago
        </Button>
      </form>
      <LocalPaymentNotice />
    </main>
  );
}
