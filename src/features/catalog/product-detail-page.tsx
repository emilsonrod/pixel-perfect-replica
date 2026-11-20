import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/catalog/icon-button";
import { EmptyState } from "@/components/catalog/empty-state";
import { SiteFooter } from "@/components/catalog/site-shell";
import { useProducts } from "./product-context";
import { formatPrice } from "./model";
import { shareProduct, whatsappUrl } from "./share";

export function ProductDetailPage({ productId }: { productId: string }) {
  const { products, ready } = useProducts();
  const product = products.find((item) => item.id === productId && item.published);
  const [photo, setPhoto] = useState(0);
  if (!ready)
    return (
      <main className="site-container">
        <p className="py-20 text-sm text-muted-foreground">Cargando producto…</p>
      </main>
    );
  if (!product)
    return (
      <main className="site-container">
        <EmptyState
          title="Este producto no está disponible"
          description="Puede que se haya retirado del catálogo o que el enlace haya cambiado."
        >
          <Button asChild>
            <Link to="/">Volver al catálogo</Link>
          </Button>
        </EmptyState>
      </main>
    );
  return (
    <main className="site-container fade-up">
      <Link to="/" className="detail-back">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Volver al catálogo
      </Link>
      <div className="detail-layout">
        <div>
          <img
            className="detail-photo"
            src={product.images[photo] ?? product.images[0]}
            alt={`${product.name}, fotografía ${photo + 1}`}
            width={700}
            height={700}
          />
          {product.images.length > 1 && (
            <div className="detail-gallery-dots">
              {product.images.map((image, index) => (
                <Button
                  key={`${image.slice(-20)}-${index}`}
                  variant="ghost"
                  className="detail-gallery-dot"
                  aria-label={`Ver fotografía ${index + 1}`}
                  aria-pressed={photo === index}
                  onClick={() => setPhoto(index)}
                />
              ))}
            </div>
          )}
        </div>
        <section className="min-w-0">
          <p className="eyebrow">Hecho con intención · {product.category}</p>
          <h1 className="detail-title">{product.name}</h1>
          <div className="detail-price-row">
            <span className="detail-price">{formatPrice(product.price)}</span>
            <span className="availability">Disponible</span>
          </div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-actions">
            <Button
              variant="whatsapp"
              size="lg"
              onClick={() => window.open(whatsappUrl(product), "_blank", "noopener,noreferrer")}
            >
              <MessageCircle strokeWidth={1.5} />
              Compartir por WhatsApp
            </Button>
            <IconButton
              label="Compartir producto"
              variant="outline"
              className="h-10 w-10 bg-card"
              onClick={() => shareProduct(product)}
            >
              <Share2 strokeWidth={1.5} />
            </IconButton>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
