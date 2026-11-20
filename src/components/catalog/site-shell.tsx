import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LayoutGrid, Leaf, SlidersHorizontal } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Casa Luma, inicio">
          <span className="brand-mark shrink-0">L</span>
          <div className="min-w-0">
            <div className="brand-name">Casa Luma</div>
            <div className="brand-caption">Objetos simples, hechos con intención.</div>
          </div>
        </Link>
        <nav className="site-nav shrink-0" aria-label="Navegación principal">
          <Link to="/" activeOptions={{ exact: true }} className="nav-link" aria-label="Catálogo">
            <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
            <span>Catálogo</span>
          </Link>
          <Link to="/admin" className="nav-link" aria-label="Administrar">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            <span>Administrar</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="catalog-footer">
      <div>
        <span className="footer-brand">
          <Leaf className="h-3 w-3" strokeWidth={1.5} /> Casa Luma
        </span>
        <span className="ml-3">Hecho con calma. Para tu día a día.</span>
      </div>
      <span className="flex items-center gap-1">
        Catálogo Digital <ArrowUpRight className="h-3 w-3" />
      </span>
    </footer>
  );
}
