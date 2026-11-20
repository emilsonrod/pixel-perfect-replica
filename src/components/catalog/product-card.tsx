import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Share2 } from "lucide-react";
import { formatPrice, type Product } from "@/features/catalog/model";
import { shareProduct } from "@/features/catalog/share";
import { IconButton } from "./icon-button";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link
        to="/producto/$productId"
        params={{ productId: product.id }}
        className="product-image-link"
        aria-label={`Ver ${product.name}`}
      >
        <img
          className="product-image"
          src={product.images[0]}
          alt={product.name}
          width={600}
          height={600}
        />
      </Link>
      <div className="product-card-content">
        <p className="product-category">{product.category}</p>
        <h2 className="product-name">
          <Link to="/producto/$productId" params={{ productId: product.id }}>
            {product.name}
          </Link>
        </h2>
        <p className="product-short-description">{product.description.split("\n")[0]}</p>
        <p className="product-card-price">{formatPrice(product.price)}</p>
        <div className="product-card-bottom">
          <Link
            to="/producto/$productId"
            params={{ productId: product.id }}
            className="product-detail-link"
          >
            Ver detalles <ArrowUpRight className="h-3 w-3 shrink-0" />
          </Link>
          <IconButton
            label={`Compartir ${product.name}`}
            className="h-8 w-8 text-muted-foreground"
            onClick={() => shareProduct(product)}
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}
